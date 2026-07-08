import { useState, useEffect, useRef } from 'react'
import { nodeAPI, fileAPI } from '../api'
import '../styles/visualization.css'

function formatBytes(bytes) {
  if (!bytes || bytes === '0') return '0 B'
  const b = parseInt(bytes)
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(b) / Math.log(k))
  return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const NODE_COLORS = ['#2563eb', '#7c3aed', '#0891b2']
const FILE_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626']

const UPLOAD_STEPS = [
  { icon: '🌐', label: 'Browser'        },
  { icon: '🔀', label: 'API Gateway'    },
  { icon: '🔐', label: 'Auth Check'     },
  { icon: '🧠', label: 'Metadata Svc'  },
  { icon: '✂️',  label: 'Chunking'      },
  { icon: '⚖️', label: 'Load Balancer' },
  { icon: '📡', label: 'Node 1 Write'  },
  { icon: '📡', label: 'Node 2 Write'  },
  { icon: '📡', label: 'Node 3 Write'  },
  { icon: '🔏', label: 'Checksums'     },
  { icon: '💾', label: 'DB Commit'     },
  { icon: '✅', label: 'Done!'          },
]

const STEP_MSGS = [
  'User selected file for upload',
  'JWT token validated at gateway',
  'User identity confirmed ✓',
  'Calculating chunk count (size ÷ 64MB)',
  'File split into fixed-size chunks',
  'Load balancer picks 3 nodes by free space',
  'Writing chunk replicas to Node 1 via gRPC',
  'Writing chunk replicas to Node 2 via gRPC',
  'Writing chunk replicas to Node 3 via gRPC',
  'SHA-256 checksums verified on all replicas',
  'ACID transaction: files + chunks + replicas',
  'Upload complete — file status set to active ✓',
]

// ─── 1. Topology Tab ────────────────────────────────────────
function TopologyTab({ nodes }) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1500)
    return () => clearInterval(iv)
  }, [])

  if (nodes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📡</div>
        <p>No storage nodes found. Make sure backend is running.</p>
      </div>
    )
  }

  const W = 640, H = 300
  const centerX = 320, centerY = 110
  const nodePositions = [
    { x: 110, y: 240 },
    { x: 320, y: 240 },
    { x: 530, y: 240 },
  ]

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ overflow: 'visible', minWidth: 400 }}
      >
        {/* Lines from metadata to nodes */}
        {nodePositions.slice(0, nodes.length).map((pos, i) => (
          <line
            key={i}
            x1={centerX} y1={centerY + 36}
            x2={pos.x}   y2={pos.y - 38}
            stroke={NODE_COLORS[i % 3]}
            strokeWidth={1.5}
            strokeDasharray="6 3"
            opacity={0.6}
          />
        ))}

        {/* Animated dots */}
        {nodePositions.slice(0, nodes.length).map((pos, i) => {
          const progress = ((tick * 0.12 + i * 0.33) % 1)
          const x = centerX + (pos.x - centerX) * progress
          const y = (centerY + 36) + (pos.y - 38 - (centerY + 36)) * progress
          const opacity = progress < 0.1 || progress > 0.9
            ? 0 : Math.sin(progress * Math.PI)
          return (
            <circle key={i} cx={x} cy={y} r={4}
              fill={NODE_COLORS[i % 3]} opacity={opacity} />
          )
        })}

        {/* Browser */}
        <rect x={10} y={90} width={80} height={40} rx={6}
          fill="#f8fafc" stroke="#e2e8f0" strokeWidth={1} />
        <text x={50} y={107} textAnchor="middle"
          fill="#374151" fontSize={11} fontWeight="500">Browser</text>
        <text x={50} y={121} textAnchor="middle"
          fill="#9ca3af" fontSize={9}>:5173</text>
        <line x1={90} y1={110} x2={130} y2={110}
          stroke="#e2e8f0" strokeWidth={1} />

        {/* API Gateway */}
        <rect x={130} y={90} width={90} height={40} rx={6}
          fill="#f8fafc" stroke="#e2e8f0" strokeWidth={1} />
        <text x={175} y={107} textAnchor="middle"
          fill="#374151" fontSize={11} fontWeight="500">API Gateway</text>
        <text x={175} y={121} textAnchor="middle"
          fill="#9ca3af" fontSize={9}>:3000</text>
        <line x1={220} y1={110} x2={260} y2={110}
          stroke="#e2e8f0" strokeWidth={1} />

        {/* Metadata Service */}
        <rect x={260} y={74} width={120} height={72} rx={8}
          fill="#f5f3ff" stroke="#7c3aed" strokeWidth={2} />
        <text x={320} y={98} textAnchor="middle"
          fill="#5b21b6" fontSize={12} fontWeight="600">Metadata</text>
        <text x={320} y={113} textAnchor="middle"
          fill="#7c3aed" fontSize={9}>Chunking · Replication</text>
        <text x={320} y={127} textAnchor="middle"
          fill="#7c3aed" fontSize={9}>Load Balancing · :4001</text>
        {/* Pulse */}
        <circle cx={320} cy={110}
          r={58 + (tick % 5) * 3}
          fill="none" stroke="#7c3aed" strokeWidth={1}
          opacity={Math.max(0, 0.35 - (tick % 5) * 0.08)} />

        {/* PostgreSQL */}
        <rect x={400} y={44} width={80} height={36} rx={6}
          fill="#fef9c3" stroke="#d97706" strokeWidth={1} />
        <text x={440} y={61} textAnchor="middle"
          fill="#92400e" fontSize={10} fontWeight="500">PostgreSQL</text>
        <text x={440} y={74} textAnchor="middle"
          fill="#b45309" fontSize={9}>:5432</text>
        <line x1={380} y1={95} x2={400} y2={65}
          stroke="#d97706" strokeWidth={1} strokeDasharray="4 2" />

        {/* Redis */}
        <rect x={400} y={106} width={80} height={34} rx={6}
          fill="#fee2e2" stroke="#dc2626" strokeWidth={1} />
        <text x={440} y={122} textAnchor="middle"
          fill="#991b1b" fontSize={10} fontWeight="500">Redis Cache</text>
        <text x={440} y={134} textAnchor="middle"
          fill="#dc2626" fontSize={9}>:6379</text>
        <line x1={380} y1={124} x2={400} y2={124}
          stroke="#dc2626" strokeWidth={1} strokeDasharray="4 2" />

        {/* Storage Nodes */}
        {nodes.map((node, i) => {
          const pos   = nodePositions[i]
          if (!pos) return null
          const color  = NODE_COLORS[i % 3]
          const isDead = node.status !== 'active'
          const pct    = parseInt(node.capacity_bytes) > 0
            ? Math.round(parseInt(node.used_bytes) / parseInt(node.capacity_bytes) * 100)
            : 0

          return (
            <g key={node.id}>
              {/* Pulse ring */}
              {!isDead && (
                <circle cx={pos.x} cy={pos.y}
                  r={38 + (tick + i * 2) % 5}
                  fill="none" stroke={color} strokeWidth={1}
                  opacity={Math.max(0, 0.3 - (tick + i * 2) % 5 * 0.07)} />
              )}
              <circle cx={pos.x} cy={pos.y} r={38}
                fill={isDead ? '#fef2f2' : `${color}18`}
                stroke={isDead ? '#fca5a5' : color}
                strokeWidth={2} />

              {/* gRPC label */}
              <text
                x={(centerX + pos.x) / 2}
                y={(centerY + 36 + pos.y - 38) / 2 - 6}
                textAnchor="middle"
                fill={color} fontSize={8} fontWeight="600">
                gRPC
              </text>

              <text x={pos.x} y={pos.y - 12} textAnchor="middle"
                fill={isDead ? '#ef4444' : '#0f172a'}
                fontSize={11} fontWeight="600">
                Node {i + 1}
              </text>
              <text x={pos.x} y={pos.y + 4} textAnchor="middle"
                fill={isDead ? '#fca5a5' : '#64748b'} fontSize={9}>
                :{node.port}
              </text>

              {/* Storage bar */}
              <rect x={pos.x - 22} y={pos.y + 12}
                width={44} height={4} rx={2} fill="#e2e8f0" />
              <rect x={pos.x - 22} y={pos.y + 12}
                width={Math.max(0, 44 * pct / 100)} height={4} rx={2}
                fill={isDead ? '#fca5a5' : color} />

              <text x={pos.x} y={pos.y + 26} textAnchor="middle"
                fill={isDead ? '#ef4444' : color}
                fontSize={8} fontWeight="600">
                {isDead ? 'DEAD' : `${pct}% used`}
              </text>

              <rect x={pos.x - 18} y={pos.y + 28}
                width={36} height={12} rx={6}
                fill={isDead ? '#fee2e2' : '#dcfce7'} />
              <text x={pos.x} y={pos.y + 38} textAnchor="middle"
                fill={isDead ? '#dc2626' : '#16a34a'}
                fontSize={7} fontWeight="700">
                {isDead ? 'dead' : 'active'}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Node info cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(nodes.length, 3)}, 1fr)`,
        gap: 8,
        marginTop: 16,
      }}>
        {nodes.map((node, i) => (
          <div key={node.id} style={{
            padding: '10px 12px',
            background: '#f8fafc',
            borderRadius: 8,
            borderTop: `3px solid ${NODE_COLORS[i % 3]}`,
            fontSize: 12,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              Node {i + 1} — {node.host}
            </div>
            <div style={{ color: '#64748b' }}>
              Capacity: {formatBytes(node.capacity_bytes)}
            </div>
            <div style={{ color: '#64748b' }}>
              Used: {formatBytes(node.used_bytes)}
            </div>
            <div style={{
              marginTop: 6,
              display: 'inline-block',
              padding: '1px 8px',
              borderRadius: 99,
              fontSize: 10,
              fontWeight: 600,
              background: node.status === 'active' ? '#dcfce7' : '#fee2e2',
              color: node.status === 'active' ? '#15803d' : '#dc2626',
            }}>
              {node.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── 2. Chunk Distribution Tab ───────────────────────────────
function ChunksTab({ files, nodes }) {
  const [hovered, setHovered] = useState(null)

  if (files.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
        <p>Upload files to see chunk distribution</p>
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', marginBottom: 8, minWidth: 480 }}>
        <div style={{ width: 160, flexShrink: 0 }} />
        {nodes.map((node, i) => (
          <div key={node.id} style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 12,
            fontWeight: 600,
            color: NODE_COLORS[i % 3],
          }}>
            Node {i + 1}
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 400 }}>
              {node.host}
            </div>
          </div>
        ))}
      </div>

      {/* File rows */}
      {files.slice(0, 7).map((file, fi) => {
        const chunks = parseInt(file.total_chunks) || 1
        const color  = FILE_COLORS[fi % FILE_COLORS.length]

        return (
          <div key={file.id} style={{
            display: 'flex',
            alignItems: 'center',
            borderTop: '0.5px solid #f1f5f9',
            padding: '10px 0',
            minWidth: 480,
          }}>
            <div style={{ width: 160, flexShrink: 0, paddingRight: 8 }}>
              <div style={{
                fontSize: 12, fontWeight: 600,
                color: '#0f172a', marginBottom: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }} title={file.filename}>
                {file.filename.length > 18
                  ? file.filename.slice(0, 18) + '…'
                  : file.filename}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>
                {chunks} chunk{chunks > 1 ? 's' : ''} × 3 replicas
              </div>
            </div>

            {nodes.map((node, ni) => (
              <div key={node.id} style={{
                flex: 1,
                display: 'flex',
                gap: 3,
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}>
                {Array.from({ length: Math.min(chunks, 6) }).map((_, ci) => {
                  const isPrimary = ni === ci % nodes.length
                  const hKey = `${fi}-${ni}-${ci}`
                  return (
                    <div
                      key={ci}
                      className="chunk-cell"
                      style={{
                        background: isPrimary ? color : `${color}55`,
                        transform: hovered === hKey ? 'scale(1.3)' : 'scale(1)',
                        zIndex: hovered === hKey ? 10 : 1,
                        position: 'relative',
                      }}
                      onMouseEnter={() => setHovered(hKey)}
                      onMouseLeave={() => setHovered(null)}
                      title={`${file.filename} | Chunk ${ci} | ${isPrimary ? 'Primary' : 'Replica'} | Node ${ni + 1}`}
                    >
                      {isPrimary ? 'P' : 'R'}
                    </div>
                  )
                })}
                {chunks > 6 && (
                  <div style={{ fontSize: 9, color: '#94a3b8', alignSelf: 'center' }}>
                    +{chunks - 6}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      })}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
        {[
          { color: '#2563eb',   label: 'P = Primary chunk' },
          { color: '#2563eb55', label: 'R = Replica chunk'  },
        ].map((l) => (
          <div key={l.label} style={{
            display: 'flex', alignItems: 'center',
            gap: 6, fontSize: 11, color: '#64748b',
          }}>
            <div style={{
              width: 12, height: 12,
              borderRadius: 2, background: l.color,
            }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── 3. Heartbeat Tab ────────────────────────────────────────
function HeartbeatTab({ nodes }) {
  const [barsMap, setBarsMap] = useState(() =>
    nodes.reduce((acc, n) => ({
      ...acc,
      [n.id]: Array.from({ length: 20 }, () =>
        n.status === 'active' ? Math.random() * 28 + 8 : 2
      ),
    }), {})
  )
  const [secMap, setSecMap] = useState(
    nodes.reduce((acc, n) => ({ ...acc, [n.id]: 0 }), {})
  )

  useEffect(() => {
    const iv = setInterval(() => {
      setBarsMap(prev => {
        const next = {}
        nodes.forEach(n => {
          const val = n.status === 'active'
            ? Math.random() * 28 + 8 : 2
          next[n.id] = [...(prev[n.id] || []).slice(-19), val]
        })
        return next
      })
      setSecMap(prev => {
        const next = {}
        nodes.forEach(n => { next[n.id] = (prev[n.id] || 0) + 1 })
        return next
      })
    }, 800)
    return () => clearInterval(iv)
  }, [nodes])

  if (nodes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
        No nodes found
      </div>
    )
  }

  return (
    <div>
      <div className="hb-node-grid">
        {nodes.map((node, i) => {
          const color  = NODE_COLORS[i % 3]
          const bars   = barsMap[node.id] || []
          const sec    = secMap[node.id] || 0
          const isDead = node.status !== 'active'
          const pct    = parseInt(node.capacity_bytes) > 0
            ? Math.round(parseInt(node.used_bytes) / parseInt(node.capacity_bytes) * 100)
            : 0

          return (
            <div key={node.id} className="hb-node-card"
              style={{ borderTop: `3px solid ${isDead ? '#dc2626' : color}` }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 10,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {isDead ? '💀' : '❤️'} Node {i + 1}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>
                    {node.host}:{node.port}
                  </div>
                </div>
                <span style={{
                  padding: '2px 8px', borderRadius: 99,
                  fontSize: 10, fontWeight: 600,
                  background: isDead ? '#fee2e2' : '#dcfce7',
                  color: isDead ? '#dc2626' : '#15803d',
                }}>
                  {node.status}
                </span>
              </div>

              {/* Live bar chart */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 2,
                height: 40,
                marginBottom: 8,
              }}>
                {Array.from({ length: 20 }).map((_, j) => {
                  const val      = bars[j] || 2
                  const isLatest = j === bars.length - 1
                  return (
                    <div key={j} style={{
                      flex: 1,
                      height: `${(val / 36) * 100}%`,
                      minHeight: 2,
                      background: isDead
                        ? '#fca5a5'
                        : `${color}${isLatest ? 'ff' : '55'}`,
                      borderRadius: 2,
                      transition: 'height 0.3s ease',
                    }} />
                  )
                })}
              </div>

              {/* Storage bar */}
              <div style={{
                background: '#e2e8f0',
                borderRadius: 99,
                height: 5,
                overflow: 'hidden',
                marginBottom: 4,
              }}>
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: color,
                  borderRadius: 99,
                }} />
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 10,
                color: '#94a3b8',
                marginBottom: 6,
              }}>
                <span>{formatBytes(node.used_bytes)} used</span>
                <span>{formatBytes(node.capacity_bytes)} total</span>
              </div>

              <div style={{ fontSize: 10, color: '#94a3b8' }}>
                💓 {sec < 5 ? 'Just now' : `${sec}s ago`}
              </div>
            </div>
          )
        })}
      </div>

      <div className="info-box">
        ℹ️ If a node misses 6 consecutive heartbeats (30 seconds),
        the metadata service marks it <strong>dead</strong> and
        triggers automatic re-replication of its chunks.
      </div>
    </div>
  )
}

// ─── 4. Upload Flow Tab ──────────────────────────────────────
function UploadFlowTab() {
  const [activeStep, setActiveStep] = useState(-1)
  const [running,    setRunning]    = useState(false)
  const [fileMB,     setFileMB]     = useState(200)
  const [logs,       setLogs]       = useState([])
  const timerRef = useRef(null)

  const chunks = Math.ceil(fileMB / 64)

  const run = () => {
    if (running) return
    setRunning(true)
    setActiveStep(-1)
    setLogs([])

    let step = 0
    const next = () => {
      if (step >= UPLOAD_STEPS.length) {
        setRunning(false)
        return
      }
      setActiveStep(step)
      setLogs(prev => [
        { n: step + 1, msg: STEP_MSGS[step] },
        ...prev,
      ].slice(0, 6))
      const delay = step >= 6 && step <= 8 ? 1200 : 700
      step++
      timerRef.current = setTimeout(next, delay)
    }
    next()
  }

  const reset = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setRunning(false)
    setActiveStep(-1)
    setLogs([])
  }

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const stepStatus = (i) => {
    if (activeStep < 0)   return 'idle'
    if (i < activeStep)   return 'done'
    if (i === activeStep) return 'active'
    return 'idle'
  }

  return (
    <div>
      {/* File size slider */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        background: '#f8fafc',
        borderRadius: 8,
        marginBottom: 20,
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, color: '#64748b' }}>File size:</span>
        <input
          type="range"
          min="1" max="640" step="1"
          value={fileMB}
          onChange={e => setFileMB(parseInt(e.target.value))}
          style={{ width: 160 }}
        />
        <span style={{ fontSize: 13, fontWeight: 600, minWidth: 60 }}>
          {fileMB} MB
        </span>
        <span style={{ fontSize: 12, color: '#64748b' }}>
          → {chunks} chunk{chunks > 1 ? 's' : ''} × 3 replicas
          = {chunks * 3} node writes
        </span>
      </div>

      {/* Steps — 2 rows of 6 */}
      {[0, 6].map(offset => (
        <div key={offset} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginBottom: 12,
          overflowX: 'auto',
          paddingBottom: 4,
        }}>
          {UPLOAD_STEPS.slice(offset, offset + 6).map((step, j) => {
            const i      = offset + j
            const status = stepStatus(i)
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 5,
                  minWidth: 72,
                }}>
                  <div className={`step-icon-box ${status}`}>
                    {step.icon}
                  </div>
                  <div style={{
                    fontSize: 9,
                    textAlign: 'center',
                    color: status === 'done'   ? '#16a34a' :
                           status === 'active' ? '#2563eb' : '#94a3b8',
                    fontWeight: status !== 'idle' ? 600 : 400,
                  }}>
                    {step.label}
                  </div>
                </div>
                {j < 5 && (
                  <div style={{
                    fontSize: 16,
                    color: status === 'done'   ? '#16a34a' :
                           status === 'active' ? '#2563eb' : '#e2e8f0',
                    paddingBottom: 18,
                    paddingLeft: 2,
                    paddingRight: 2,
                    flexShrink: 0,
                    animation: status === 'active'
                      ? 'blink 0.6s infinite' : 'none',
                  }}>
                    ›
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <button
          onClick={run}
          disabled={running}
          style={{ padding: '8px 20px', fontSize: 13, fontWeight: 500 }}
        >
          ▶ Run animation
        </button>
        <button
          onClick={reset}
          style={{ padding: '8px 16px', fontSize: 13 }}
        >
          ↺ Reset
        </button>
        {running && (
          <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 500 }}>
            Step {activeStep + 1} / {UPLOAD_STEPS.length}
          </span>
        )}
        {!running && activeStep === UPLOAD_STEPS.length - 1 && (
          <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 500 }}>
            ✅ Upload simulated successfully!
          </span>
        )}
      </div>

      {/* Log */}
      {logs.length > 0 && (
        <div style={{
          borderRadius: 8,
          overflow: 'hidden',
          border: '0.5px solid #e2e8f0',
        }}>
          {logs.map((log, i) => (
            <div key={i} style={{
              padding: '6px 12px',
              fontSize: 11,
              background: i === 0 ? '#eff6ff' : 'white',
              color: i === 0 ? '#1d4ed8' : '#94a3b8',
              borderBottom: '0.5px solid #f1f5f9',
              fontWeight: i === 0 ? 500 : 400,
            }}>
              Step {log.n}: {log.msg}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Visualization Component ────────────────────────────
const TABS = [
  { id: 'topology',  label: '🌐 Cluster Topology'  },
  { id: 'chunks',    label: '📦 Chunk Distribution' },
  { id: 'heartbeat', label: '❤️ Heartbeat Monitor'  },
  { id: 'upload',    label: '⬆️ Upload Flow'        },
]

export default function Visualization() {
  const [tab,     setTab]     = useState('topology')
  const [nodes,   setNodes]   = useState([])
  const [files,   setFiles]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [nr, fr] = await Promise.all([
          nodeAPI.getNodes(),
          fileAPI.getFiles(),
        ])
        setNodes(nr.data.data || [])
        setFiles(fr.data.data || [])
        setError('')
      } catch (err) {
        setError('Failed to load data — is backend running?')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
    const iv = setInterval(load, 10000)
    return () => clearInterval(iv)
  }, [])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
      ⏳ Loading visualization data...
    </div>
  )

  return (
    <div>
      {error && (
        <div style={{
          padding: '10px 16px',
          borderRadius: 8,
          background: '#fee2e2',
          color: '#dc2626',
          fontSize: 13,
          marginBottom: 16,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Tabs */}
      <div className="viz-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`viz-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="viz-content">
        {tab === 'topology' && (
          <>
            <div className="viz-title">Live cluster topology</div>
            <div className="viz-sub">
              Animated data flow between all services — auto-refreshes every 10 seconds
            </div>
            <TopologyTab nodes={nodes} />
          </>
        )}

        {tab === 'chunks' && (
          <>
            <div className="viz-title">Chunk distribution across nodes</div>
            <div className="viz-sub">
              P = primary replica, R = secondary replica — hover a cell for details
            </div>
            <ChunksTab files={files} nodes={nodes} />
          </>
        )}

        {tab === 'heartbeat' && (
          <>
            <div className="viz-title">Live heartbeat monitor</div>
            <div className="viz-sub">
              Each storage node sends heartbeat every 5 seconds
            </div>
            <HeartbeatTab nodes={nodes} />
          </>
        )}

        {tab === 'upload' && (
          <>
            <div className="viz-title">Upload flow animator</div>
            <div className="viz-sub">
              Step-by-step simulation of a file upload through the distributed system
            </div>
            <UploadFlowTab />
          </>
        )}
      </div>
    </div>
  )
}