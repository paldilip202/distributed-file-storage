import { useState, useEffect } from 'react';
import { nodeAPI } from '../api';
import '../styles/cluster.css';

function formatBytes(bytes) {
  if (!bytes || bytes === '0') return '0 B';
  const b = parseInt(bytes);
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 10)  return 'Just now';
  if (diff < 60)  return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function StorageBar({ used, capacity }) {
  const pct = capacity > 0 ? Math.round((used / capacity) * 100) : 0;
  const cls  = pct > 90 ? 'danger' : pct > 70 ? 'warning' : '';
  return (
    <div className="storage-bar-wrap">
      <div className="storage-bar-label">
        <span>Storage Used</span>
        <span>{pct}%</span>
      </div>
      <div className="storage-bar-bg">
        <div
          className={`storage-bar-fill ${cls}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
        <span>{formatBytes(used)} used</span>
        <span>{formatBytes(capacity)} total</span>
      </div>
    </div>
  );
}

export default function ClusterHealth() {
  const [nodes,   setNodes]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const fetchNodes = async () => {
    try {
      setLoading(true);
      const res = await nodeAPI.getNodes();
      setNodes(res.data.data);
      setError('');
    } catch (err) {
      setError('Failed to load cluster info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
    // Auto refresh every 10 seconds
    const interval = setInterval(fetchNodes, 10000);
    return () => clearInterval(interval);
  }, []);

  const activeCount  = nodes.filter((n) => n.status === 'active').length;
  const deadCount    = nodes.filter((n) => n.status === 'dead').length;
  const totalCap     = nodes.reduce((s, n) => s + parseInt(n.capacity_bytes || 0), 0);
  const totalUsed    = nodes.reduce((s, n) => s + parseInt(n.used_bytes || 0), 0);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
      ⏳ Loading cluster info...
    </div>
  );

  return (
    <div>
      {error && <div className="error-msg">{error}</div>}

      {/* Cluster summary */}
      <div className="stats-row" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon">🖥️</div>
          <div className="stat-label">Total Nodes</div>
          <div className="stat-value">{nodes.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-label">Active Nodes</div>
          <div className="stat-value" style={{ color: '#16a34a' }}>{activeCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💀</div>
          <div className="stat-label">Dead Nodes</div>
          <div className="stat-value" style={{ color: deadCount > 0 ? '#dc2626' : '#64748b' }}>
            {deadCount}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💾</div>
          <div className="stat-label">Cluster Storage</div>
          <div className="stat-value" style={{ fontSize: 18 }}>
            {formatBytes(totalUsed)} / {formatBytes(totalCap)}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="cluster-toolbar">
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Storage Nodes</h3>
        <button className="btn-refresh" onClick={fetchNodes}>
          🔄 Refresh
        </button>
      </div>

      {/* Node cards */}
      {nodes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
          <h3>No storage nodes registered</h3>
          <p>Start storage nodes to see them here</p>
        </div>
      ) : (
        <div className="nodes-grid">
          {nodes.map((node, idx) => (
            <div key={node.id} className={`node-card ${node.status}`}>
              <div className="node-header">
                <div>
                  <div className="node-name">
                    🖥️ Node {idx + 1}
                  </div>
                  <div className="node-address">
                    {node.host}:{node.port}
                  </div>
                </div>
                <span className={`badge badge-${node.status}`}>
                  {node.status}
                </span>
              </div>

              <StorageBar
                used={node.used_bytes}
                capacity={node.capacity_bytes}
              />

              <div className="node-stats">
                <div className="node-stat">
                  <div className="node-stat-label">Capacity</div>
                  <div className="node-stat-value">
                    {formatBytes(node.capacity_bytes)}
                  </div>
                </div>
                <div className="node-stat">
                  <div className="node-stat-label">Used</div>
                  <div className="node-stat-value">
                    {formatBytes(node.used_bytes)}
                  </div>
                </div>
              </div>

              <div className="heartbeat-time">
                💓 Last heartbeat: {timeAgo(node.last_heartbeat_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}