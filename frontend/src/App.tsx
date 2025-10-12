import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import axios from 'axios'
import 'bootstrap/dist/css/bootstrap.min.css'

import Login from './components/Login'
import Dashboard from './components/Dashboard'
import Students from './components/Students'
import Clusters from './components/Clusters'
import Reports from './components/Reports'
import DatasetHistory from './components/DatasetHistory'
import UserManagement from './components/UserManagement'
import Profile from './components/Profile'
import Sidebar from './components/Sidebar'
import { AuthProvider, useAuth } from './context/AuthContext'
import Footer from './components/Footer'
import UserGuide from './components/Help'
import Home from './components/Home'
import ResetPassword from './components/ResetPassword'
// Configure axios defaults
axios.defaults.baseURL = 'http://localhost:8000'
axios.defaults.withCredentials = true


function AppContent() {
  const { user, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public route for password reset */}
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* All other routes require auth */}
      <Route
        path="*"
        element={
          !user ? (
            <Login />
          ) : (
            <div className="d-flex">
              <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
              {/* Mobile menu button */}
              <button
                className="btn btn-primary d-md-none position-fixed"
                style={{ top: '10px', left: '10px', zIndex: 1001 }}
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                ☰
              </button>
              <div className="flex-grow-1" style={{ marginLeft: window.innerWidth > 768 ? '250px' : '0' }}>
                <div className="container p-4">
                  <header className="app-header mb-3">
                    <div />
                  </header>
                  <Routes>
                    <Route path="/" element={<Navigate to="/home" replace />} />
                    <Route path="/home" element={<Home />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/students" element={<Students />} />
                    <Route path="/clusters" element={<Clusters />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/datasets" element={<DatasetHistory />} />
                    <Route path="/users" element={<UserManagement />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path='/help' element={<UserGuide/>} />
                    <Route path="*" element={<Navigate to="/home" replace />} />
                  </Routes>
                </div>
                <Footer/>
              </div>
            </div>
          )
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  )
}

export default App