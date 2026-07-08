const fileRepository = require('../repositories/file.repository');
const nodeService    = require('./node.service');
const nodeRepository = require('../repositories/node.repository');
const logger         = require('../config/logger');

const CHUNK_SIZE_BYTES  = parseInt(process.env.CHUNK_SIZE_BYTES)  || 67108864;
const REPLICATION_FACTOR = parseInt(process.env.REPLICATION_FACTOR) || 3;

class FileService {

  async initiateUpload(ownerId, filename, sizeBytes, mimeType) {
    const totalChunks = Math.ceil(sizeBytes / CHUNK_SIZE_BYTES);
    logger.info(`Initiating upload: ${filename}, ${sizeBytes} bytes, ${totalChunks} chunks`);

    const chunkPlans = [];
    for (let i = 0; i < totalChunks; i++) {
      const isLastChunk = i === totalChunks - 1;
      const chunkSize   = isLastChunk
        ? sizeBytes - i * CHUNK_SIZE_BYTES
        : CHUNK_SIZE_BYTES;

      const nodes = await nodeService.pickNodesForChunk(REPLICATION_FACTOR);
      chunkPlans.push({
        chunkIndex: i,
        sizeBytes : chunkSize,
        nodes     : nodes.map((node, idx) => ({
          nodeId   : node.id,
          host     : node.host,
          port     : node.port,
          isPrimary: idx === 0,
        })),
      });
    }

    const { file, chunks } = await fileRepository.createFileWithChunks(
      {
        ownerId,
        filename,
        sizeBytes,
        chunkSizeBytes: CHUNK_SIZE_BYTES,
        totalChunks,
        mimeType,
      },
      chunkPlans.map((plan) => ({
        chunkIndex: plan.chunkIndex,
        sizeBytes : plan.sizeBytes,
        checksum  : 'pending',
      }))
    );

    const uploadPlan = chunks.map((chunk, idx) => ({
      chunkId   : chunk.id,
      chunkIndex: chunk.chunk_index,
      sizeBytes : chunk.size_bytes,
      nodes     : chunkPlans[idx].nodes,
    }));

    return { file, uploadPlan };
  }

  async confirmUpload(fileId, chunkConfirmations) {
    const replicasData = [];

    // Step 1: Get chunk sizes + mark stored
    for (const confirmation of chunkConfirmations) {
      await fileRepository.markChunkStored(
        confirmation.chunkId,
        confirmation.checksum
      );

      // Get chunk size from DB
      const chunk = await fileRepository.getChunkById(confirmation.chunkId);
      const chunkSize = chunk ? parseInt(chunk.size_bytes) : 0;

      for (const replica of confirmation.replicas) {
        replicasData.push({
          chunkId       : confirmation.chunkId,
          storageNodeId : replica.nodeId,
          isPrimary     : replica.isPrimary,
          chunkSize     : chunkSize,  // ← track size per replica
        });
      }
    }

    // Step 2: Save replica locations
    await fileRepository.saveChunkReplicas(replicasData);

    // Step 3: Update used_bytes for each storage node ← THIS IS THE FIX
    const nodeBytes = {};
    for (const replica of replicasData) {
      if (!nodeBytes[replica.storageNodeId]) {
        nodeBytes[replica.storageNodeId] = 0;
      }
      nodeBytes[replica.storageNodeId] += replica.chunkSize;
    }

    // Update each node's used_bytes in DB
    for (const [nodeId, bytes] of Object.entries(nodeBytes)) {
      await nodeRepository.incrementUsedBytes(nodeId, bytes);
      logger.info(`Updated used_bytes for node ${nodeId}: +${bytes} bytes`);
    }

    // Step 4: Mark file as active
    const file = await fileRepository.markFileActive(fileId);
    logger.info(`Upload confirmed: ${fileId}`);
    return file;
  }

  async getDownloadPlan(fileId, requesterId) {
    const file = await fileRepository.getFileById(fileId);

    if (!file) {
      const err = new Error('File not found');
      err.status = 404;
      throw err;
    }

    if (file.owner_id !== requesterId) {
      const err = new Error('Access denied');
      err.status = 403;
      throw err;
    }

    const rawRows = await fileRepository.getFileChunksWithLocations(fileId);

    const chunksMap = {};
    for (const row of rawRows) {
      if (!chunksMap[row.chunk_index]) {
        chunksMap[row.chunk_index] = {
          chunkId   : row.chunk_id,
          chunkIndex: row.chunk_index,
          sizeBytes : row.size_bytes,
          checksum  : row.checksum,
          replicas  : [],
        };
      }
      chunksMap[row.chunk_index].replicas.push({
        nodeId   : row.node_id,
        host     : row.host,
        port     : row.port,
        isPrimary: row.is_primary,
      });
    }

    const chunks = Object.values(chunksMap)
      .sort((a, b) => a.chunkIndex - b.chunkIndex);

    return { file, chunks };
  }

  async getUserFiles(ownerId) {
    return fileRepository.getFilesByOwner(ownerId);
  }

  async deleteFile(fileId, ownerId) {
    // Step 1: Get replica info BEFORE deleting
    // So we can decrement used_bytes
    const replicas = await fileRepository.getReplicasByFileId(fileId);

    // Step 2: Soft delete the file
    const file = await fileRepository.deleteFile(fileId, ownerId);

    if (!file) {
      const err = new Error('File not found or access denied');
      err.status = 404;
      throw err;
    }

    // Step 3: Decrement used_bytes for each node ← ALSO FIX DELETE
    const nodeBytes = {};
    for (const replica of replicas) {
      if (!nodeBytes[replica.storage_node_id]) {
        nodeBytes[replica.storage_node_id] = 0;
      }
      nodeBytes[replica.storage_node_id] += parseInt(replica.size_bytes || 0);
    }

    for (const [nodeId, bytes] of Object.entries(nodeBytes)) {
      await nodeRepository.decrementUsedBytes(nodeId, bytes);
      logger.info(`Decremented used_bytes for node ${nodeId}: -${bytes} bytes`);
    }

    logger.info(`File soft-deleted: ${fileId}`);
    return file;
  }
}

module.exports = new FileService();