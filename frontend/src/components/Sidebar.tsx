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
          <div className="d-flex align-items-center gap-3 sidebar-user-card" style={{ background: 'rgba(255,255,255,0.95)', padding: 12, borderRadius: 10 }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
              {/* Initials avatar */}
              <div style={{ width: 44, height: 44, borderRadius: 8, background: '#f1f3f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#2c3e50' }}>
                {user?.profile?.name ? (user.profile.name.split(' ').map((n: string) => n[0]).slice(0,2).join('')) : (user?.email || 'U').slice(0,2).toUpperCase()}
              </div>
            </div>
            <div className="flex-grow-1">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="fw-semibold text-dark">{user?.profile?.name || user?.email}</div>
                  <div className="small text-muted">{user?.email}</div>
                </div>
                <div>
                  <span className="badge rounded-pill" style={{ backgroundColor: '#f1c40f', color: '#2c3e50', fontSize: '0.75rem', padding: '6px 8px' }}>{user?.role}</span>
                </div>
              </div>
              <div className="mt-2 d-flex gap-2">
                <Button variant="outline-success" size="sm" as={Link as any} to="/profile" onClick={onClose} className="flex-grow-1 py-1">
                  Profile
                </Button>
                <Button variant="danger" size="sm" onClick={handleLogout} className="py-1">
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>

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
      </div>
    </>
  )
}

export default Sidebar
