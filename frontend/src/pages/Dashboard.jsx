import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import FileExplorer from '../components/FileExplorer'
import ClusterHealth from '../components/ClusterHealth'
import StorageUsage from '../components/StorageUsage'
import FileUpload from '../components/FileUpload'
import Visualization from '../components/Visualization'
import '../styles/dashboard.css'
import '../styles/global.css'

const PAGE_TITLES = {
  files         : { title: 'My Files',       subtitle: 'Manage your uploaded files'             },
  upload        : { title: 'Upload File',    subtitle: 'Upload a new file to the cluster'       },
  cluster       : { title: 'Cluster Health', subtitle: 'Monitor storage node status'            },
  storage       : { title: 'Storage Usage',  subtitle: 'View storage distribution across nodes' },
  visualization : { title: 'Visualization',  subtitle: 'Live cluster topology and data flow'    },
}

export default function Dashboard() {
  const [activePage, setActivePage] = useState('files')
  const [showUpload, setShowUpload] = useState(false)
  const { user } = useAuth()

  const { title, subtitle } = PAGE_TITLES[activePage] || PAGE_TITLES.files

  const renderPage = () => {
    switch (activePage) {
      case 'files':
        return <FileExplorer />

      case 'visualization':
        return <Visualization />

      case 'upload':
        return (
          <div>
            <div style={{
              background: 'white',
              borderRadius: 12,
              padding: 40,
              textAlign: 'center',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>⬆️</div>
              <h3 style={{ fontSize: 18, marginBottom: 8 }}>
                Upload a File
              </h3>
              <p style={{ color: '#64748b', marginBottom: 24 }}>
                Files are split into 64MB chunks and replicated across 3 storage nodes
              </p>
              <button
                style={{
                  background: '#2563eb',
                  color: 'white',
                  padding: '12px 28px',
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                }}
                onClick={() => setShowUpload(true)}
              >
                Choose File to Upload
              </button>
            </div>

            {showUpload && (
              <FileUpload
                onClose={() => setShowUpload(false)}
                onUploadComplete={() => {
                  setShowUpload(false)
                  setActivePage('files')
                }}
              />
            )}
          </div>
        )

      case 'cluster':
        return <ClusterHealth />

      case 'storage':
        return <StorageUsage />

      default:
        return <FileExplorer />
    }
  }

  return (
    <div className="dashboard">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      <div className="main-content">

        {/* Demo mode banner */}
        {user?.email === 'demo@dfs.com' && (
          <div style={{
            background: 'linear-gradient(135deg, #1e40af, #0f172a)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: 8,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13,
          }}>
            <span>
              🚀 <strong>Demo Mode</strong> — Explore the full
              Distributed File Storage System
            </span>
            <span style={{ opacity: 0.7 }}>demo@dfs.com</span>
          </div>
        )}

        <div className="page-header">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        {renderPage()}
      </div>
    </div>
  )
}