import React, { useState, useEffect } from "react";
import { Row, Col, Card, Form, Button, Alert, Spinner, InputGroup } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import { getMe, updateProfile, changePassword } from "../api";
import { User, Lock, Save, Mail, Eye, EyeOff } from "lucide-react";


function Profile() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [profileData, setProfileData] = useState({
    name: "",
    department: "",
    position: ""
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // Password strength helper (simple heuristic)
  const getPasswordScore = (pw: string) => {
    if (!pw) return 0
    let score = 0
    if (pw.length >= 8) score += 1
    if (pw.length >= 12) score += 1
    if (/[A-Z]/.test(pw)) score += 1
    if (/[0-9]/.test(pw)) score += 1
    if (/[^A-Za-z0-9]/.test(pw)) score += 1
    return Math.min(100, (score / 5) * 100)
  }

  const getStrengthLabel = (score: number) => {
    if (score === 0) return { label: 'Too short', color: '#e0e0e0' }
    if (score < 40) return { label: 'Weak', color: '#f86c6b' }
    if (score < 70) return { label: 'Medium', color: '#f0ad4e' }
    return { label: 'Strong', color: '#28a745' }
  }

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getMe();
        const profile = res.data.profile || {};
        setProfileData({
          name: profile.name || "",
          department: profile.department || "",
          position: profile.position || ""
        });
      } catch (err) {
        console.error(err);
        setError("Failed to load profile");
      } finally {
        setInitialLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: profileData.name?.trim(),
        department: profileData.department?.trim(),
        position: profileData.position?.trim(),
      };

      // remove empty values
      Object.keys(payload).forEach(
        (key) => (payload as any)[key] === "" && delete (payload as any)[key]
      );

      if (Object.keys(payload).length === 0) {
        setError("Please fill at least one field to update.");
        setLoading(false);
        return;
      }

      await updateProfile(payload); // call API
      await refreshUser(); // refresh local state
      setSuccess("Profile updated successfully!");
    } catch (err: any) {
      console.error("Update profile error:", err.response?.data);
      setError(err.response?.data?.detail || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };


  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      await changePassword(passwordData);
      setSuccess("Password changed successfully!");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      // If 401 and message is 'Current password is incorrect', do NOT log out, just show error
      if (
        err.response?.status === 401 &&
        err.response?.data?.detail === "Current password is incorrect"
      ) {
        setError("Current password is incorrect");
      } else {
        setError(err.response?.data?.detail || "Failed to change password");
      }
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "200px" }}>
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold">Profile Settings</h2>
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
                      {/* Inline feedback for missing or incorrect current password */}
                      {passwordData.currentPassword === "" && (
                        <Form.Text className="text-danger">Current password is required</Form.Text>
                      )}
                      {/* Inline feedback for incorrect current password (after submit) */}
                      {error === "Current password is incorrect" && passwordData.currentPassword !== "" && (
                        <Form.Text className="text-danger">Incorrect current password</Form.Text>
                      )}
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
                      {/* Strength meter and inline length feedback */}
                      <div className="mt-2">
                        {(() => {
                          const score = getPasswordScore(passwordData.newPassword)
                          const info = getStrengthLabel(score)
                          return (
                            <>
                              <div style={{ height: 8, background: '#e9ecef', borderRadius: 6, overflow: 'hidden' }}>
                                <div style={{ width: `${score}%`, height: '100%', background: info.color }} />
                              </div>
                              <small className="text-muted">{info.label} • {passwordData.newPassword.length} chars</small>
                            </>
                          )
                        })()}
                      </div>
                      {passwordData.newPassword && passwordData.newPassword.length > 0 && passwordData.newPassword.length < 6 && (
                        <Form.Text className="text-danger">Password must be at least 6 characters long</Form.Text>
                      )}
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
                      {/* Inline feedback for password mismatch */}
                      {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                        <Form.Text className="text-danger">Passwords do not match</Form.Text>
                      )}
                    </Form.Group>

                    <Button type="submit" variant="primary" disabled={loading || passwordData.newPassword.length < 6 || passwordData.newPassword !== passwordData.confirmPassword}>
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
          <Card
            className="profile-header border-0 shadow-sm"
            style={{
              background: 'linear-gradient(135deg, #f7d27a 0%, #f1c40f 100%)', // Mustard yellow gradient
              borderRadius: '10px',
            }}
          >
            <Card.Body className="text-center text-dark">
              <div className="mb-3">
                <User size={64} className="text-dark" />
              </div>
              <h5 className="fw-bold">{user?.profile?.name || "User"}</h5>
              <p className="opacity-75 mb-3">{user?.email}</p>
              <div className="d-flex justify-content-center">
                <span
                  className="badge"
                  style={{
                    backgroundColor: '#fff',
                    color: '#1b2b24',
                    fontSize: '0.85rem',
                    padding: '6px 10px',
                  }}
                >
                  {user?.role}
                </span>
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
        </Col>
      </Row>
    </div>
  )
}

export default Profile
