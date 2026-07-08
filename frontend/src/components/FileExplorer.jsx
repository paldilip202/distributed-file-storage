import { useState, useEffect } from 'react';
import { fileAPI } from '../api';
import FileUpload from './FileUpload';
import '../styles/files.css';

function formatBytes(bytes) {
  if (!bytes || bytes === '0') return '0 B';
  const b = parseInt(bytes);
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function getFileIcon(filename) {
  const ext = filename?.split('.').pop()?.toLowerCase();
  const icons = {
    pdf: '📄', jpg: '🖼️', jpeg: '🖼️', png: '🖼️',
    mp4: '🎬', mp3: '🎵', zip: '📦', txt: '📝',
    doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
  };
  return icons[ext] || '📁';
}

export default function FileExplorer() {
  const [files,      setFiles]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [error,      setError]      = useState('');
  const [deleting,   setDeleting]   = useState(null);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await fileAPI.getFiles();
      setFiles(res.data.data);
    } catch (err) {
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFiles(); }, []);

  const handleDelete = async (fileId, filename) => {
    if (!window.confirm(`Delete "${filename}"? This cannot be undone.`)) return;
    setDeleting(fileId);
    try {
      await fileAPI.deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err) {
      setError('Failed to delete file');
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = async (fileId, filename) => {
    try {
      const res = await fileAPI.getDownloadPlan(fileId);
      const { chunks } = res.data.data;
      // Show download plan info
      alert(
        `Download Plan for "${filename}":\n\n` +
        chunks.map((c) =>
          `Chunk ${c.chunkIndex}: ${c.replicas.length} replica(s)\n` +
          c.replicas.map((r) => `  → ${r.host}:${r.port}`).join('\n')
        ).join('\n\n')
      );
    } catch (err) {
      setError('Failed to get download plan');
    }
  };

  const filtered = files.filter((f) =>
    f.filename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="files-toolbar">
        <input
          className="search-input"
          placeholder="🔍 Search files..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="btn-upload"
          onClick={() => setShowUpload(true)}
        >
          ⬆️ Upload File
        </button>
      </div>

      {error && (
        <div className="error-msg" style={{ marginBottom: 16 }}>
          {error}
          <button
            onClick={() => setError('')}
            style={{ float: 'right', background: 'none',
              border: 'none', cursor: 'pointer', color: '#dc2626' }}
          >✕</button>
        </div>
      )}

      <div className="files-table-wrap">
        {loading ? (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <h3>Loading files...</h3>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>{search ? 'No files match your search' : 'No files uploaded yet'}</h3>
            <p>{!search && 'Click "Upload File" to get started'}</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>File Name</th>
                <th>Size</th>
                <th>Chunks</th>
                <th>Status</th>
                <th>Uploaded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((file) => (
                <tr key={file.id}>
                  <td>
                    <div className="file-name">
                      <span className="file-icon">{getFileIcon(file.filename)}</span>
                      {file.filename}
                    </div>
                  </td>
                  <td>{formatBytes(file.size_bytes)}</td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{file.total_chunks}</span>
                    <span style={{ color: '#64748b', fontSize: 12 }}>
                      {' '}× 3 replicas
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${file.status}`}>
                      {file.status}
                    </span>
                  </td>
                  <td style={{ color: '#64748b' }}>
                    {formatDate(file.created_at)}
                  </td>
                  <td>
                    <div className="file-actions">
                      <button
                        className="btn-download"
                        onClick={() => handleDownload(file.id, file.filename)}
                      >
                        ⬇️ Info
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(file.id, file.filename)}
                        disabled={deleting === file.id}
                      >
                        {deleting === file.id ? '...' : '🗑️ Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary */}
      {files.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 13, color: '#64748b' }}>
          {files.length} file(s) •{' '}
          {formatBytes(files.reduce((sum, f) => sum + parseInt(f.size_bytes || 0), 0))} total
        </div>
      )}

      {showUpload && (
        <FileUpload
          onClose={() => setShowUpload(false)}
          onUploadComplete={fetchFiles}
        />
      )}
    </div>
  );
}