import React from 'react'
import { Nav, Button } from 'react-bootstrap'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  BarChart,      // Dashboard
  Users,         // Students
  Layers,        // Clusters
  FileText,      // Reports
  Database,      // Dataset History
  HelpCircle,    // Help / User Guide
  Settings,      // User Management
  User,          // Profile
  LogOut,        // Logout
  Home           // Home
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
    { path: '/help', icon: HelpCircle, label: 'Help / User Guide', roles: ['Admin', 'Viewer'] },
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
      {/* Backdrop for mobile */}
      {isOpen && <div className="sidebar-backdrop d-md-none" onClick={onClose} />}

      <div 
        className={`sidebar position-fixed d-flex flex-column${isOpen ? ' show' : ''}`}
        style={{ 
          width: '240px',
          zIndex: 1000,
          left: window.innerWidth > 768 ? '0' : (isOpen ? '0' : '-240px'),
          background: 'linear-gradient(180deg, #145a32 0%, #27ae60 50%, #a9dfbf 90%)',
          borderRight: '1px solid rgba(255,255,255,0.2)',
          transition: 'all 0.3s ease',
          height: '100vh',
          color: '#fff'
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

        {/* Header */}
        <div className="p-3 border-bottom" style={{ borderColor: 'rgba(255,255,255,0.3)' }}>
          <div className="d-flex align-items-center mb-1">
            <BarChart size={26} className="me-2 text-warning" />
            <h5 className="mb-0 fw-bold text-white">FreshGroup</h5>
          </div>
          <p className="mb-0 small text-white-50">Student Profiling System</p>
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
                className="d-flex align-items-center sidebar-link"
                style={{
                  color: isActive ? '#f1c40f' : '#fff',
                  fontWeight: isActive ? 600 : 400,
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  marginBottom: '6px',
                  padding: '10px 14px',
                  borderLeft: isActive ? '4px solid #f1c40f' : '4px solid transparent',
                  borderRadius: '6px',
                  transition: 'all 0.3s ease'
                }}
              >
                <IconComponent size={18} className="me-3" />
                {item.label}
              </Nav.Link>
            )
          })}
        </Nav>

        {/* Footer */}
        <div className="p-3 border-top" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
          <div className="mb-3">
            <div className="d-flex align-items-center mb-1">
              <User size={16} className="me-2 text-white" />
              <small className="fw-semibold text-white">
                {user?.profile?.name || user?.email}
              </small>
            </div>
            <small 
              className="badge rounded-pill px-3 py-1" 
              style={{ backgroundColor: '#f1c40f', color: '#145a32', fontSize: '0.75rem' }}
            >
              {user?.role}
            </small>
          </div>

          <div className="d-grid gap-2">
            {/* Profile (Yellow) */}
            <Button 
              size="sm"
              as={Link as any} 
              to="/profile"
              onClick={onClose}
              className="d-flex align-items-center justify-content-center"
              style={{
                backgroundColor: '#f1c40f',
                color: '#145a32',
                border: 'none',
                fontWeight: 600,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f7dc6f')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f1c40f')}
            >
              <User size={14} className="me-2" color="#145a32" />
              Profile
            </Button>

            {/* Logout (Red) */}
            <Button 
              size="sm" 
              onClick={handleLogout}
              className="d-flex align-items-center justify-content-center"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#ff6b6b',
                border: 'none',
                fontWeight: 500,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,107,107,0.25)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)')}
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
