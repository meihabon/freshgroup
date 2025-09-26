import React from 'react'
import { Nav, Button } from 'react-bootstrap'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  BarChart3, 
  Users, 
  Target, 
  FileText, 
  Database, 
  Settings,
  User,
  LogOut,
  Home
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth()
  const location = useLocation()

  const menuItems = [
    { path: '/home', icon: FileText, label: 'Home', roles: ['Admin', 'Viewer'] },
    { path: '/dashboard', icon: Home, label: 'Dashboard', roles: ['Admin', 'Viewer'] },
    { path: '/students', icon: Users, label: 'Students', roles: ['Admin', 'Viewer'] },
    { path: '/clusters', icon: Target, label: 'Clusters', roles: ['Admin', 'Viewer'] },
    { path: '/reports', icon: FileText, label: 'Reports', roles: ['Admin', 'Viewer'] },
    { path: '/datasets', icon: Database, label: 'Dataset History', roles: ['Admin'] },
    { path: '/users', icon: Settings, label: 'User Management', roles: ['Admin'] },
    { path: '/help', icon: FileText, label: 'Help / User Guide', roles: ['Admin', 'Viewer'] }

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
      {isOpen && (
        <div 
          className="position-fixed w-100 h-100 bg-dark opacity-50 d-md-none"
          style={{ zIndex: 999 }}
          onClick={onClose}
        />
      )}

      <div 
        className={`sidebar position-fixed d-flex flex-column ${isOpen ? 'show' : ''}`}
        style={{ 
          width: '240px',
          zIndex: 1000,
          left: window.innerWidth > 768 ? '0' : (isOpen ? '0' : '-240px'),
          backgroundColor: '#f9fafb',
          borderRight: '1px solid #e5e5e5',
          transition: 'all 0.3s ease'
        }}
      >
        {/* Header (green section) */}
        <div style={{ backgroundColor: '#27ae60', color: '#fff' }} className="p-3 border-bottom">
          <div className="d-flex align-items-center mb-1">
            <BarChart3 size={26} className="me-2 text-white" />
            <h5 className="mb-0 fw-bold">FreshGroup</h5>
          </div>
          <p className="mb-0 small text-light opacity-90">Student Profiling System</p>
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
                  color: isActive ? '#27ae60' : '#555',
                  fontWeight: isActive ? 600 : 400,
                  backgroundColor: isActive ? '#e9f7ef' : 'transparent',
                  marginBottom: '6px',
                  padding: '10px 14px',
                  borderLeft: isActive ? '4px solid #27ae60' : '4px solid transparent',
                  borderRadius: '4px',
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
        <div className="p-3 border-top bg-white">
          <div className="mb-3">
            <div className="d-flex align-items-center text-dark mb-1">
              <User size={16} className="me-2 text-muted" />
              <small className="fw-semibold">{user?.profile?.name || user?.email}</small>
            </div>
            <small 
              className="badge rounded-pill px-3 py-1" 
              style={{ backgroundColor: '#f1c40f', color: '#2c3e50', fontSize: '0.75rem' }}
            >
              {user?.role}
            </small>
          </div>

          <div className="d-grid gap-2">
            <Button 
              variant="outline-success" 
              size="sm"
              as={Link as any} 
              to="/profile"
              onClick={onClose}
              className="d-flex align-items-center justify-content-center sidebar-btn"
            >
              <User size={14} className="me-2" />
              Profile
            </Button>
            <Button 
              variant="outline-danger" 
              size="sm" 
              onClick={handleLogout}
              className="d-flex align-items-center justify-content-center sidebar-btn"
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
