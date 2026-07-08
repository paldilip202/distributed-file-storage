import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import '../styles/dashboard.css'

const navItems = [
  { id: 'files',         label: 'My Files',       icon: '📁' },
  { id: 'upload',        label: 'Upload File',     icon: '⬆️' },
  { id: 'cluster',       label: 'Cluster Health',  icon: '🖥️' },
  { id: 'storage',       label: 'Storage Usage',   icon: '💾' },
  { id: 'visualization', label: 'Visualization',   icon: '📊' },
]

export default function Sidebar({ activePage, setActivePage }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = user?.email?.charAt(0).toUpperCase() || 'U'

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <h2>🗄️ DFS Store</h2>
        <span>Distributed File System</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => setActivePage(item.id)}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{initials}</div>
          <div className="user-email">{user?.email}</div>
        </div>
        <button className="btn-logout" onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>
    </div>
  )
}