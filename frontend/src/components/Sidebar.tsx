// React default import not required with newer JSX transforms
import { Nav, Button } from 'react-bootstrap'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  BarChart,     // ✅ matches Help.tsx (Dashboard)
  Users, 
  Layers,       // ✅ matches Help.tsx (Clusters)
  FileText, 
  Database, 
  Settings,
  Home,
  HelpCircle    // ✅ matches Help.tsx (Help)
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
    { path: '/activitylogs', icon: FileText, label: 'Activity Logs', roles: ['Admin', 'Viewer'] },
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
          width: '240px',
          zIndex: 1000,
          left: window.innerWidth > 768 ? '0' : (isOpen ? '0' : '-240px'),
          backgroundColor: '#f9fafb',
          borderRight: '1px solid #e5e5e5',
          transition: 'all 0.3s ease',
          height: '100vh',
        }}
      >
        <div className="d-md-none d-flex justify-content-end align-items-center p-2" style={{ background: '#f9fafb', borderBottom: '1px solid #e5e5e5' }}>
          <button
            aria-label="Close sidebar"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              color: '#888',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        <div style={{ backgroundColor: '#27ae60', color: '#fff' }} className="p-3 border-bottom sidebar-header">
          <div className="d-flex align-items-center mb-1">
            <BarChart size={26} className="me-2 text-white" />
            <h5 className="mb-0 fw-bold">FreshGroup</h5>
          </div>
          <p className="mb-0 small text-light opacity-90">Student Profiling System</p>
        </div>

        {/* Enhanced user card beneath the brand header */}
        <div className="p-3 border-bottom">
          <div
            className="d-flex align-items-center gap-3 sidebar-user-card"
            style={{
              background: 'linear-gradient(90deg, #27ae60 0%, #2ecc71 100%)', // 🌿 Green gradient
              padding: 12,
              borderRadius: 10,
              overflow: 'hidden',
              color: '#fff',
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 3px 8px rgba(0,0,0,0.1)',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: '#27ae60',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: '#fff',
                  fontSize: '0.85rem',
                  lineHeight: 1,
                }}
              >
                {(user?.profile?.name || user?.email || 'U')
                  .trim()
                  .charAt(0)
                  .toUpperCase()}
              </div>
            </div>

            {/* User info */}
            <div className="flex-grow-1" style={{ minWidth: 0 }}>
              <div className="d-flex align-items-center justify-content-between">
                <div style={{ minWidth: 0 }}>
                  <div
                    className="fw-semibold text-truncate"
                    style={{ maxWidth: 220, color: '#fff' }}
                  >
                    {user?.profile?.name || user?.email}
                  </div>
                  <div
                    className="small text-truncate"
                    style={{ maxWidth: 220, color: 'rgba(255,255,255,0.85)' }}
                  >
                    {user?.email}
                  </div>
                </div>
                <div>
                  <span
                    className="badge rounded-pill"
                    style={{
                      backgroundColor: '#fff',
                      color: '#27ae60',
                      fontSize: '0.75rem',
                      padding: '6px 8px',
                    }}
                  >
                    {user?.role}
                  </span>
                </div>
              </div>

              {/* Profile button */}
              <div className="mt-2 d-flex gap-2 flex-column flex-md-row">
                <Button
                  variant="light"
                  size="sm"
                  as={Link as any}
                  to="/profile"
                  onClick={onClose}
                  className="flex-grow-1 py-1 fw-semibold"
                  style={{
                    color: '#27ae60',
                    border: 'none',
                  }}
                >
                  Profile
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 flex-grow-1 overflow-auto">
          <Nav className="flex-column">
            {filteredMenuItems.map((item) => {
              const IconComponent = item.icon as any
              const isActive = location.pathname.startsWith(item.path)
              return (
                <Nav.Link
                  as={Link}
                  to={item.path}
                  key={item.path}
                  onClick={onClose}
                  className="d-flex align-items-center"
                  style={{
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
            <div className="mt-auto pt-3 border-top">
            <Button
              variant="danger"
              size="sm"
              onClick={handleLogout}
              className="w-100 py-2 fw-semibold"
              style={{ borderRadius: '8px' }}
            >
              Logout
            </Button>
          </div>
        </div>

      </div>
    </>
  )
}

export default Sidebar
