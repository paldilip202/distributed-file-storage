const nodeRepository = require('../repositories/node.repository');
const logger = require('../config/logger');

class NodeService {
  async registerNode(host, port, capacityBytes) {
    const node = await nodeRepository.upsertNode(host, port, capacityBytes);
    logger.info(`Storage node registered: ${host}:${port}`);
    return node;
  }

  // ✅ FIX: usedBytes parameter remove kiya
  async heartbeat(nodeId) {
    const node = await nodeRepository.updateHeartbeat(nodeId);
    if (!node) {
      const err = new Error('Node not found');
      err.status = 404;
      throw err;
    }
    return node;
  }

  async pickNodesForChunk(replicationFactor = 3) {
    const activeNodes = await nodeRepository.getActiveNodes();
    if (activeNodes.length < replicationFactor) {
      const err = new Error(
        `Not enough active nodes. Need ${replicationFactor}, have ${activeNodes.length}`
      );
      err.status = 503;
      throw err;
    }
    return activeNodes.slice(0, replicationFactor);
  }

  async getAllNodes() {
    return nodeRepository.getAllNodes();
  }
}

module.exports = new NodeService();