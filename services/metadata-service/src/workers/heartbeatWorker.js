const nodeRepository = require('../repositories/node.repository');
const pool = require('../config/db');
const logger = require('../config/logger');

const HEARTBEAT_THRESHOLD_SECONDS = 30;
const WORKER_INTERVAL_MS = 10000;

async function markLostReplicas(deadNodeIds) {
  if (deadNodeIds.length === 0) return;
  const result = await pool.query(
    `UPDATE chunk_replicas SET status = 'lost'
     WHERE storage_node_id = ANY($1::uuid[]) AND status = 'active'
     RETURNING chunk_id`,
    [deadNodeIds]
  );
  const affected = [...new Set(result.rows.map((r) => r.chunk_id))];
  if (affected.length > 0)
    logger.warn({ message: 'Replicas lost', deadNodes: deadNodeIds, affectedChunks: affected.length });
}

async function runHeartbeatCheck() {
  try {
    const deadNodes = await nodeRepository.markDeadNodes(HEARTBEAT_THRESHOLD_SECONDS);
    if (deadNodes.length > 0) {
      logger.warn(`Dead nodes: ${deadNodes.map((n) => `${n.host}:${n.port}`).join(', ')}`);
      await markLostReplicas(deadNodes.map((n) => n.id));
    }
  } catch (err) {
    logger.error('Heartbeat worker error: ' + err.message);
  }
}

function startHeartbeatWorker() {
  logger.info('Heartbeat worker started');
  setInterval(runHeartbeatCheck, WORKER_INTERVAL_MS);
}

module.exports = { startHeartbeatWorker };