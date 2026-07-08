const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class NodeRepository {
  async upsertNode(host, port, capacityBytes) {
    const result = await pool.query(
      `INSERT INTO storage_nodes (id, host, port, capacity_bytes, status, last_heartbeat_at)
       VALUES ($1, $2, $3, $4, 'active', NOW())
       ON CONFLICT (host, port) DO UPDATE SET
         capacity_bytes    = EXCLUDED.capacity_bytes,
         status            = 'active',
         last_heartbeat_at = NOW()
       RETURNING *`,
      [uuidv4(), host, port, capacityBytes]
    );
    return result.rows[0];
  }

  // ✅ FIX: used_bytes heartbeat se UPDATE NAHI hoga
  // used_bytes sirf incrementUsedBytes/decrementUsedBytes se change hoga
  async updateHeartbeat(nodeId) {
    const result = await pool.query(
      `UPDATE storage_nodes
       SET last_heartbeat_at = NOW(),
           status            = 'active'
       WHERE id = $1
       RETURNING *`,
      [nodeId]
    );
    return result.rows[0];
  }

  async getActiveNodes() {
    const result = await pool.query(
      `SELECT * FROM storage_nodes
       WHERE status = 'active'
       ORDER BY (capacity_bytes - used_bytes) DESC`
    );
    return result.rows;
  }

  async markDeadNodes(thresholdSeconds = 30) {
    const result = await pool.query(
      `UPDATE storage_nodes SET status = 'dead'
       WHERE status = 'active'
         AND last_heartbeat_at < NOW() - INTERVAL '${thresholdSeconds} seconds'
       RETURNING *`
    );
    return result.rows;
  }

  async getAllNodes() {
    const result = await pool.query(
      'SELECT * FROM storage_nodes ORDER BY created_at DESC'
    );
    return result.rows;
  }

  async incrementUsedBytes(nodeId, bytes) {
    await pool.query(
      `UPDATE storage_nodes
       SET used_bytes = used_bytes + $2
       WHERE id = $1`,
      [nodeId, bytes]
    );
  }

  async decrementUsedBytes(nodeId, bytes) {
    await pool.query(
      `UPDATE storage_nodes
       SET used_bytes = GREATEST(0, used_bytes - $2)
       WHERE id = $1`,
      [nodeId, bytes]
    );
  }
}

module.exports = new NodeRepository();