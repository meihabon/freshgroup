import React, { useState, useEffect } from "react"
import { Row, Col, Card, Form, Button, Alert, InputGroup, Spinner } from "react-bootstrap"
import { User, Lock, Save, Mail, Eye, EyeOff } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import axios from "axios"

function Profile() {
  const { user, refreshUser } = useAuth() // ✅ use refreshUser instead of setUser
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile")
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  // Profile form state
  const [profileData, setProfileData] = useState({
    name: "",
    department: "",
    position: ""
  })

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })

  // Eye toggle states
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  // --- Load profile from backend ---
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get("/api/users/me")
        const profile = res.data.profile || {}
        setProfileData({
          name: profile.name || "",
          department: profile.department || "",
          position: profile.position || ""
        })
      } catch (err) {
        console.error("Failed to load profile", err)
        setError("Failed to load profile")
      } finally {
        setInitialLoading(false)
      }
    }
    fetchProfile()
  }, [])

  // --- Update Profile ---
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      await axios.put("/api/users/me", profileData)
      setSuccess("Profile updated successfully!")
      await refreshUser() // ✅ re-fetch latest user data
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to update profile")
    } finally {
      setLoading(false)
    }
  }

  // --- Change Password ---
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match")
      return
    }

    if (passwordData.newPassword.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    setLoading(true)
    try {
      await axios.post("/api/auth/change-password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword
      })

      setSuccess("Password changed successfully!")
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to change password")
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "200px" }}>
        <Spinner animation="border" />
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">Profile Settings</h2>
        <div className="d-flex align-items-center">
          <User size={20} className="me-2 text-muted" />
          <span className="text-muted">{user?.email}</span>
        </div>
      </div>

      {success && <Alert variant="success">{success}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      <Row>
        <Col lg={8}>
          <Card>
            <Card.Header>
              <nav className="nav nav-tabs card-header-tabs">
                <button
                  className={`nav-link ${activeTab === "profile" ? "active" : ""}`}
                  onClick={() => setActiveTab("profile")}
                >
                  <User size={16} className="me-2" />
                  Profile Information
                </button>
                <button
                  className={`nav-link ${activeTab === "password" ? "active" : ""}`}
                  onClick={() => setActiveTab("password")}
                >
                  <Lock size={16} className="me-2" />
                  Change Password
                </button>
              </nav>
            </Card.Header>

            <Card.Body>
              {activeTab === "profile" && (
                <Form onSubmit={handleProfileSubmit}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Full Name</Form.Label>
                        <Form.Control
                          type="text"
                          value={profileData.name}
                          onChange={(e) =>
                            setProfileData((prev) => ({ ...prev, name: e.target.value }))
                          }
                          placeholder="Enter your full name"
                        />
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Department</Form.Label>
                        <Form.Control
                          type="text"
                          value={profileData.department}
                          onChange={(e) =>
                            setProfileData((prev) => ({ ...prev, department: e.target.value }))
                          }
                          placeholder="Enter your department"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Position</Form.Label>
                        <Form.Control
                          type="text"
                          value={profileData.position}
                          onChange={(e) =>
                            setProfileData((prev) => ({ ...prev, position: e.target.value }))
                          }
                          placeholder="Enter your position/title"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <div className="d-flex justify-content-end">
                    <Button type="submit" variant="primary" disabled={loading}>
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} className="me-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </Form>
              )}

              {activeTab === "password" && (
                <Form onSubmit={handlePasswordSubmit}>
                  <div style={{ maxWidth: "400px" }}>
                    <Form.Group className="mb-3">
                      <Form.Label>Current Password</Form.Label>
                      <InputGroup>
                        <Form.Control
                          type={showCurrent ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={(e) =>
                            setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))
                          }
                          required
                          placeholder="Enter current password"
                        />
                        <Button variant="outline-secondary" onClick={() => setShowCurrent(!showCurrent)}>
                          {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                        </Button>
                      </InputGroup>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>New Password</Form.Label>
                      <InputGroup>
                        <Form.Control
                          type={showNew ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) =>
                            setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))
                          }
                          required
                          placeholder="Enter new password"
                        />
                        <Button variant="outline-secondary" onClick={() => setShowNew(!showNew)}>
                          {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                        </Button>
                      </InputGroup>
                      <Form.Text className="text-muted">Password must be at least 6 characters long</Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label>Confirm New Password</Form.Label>
                      <Form.Control
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                        }
                        required
                        placeholder="Confirm new password"
                      />
                    </Form.Group>

                    <Button type="submit" variant="primary" disabled={loading}>
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Lock size={16} className="me-2" />
                          Change Password
                        </>
                      )}
                    </Button>
                  </div>
                </Form>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Sidebar */}
        <Col lg={4}>
          <Card className="profile-header">
            <Card.Body className="text-center">
              <div className="mb-3">
                <User size={64} className="text-white" />
              </div>
              <h5 className="text-white">{user?.profile?.name || "User"}</h5>
              <p className="text-white opacity-75 mb-3">{user?.email}</p>
              <div className="d-flex justify-content-center">
                <span className="badge bg-light text-dark">{user?.role}</span>
              </div>
            </Card.Body>
          </Card>

          <Card className="mt-4">
            <Card.Header>
              <h6 className="mb-0 fw-bold">Account Information</h6>
            </Card.Header>
            <Card.Body>
              <div className="d-flex align-items-center mb-3">
                <Mail size={16} className="text-muted me-3" />
                <div>
                  <div className="fw-semibold">Email</div>
                  <small className="text-muted">{user?.email}</small>
                </div>
              </div>

              <div className="d-flex align-items-center mb-3">
                <User size={16} className="text-muted me-3" />
                <div>
                  <div className="fw-semibold">Role</div>
                  <small className="text-muted">{user?.role}</small>
                </div>
              </div>

              <div className="d-flex align-items-center">
                <Lock size={16} className="text-muted me-3" />
                <div>
                  <div className="fw-semibold">Account Status</div>
                  <small className="text-success">Active</small>
                </div>
              </div>
            </Card.Body>
          </Card>

          <Card className="mt-4">
            <Card.Header>
              <h6 className="mb-0 fw-bold">Security Tips</h6>
            </Card.Header>
            <Card.Body>
              <ul className="list-unstyled mb-0">
                <li className="mb-2"><small>✓ Use a strong, unique password</small></li>
                <li className="mb-2"><small>✓ Keep your profile information updated</small></li>
                <li className="mb-2"><small>✓ Log out when using shared computers</small></li>
                <li className="mb-0"><small>✓ Report any suspicious activity</small></li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Profile
