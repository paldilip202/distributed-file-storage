const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class FileRepository {
  async createFileWithChunks(fileData, chunksData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const fileResult = await client.query(
        `INSERT INTO files (id, owner_id, filename, size_bytes, chunk_size_bytes, total_chunks, mime_type, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'uploading') RETURNING *`,
        [uuidv4(), fileData.ownerId, fileData.filename, fileData.sizeBytes,
         fileData.chunkSizeBytes, fileData.totalChunks, fileData.mimeType || null]
      );
      const file = fileResult.rows[0];
      const chunks = [];
      for (const chunkData of chunksData) {
        const chunkResult = await client.query(
          `INSERT INTO chunks (id, file_id, chunk_index, size_bytes, checksum, status)
           VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
          [uuidv4(), file.id, chunkData.chunkIndex, chunkData.sizeBytes, chunkData.checksum]
        );
        chunks.push(chunkResult.rows[0]);
      }
      await client.query('COMMIT');
      return { file, chunks };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async saveChunkReplicas(replicasData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const replica of replicasData) {
        await client.query(
          `INSERT INTO chunk_replicas (id, chunk_id, storage_node_id, is_primary, status)
           VALUES ($1, $2, $3, $4, 'active')`,
          [uuidv4(), replica.chunkId, replica.storageNodeId, replica.isPrimary]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async markFileActive(fileId) {
    const result = await pool.query(
      `UPDATE files SET status = 'active' WHERE id = $1 RETURNING *`,
      [fileId]
    );
    return result.rows[0];
  }

  async markChunkStored(chunkId, checksum) {
    await pool.query(
      `UPDATE chunks SET status = 'stored', checksum = $2 WHERE id = $1`,
      [chunkId, checksum]
    );
  }

  async getFilesByOwner(ownerId) {
    const result = await pool.query(
      `SELECT * FROM files WHERE owner_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`,
      [ownerId]
    );
    return result.rows;
  }

  async getFileById(fileId) {
    const result = await pool.query(
      `SELECT * FROM files WHERE id = $1 AND deleted_at IS NULL`,
      [fileId]
    );
    return result.rows[0];
  }

  async getFileChunksWithLocations(fileId) {
    const result = await pool.query(
      `SELECT c.id AS chunk_id, c.chunk_index, c.size_bytes, c.checksum,
              sn.id AS node_id, sn.host, sn.port, cr.is_primary
       FROM chunks c
       JOIN chunk_replicas cr ON cr.chunk_id = c.id
       JOIN storage_nodes sn ON sn.id = cr.storage_node_id
       WHERE c.file_id = $1 AND cr.status = 'active' AND sn.status = 'active'
       ORDER BY c.chunk_index ASC, cr.is_primary DESC`,
      [fileId]
    );
    return result.rows;
  }

  async deleteFile(fileId, ownerId) {
    const result = await pool.query(
      `UPDATE files SET deleted_at = NOW(), status = 'deleted'
       WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL RETURNING *`,
      [fileId, ownerId]
    );
    return result.rows[0];
  }
  async getChunksByFileId(fileId) {
  const result = await pool.query(
    `SELECT id, size_bytes FROM chunks WHERE file_id = $1`,
    [fileId]
  );
  return result.rows;
}

async getChunkById(chunkId) {
  const result = await pool.query(
    `SELECT id, size_bytes FROM chunks WHERE id = $1`,
    [chunkId]
  );
  return result.rows[0];
}

async getReplicasByFileId(fileId) {
  const result = await pool.query(
    `SELECT cr.storage_node_id, c.size_bytes
     FROM chunk_replicas cr
     JOIN chunks c ON c.id = cr.chunk_id
     WHERE c.file_id = $1 AND cr.status = 'active'`,
    [fileId]
  );
  return result.rows;
 }
}

module.exports = new FileRepository();