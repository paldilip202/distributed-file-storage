import { useState, useEffect } from 'react';
import { nodeAPI, fileAPI } from '../api';

function formatBytes(bytes) {
  if (!bytes || bytes === '0') return '0 B';
  const b = parseInt(bytes);
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function StorageUsage() {
  const [nodes, setNodes]   = useState([]);
  const [files, setFiles]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [nodesRes, filesRes] = await Promise.all([
          nodeAPI.getNodes(),
          fileAPI.getFiles(),
        ]);
        setNodes(nodesRes.data.data);
        setFiles(filesRes.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
      ⏳ Loading storage data...
    </div>
  );

  const totalCap  = nodes.reduce((s, n) => s + parseInt(n.capacity_bytes || 0), 0);
  const totalUsed = nodes.reduce((s, n) => s + parseInt(n.used_bytes || 0), 0);
  const totalFree = totalCap - totalUsed;
  const usedPct   = totalCap > 0 ? ((totalUsed / totalCap) * 100).toFixed(1) : 0;

  const totalFilesSize = files.reduce((s, f) => s + parseInt(f.size_bytes || 0), 0);
  const totalChunks    = files.reduce((s, f) => s + (f.total_chunks || 0), 0);

  return (
    <div>
      {/* Overview cards */}
      <div className="stats-row" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-label">Total Files</div>
          <div className="stat-value">{files.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🧩</div>
          <div className="stat-label">Total Chunks</div>
          <div className="stat-value">{totalChunks}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-label">Files Size</div>
          <div className="stat-value" style={{ fontSize: 18 }}>
            {formatBytes(totalFilesSize)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔁</div>
          <div className="stat-label">Total Replicas</div>
          <div className="stat-value">{totalChunks * 3}</div>
        </div>
      </div>

      {/* Cluster storage bar */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>
          💾 Cluster Storage Overview
        </h3>

        <div style={{ display: 'flex', gap: 40, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Used</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb' }}>
              {formatBytes(totalUsed)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Free</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>
              {formatBytes(totalFree)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Total</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {formatBytes(totalCap)}
            </div>
          </div>
        </div>

        {/* Big progress bar */}
        <div style={{ background: '#e2e8f0', borderRadius: 999, height: 16, overflow: 'hidden' }}>
          <div style={{
            background: parseFloat(usedPct) > 90 ? '#dc2626' :
                        parseFloat(usedPct) > 70 ? '#d97706' : '#2563eb',
            height: '100%',
            borderRadius: 999,
            width: `${usedPct}%`,
            transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{ textAlign: 'right', fontSize: 12, color: '#64748b', marginTop: 4 }}>
          {usedPct}% used
        </div>
      </div>

      {/* Per node breakdown */}
      <div className="card">
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>
          🖥️ Per Node Breakdown
        </h3>

        {nodes.length === 0 ? (
          <p style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>
            No nodes registered
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Node</th>
                <th>Status</th>
                <th>Used</th>
                <th>Capacity</th>
                <th>Usage</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((node, idx) => {
                const pct = node.capacity_bytes > 0
                  ? ((node.used_bytes / node.capacity_bytes) * 100).toFixed(1)
                  : 0;
                return (
                  <tr key={node.id}>
                    <td style={{ fontWeight: 500 }}>
                      🖥️ Node {idx + 1}
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {node.host}:{node.port}
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${node.status}`}>
                        {node.status}
                      </span>
                    </td>
                    <td>{formatBytes(node.used_bytes)}</td>
                    <td>{formatBytes(node.capacity_bytes)}</td>
                    <td style={{ minWidth: 120 }}>
                      <div style={{ background: '#e2e8f0', borderRadius: 999,
                        height: 6, overflow: 'hidden' }}>
                        <div style={{
                          background: parseFloat(pct) > 90 ? '#dc2626' :
                                      parseFloat(pct) > 70 ? '#d97706' : '#2563eb',
                          height: '100%',
                          borderRadius: 999,
                          width: `${pct}%`,
                        }} />
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {pct}%
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}