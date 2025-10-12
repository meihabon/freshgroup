import { Nav, Button } from 'react-bootstrap'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  Home,
  BarChart,
  Users,
  Layers,
  FileText,
  Database,
  HelpCircle,
  Settings,
  User,
  LogOut,
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth()
  const location = useLocation()

  const menuItems = [
    { path: '/home', icon: Home, label: 'Home', roles: ['Admin', 'Viewer'] },
    { path: '/dashboard', icon: BarChart, label: 'Dashboard', roles: ['Admin', 'Viewer'] },
    { path: '/students', icon: Users, label: 'Students', roles: ['Admin', 'Viewer'] },
    { path: '/clusters', icon: Layers, label: 'Clusters', roles: ['Admin', 'Viewer'] },
    { path: '/reports', icon: FileText, label: 'Reports', roles: ['Admin', 'Viewer'] },
    { path: '/datasets', icon: Database, label: 'Dataset History', roles: ['Admin'] },
    { path: '/users', icon: Settings, label: 'User Management', roles: ['Admin'] },
    { path: '/help', icon: HelpCircle, label: 'Help / User Guide', roles: ['Admin', 'Viewer'] }
  ]

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role || 'Viewer')
  )

  const handleLogout = async () => {
    await logout()
    onClose()
  }

  return (
    <>
      {isOpen && (
        <div 
          className="sidebar-backdrop d-md-none"
          onClick={onClose}
        />
      )}

      <div 
        className={`sidebar position-fixed d-flex flex-column${isOpen ? ' show' : ''}`}
        style={{ 
          width: '260px',
          zIndex: 1000,
          left: window.innerWidth > 768 ? '0' : (isOpen ? '0' : '-260px'),
          height: '100vh',
          transition: 'all 0.3s ease',
          background: 'linear-gradient(180deg, #2ecc71 0%, #27ae60 90%)',
          color: '#fff',
          borderRight: '2px solid rgba(255,255,255,0.15)',
          boxShadow: '3px 0 10px rgba(0,0,0,0.1)',
        }}
      >
        {/* Collapse button for mobile */}
        <div 
          className="d-md-none d-flex justify-content-end align-items-center p-2" 
          style={{ background: 'rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.2)' }}
        >
          <button
            aria-label="Close sidebar"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              color: '#fff',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {/* Header (brand) */}
        <div className="sidebar-brand p-3 border-bottom" 
          style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
          <div className="d-flex align-items-center mb-1">
            <BarChart size={26} className="me-2 text-warning" />
            <h5 className="mb-0 fw-bold text-white">FreshGroup</h5>
          </div>
          <p className="mb-0 small text-white">Student Profiling System</p>
        </div>

        {/* Navigation */}
        <Nav className="flex-column flex-grow-1 px-2 py-3">
          {filteredMenuItems.map((item) => {
            const IconComponent = item.icon
            const isActive = location.pathname === item.path
            
            return (
              <Nav.Link
                key={item.path}
                as={Link as any}
                to={item.path}
                onClick={onClose}
                className={`d-flex align-items-center sidebar-link nav-item ${
                  isActive ? 'active' : ''
                }`}
                style={{
                  color: '#fff',
                  background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
                  borderLeft: isActive ? '4px solid #f1c40f' : '4px solid transparent',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  marginBottom: '6px',
                  transition: 'all 0.2s ease',
                }}
              >
                <IconComponent 
                  size={18} 
                  className="me-3"
                  color={isActive ? '#f1c40f' : '#fff'}
                />
                <span style={{ fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
              </Nav.Link>
            )
          })}
        </Nav>

        {/* Footer */}
        <div className="p-3 border-top" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
          <div className="mb-3">
            <div className="d-flex align-items-center mb-1">
              <User size={16} className="me-2 text-white" />
              <small className="fw-semibold text-white">{user?.profile?.name || user?.email}</small>
            </div>
            <small 
              className="badge rounded-pill px-3 py-1" 
              style={{ 
                backgroundColor: '#f1c40f',
                color: '#2c3e50', 
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {user?.role}
            </small>
          </div>

          <div className="d-grid gap-2">
            <Button 
              size="sm"
              as={Link as any} 
              to="/profile"
              onClick={onClose}
              className="d-flex align-items-center justify-content-center sidebar-btn"
              style={{
                background: 'rgba(255,255,255,0.25)',
                color: '#fff',
                border: 'none',
                fontWeight: 500,
              }}
            >
              <User size={14} className="me-2" />
              Profile
            </Button>
            <Button 
              size="sm" 
              onClick={handleLogout}
              className="d-flex align-items-center justify-content-center sidebar-btn"
              style={{
                background: 'rgba(255,255,255,0.25)',
                color: '#fff',
                border: 'none',
                fontWeight: 500,
              }}
            >
              <LogOut size={14} className="me-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar
