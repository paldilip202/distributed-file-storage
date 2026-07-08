import { useState, useRef } from 'react';
import { fileAPI } from '../api';
import '../styles/files.css';

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function FileUpload({ onClose, onUploadComplete }) {
  const [file,     setFile]     = useState(null);
  const [progress, setProgress] = useState(0);
  const [status,   setStatus]   = useState('idle');
  const [message,  setMessage]  = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus('uploading');
    setProgress(10);
    setMessage('Initiating upload...');

    try {
      // Step 1: Tell metadata service about the file
      const initiateRes = await fileAPI.initiateUpload(
        file.name,
        file.size,
        file.type || 'application/octet-stream'
      );

      const { file: fileRecord, uploadPlan } = initiateRes.data.data;
      setProgress(30);
      setMessage(`File split into ${uploadPlan.length} chunk(s). Uploading...`);

      // Step 2: For each chunk, simulate sending to storage nodes
      // In production, you would send actual bytes via gRPC
      // Here we simulate with a checksum
      const chunkConfirmations = [];

      for (let i = 0; i < uploadPlan.length; i++) {
        const chunk = uploadPlan[i];

        // Simulate chunk upload progress
        setProgress(30 + Math.round((i / uploadPlan.length) * 50));
        setMessage(`Uploading chunk ${i + 1} of ${uploadPlan.length}...`);

        // In real implementation: send chunk bytes to storage nodes via gRPC
        // For now: simulate with fake checksum
        const fakeChecksum = Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join('');

        chunkConfirmations.push({
          chunkId  : chunk.chunkId,
          checksum : fakeChecksum,
          replicas : chunk.nodes.map((node) => ({
            nodeId    : node.nodeId,
            isPrimary : node.isPrimary,
          })),
        });

        // Small delay to show progress
        await new Promise((r) => setTimeout(r, 300));
      }

      setProgress(85);
      setMessage('Confirming upload...');

      // Step 3: Confirm upload to metadata service
      await fileAPI.confirmUpload(fileRecord.id, chunkConfirmations);

      setProgress(100);
      setStatus('success');
      setMessage('✅ File uploaded successfully!');

      // Close modal and refresh file list after 1.5s
      setTimeout(() => {
        onUploadComplete();
        onClose();
      }, 1500);

    } catch (err) {
      setStatus('error');
      setProgress(0);
      setMessage(err.response?.data?.error || 'Upload failed. Try again.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>⬆️ Upload File</h2>

        {/* Dropzone */}
        {status === 'idle' && (
          <div
            className={`dropzone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current.click()}
          >
            <div className="drop-icon">📂</div>
            {file ? (
              <>
                <p><strong>{file.name}</strong></p>
                <p>{formatBytes(file.size)}</p>
              </>
            ) : (
              <>
                <p><strong>Click to select</strong> or drag & drop</p>
                <p>Any file type supported</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={(e) => setFile(e.target.files[0])}
            />
          </div>
        )}

        {/* Progress */}
        {status !== 'idle' && (
          <div className="progress-wrap">
            <div className="progress-label">
              <span>{message}</span>
              <span>{progress}%</span>
            </div>
            <div className="progress-bar-bg">
              <div
                className={`progress-bar-fill ${status}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* File info */}
        {file && status === 'idle' && (
          <div style={{ marginBottom: 20, padding: 12, background: '#f8fafc',
            borderRadius: 8, fontSize: 13, color: '#64748b' }}>
            <strong>📄 {file.name}</strong> — {formatBytes(file.size)}
            <br />
            <span>Will be split into {Math.ceil(file.size / 67108864)} chunk(s) × 3 replicas</span>
          </div>
        )}

        {/* Actions */}
        {status === 'idle' && (
          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>Cancel</button>
            <button
              className="btn-confirm"
              onClick={handleUpload}
              disabled={!file}
            >
              Upload
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>Close</button>
            <button className="btn-confirm" onClick={() => setStatus('idle')}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}