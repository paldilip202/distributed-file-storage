const axios = require('axios');
const chunkService = require('../services/chunk.service');
const logger = require('../config/logger');

const METADATA_URL = process.env.METADATA_SERVICE_URL || 'http://localhost:4001';
const NODE_HOST = process.env.NODE_HOST || 'localhost';
const NODE_PORT = parseInt(process.env.NODE_PORT) || 5001;
const CAPACITY_BYTES = parseInt(process.env.CAPACITY_BYTES) || 10737418240;

let nodeId = null;

async function registerNode() {
  try {
    const response = await axios.post(`${METADATA_URL}/api/nodes/register`, {
      host: NODE_HOST, port: NODE_PORT, capacityBytes: CAPACITY_BYTES,
    });
    nodeId = response.data.data.id;
    logger.info({ message: '✅ Node registered', nodeId, host: NODE_HOST, port: NODE_PORT });
  } catch (err) {
    logger.error({ message: 'Registration failed, retrying...', error: err.message });
    setTimeout(registerNode, 5000);
  }
}

async function sendHeartbeat() {
  if (!nodeId) return;
  try {
    const usedBytes = await chunkService.getUsedBytes();
    await axios.post(`${METADATA_URL}/api/nodes/${nodeId}/heartbeat`, { usedBytes });
  } catch (err) {
    logger.error({ message: 'Heartbeat failed', error: err.message });
  }
}

async function startHeartbeatWorker() {
  await registerNode();
  setInterval(sendHeartbeat, 5000);
}

module.exports = { startHeartbeatWorker };