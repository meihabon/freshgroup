import React, { useState } from 'react'
import axios from 'axios'
import { Container, Row, Col, Card, Form, Button, Alert, Nav, Modal, InputGroup } from 'react-bootstrap'
import { Eye, EyeOff, Mail, User, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [department, setDepartment] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // Forgot password
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')

  // Eye toggle
  const [showPassword, setShowPassword] = useState(false)

  // Modal for Terms & Privacy
  const [showModal, setShowModal] = useState(false)

  const { login, register } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (isLogin) {
        await login(email, password)
      } else {
        if (password !== confirmPassword) throw new Error('Passwords do not match')
        if (!agreeTerms) throw new Error('You must agree to the Terms & Conditions')
        await register(email, password, { name, department })
        setSuccess('Registration successful! You can now login.')
        setIsLogin(true)
        resetForm()
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("");
    setSuccess("");
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
      await axios.post(`${apiUrl}/auth/forgot-password`, { email: resetEmail });
      setSuccess(`Password reset link sent to ${resetEmail}`);
      setShowReset(false);
      setResetEmail("");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to send reset link. Try again.");
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setName('')
    setDepartment('')
    setAgreeTerms(false)
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(120deg, #f8f9fa 0%, #eef6f1 50%, #eef0f6 100%)",
        backgroundAttachment: "fixed"
      }}
    >
      <Container fluid className="h-100">
        <Row className="h-100 g-0">

          {/* Left Side (Form) */}
          <Col
            md={5}
            className="d-flex flex-column"
            style={{
              minHeight: "100vh",
              boxShadow: "2px 0 18px rgba(0,0,0,0.06)",
              background: "rgba(255,255,255,0.9)"
            }}
          >
            <div className="flex-grow-1 d-flex align-items-center justify-content-center">
              <Card className="border-0 w-100" style={{ maxWidth: "480px" }}>
                <Card.Body className="p-5" style={{ borderRadius: 12 }}>

                  {/* Brand */}
                  <div className="mb-4 text-center">
                    <div style={{
                      width: 84,
                      height: 84,
                      margin: "0 auto 10px",
                      borderRadius: 18,
                      background: "linear-gradient(135deg,#27ae60,#1e8449)",
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 6px 18px rgba(39,174,96,0.18)'
                    }}>
                      <img
                        src="https://www.ispsc.edu.ph/images/misc/logo.png"
                        alt="ISPSC Logo"
                        style={{ width: 46 }}
                      />
                    </div>

                    <h2 className="fw-bold" style={{ color: "#2c3e50", letterSpacing: 0.4 }}>
                      FreshGroup
                    </h2>
                    <p className="text-muted mb-0">Student Profiling & Clustering</p>
                  </div>

                  {!showReset ? (
                    <>
                      {/* Tabs */}
                      <Nav variant="pills" className="justify-content-center mb-4">
                        <Nav.Item>
                          <Nav.Link
                            active={isLogin}
                            onClick={() => setIsLogin(true)}
                            className="px-4"
                            style={{
                              borderRadius: "8px",
                              backgroundColor: isLogin ? "#27ae60" : "#f2f4f6",
                              color: isLogin ? "#fff" : "#495057",
                              fontWeight: 600,
                              boxShadow: isLogin ? '0 6px 18px rgba(39,174,96,0.12)' : 'none',
                              border: 'none'
                            }}
                          >
                            Sign In
                          </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                          <Nav.Link
                            active={!isLogin}
                            onClick={() => setIsLogin(false)}
                            className="px-4"
                            style={{
                              borderRadius: "8px",
                              backgroundColor: !isLogin ? "#f1c40f" : "#f2f4f6",
                              color: !isLogin ? "#2c3e50" : "#495057",
                              fontWeight: 600,
                              border: 'none'
                            }}
                          >
                            Create Account
                          </Nav.Link>
                        </Nav.Item>
                      </Nav>

                      {/* Alerts */}
                      {error && <Alert variant="danger">{error}</Alert>}
                      {success && <Alert variant="success">{success}</Alert>}

                      {/* Form */}
                      <Form onSubmit={handleSubmit}>
                        {!isLogin && (
                          <>
                            <InputGroup className="mb-3">
                              <InputGroup.Text style={{ borderRadius: 10 }}>
                                <User size={16} />
                              </InputGroup.Text>
                              <Form.Control
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required={!isLogin}
                                placeholder="Full name"
                                style={{ borderRadius: 10 }}
                              />
                            </InputGroup>

                            <InputGroup className="mb-3">
                              <InputGroup.Text style={{ borderRadius: 10 }}>
                                <Lock size={16} />
                              </InputGroup.Text>
                              <Form.Control
                                type="text"
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                                required={!isLogin}
                                placeholder="Department"
                                style={{ borderRadius: 10 }}
                              />
                            </InputGroup>
                          </>
                        )}

                        <InputGroup className="mb-3">
                          <InputGroup.Text style={{ borderRadius: 10 }}>
                            <Mail size={16} />
                          </InputGroup.Text>
                          <Form.Control
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="Email"
                            style={{ borderRadius: 10 }}
                          />
                        </InputGroup>

                        <InputGroup className="mb-3">
                          <InputGroup.Text style={{ borderRadius: 10 }}>
                            <Lock size={16} />
                          </InputGroup.Text>
                          <Form.Control
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Password"
                            style={{ borderRadius: 10 }}
                          />
                          <Button
                            variant="outline-secondary"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{ marginLeft: 8, borderRadius: 10 }}
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </Button>
                        </InputGroup>

                        {!isLogin && (
                          <>
                            <Form.Group className="mb-3">
                              <Form.Label>Confirm Password</Form.Label>
                              <Form.Control
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required={!isLogin}
                                placeholder="Confirm password"
                                style={{ borderRadius: 10 }}
                              />
                            </Form.Group>

                            {/* Terms & Conditions */}
                            <Form.Group className="mb-3">
                              <Form.Check
                                type="checkbox"
                                label={
                                  <>
                                    I agree to the{' '}
                                    <Button
                                      variant="link"
                                      size="sm"
                                      onClick={() => setShowModal(true)}
                                    >
                                      Terms & Conditions
                                    </Button>{' '}
                                    and{' '}
                                    <Button
                                      variant="link"
                                      size="sm"
                                      onClick={() => setShowModal(true)}
                                    >
                                      Privacy Policy
                                    </Button>
                                  </>
                                }
                                checked={agreeTerms}
                                onChange={(e) => setAgreeTerms(e.target.checked)}
                              />
                            </Form.Group>
                          </>
                        )}

                        {isLogin && (
                          <div className="text-end mb-3">
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => setShowReset(true)}
                            >
                              Forgot Password?
                            </Button>
                          </div>
                        )}

                        <Button
                          type="submit"
                          size="lg"
                          className="w-100 mt-3"
                          style={{
                            background: isLogin
                              ? 'linear-gradient(135deg,#27ae60,#1e8449)'
                              : 'linear-gradient(135deg,#f1c40f,#d4ac0d)',
                            border: 'none',
                            color: '#fff',
                            fontWeight: 700,
                            borderRadius: 12,
                            padding: '12px 16px',
                          }}
                          disabled={loading}
                        >
                          {loading ? (
                            <span>
                              <span className="spinner-border spinner-border-sm me-2" />
                              {isLogin ? 'Signing in...' : 'Creating account...'}
                            </span>
                          ) : (
                            isLogin ? 'Sign In' : 'Create Account'
                          )}
                        </Button>
                      </Form>
                    </>
                  ) : (
                    <>
                      <h5 className="fw-bold mb-3">Reset Password</h5>
                      <Form onSubmit={handleResetPassword}>
                        <Form.Group className="mb-3">
                          <Form.Label>Email</Form.Label>
                          <Form.Control
                            type="email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            required
                            placeholder="Enter your registered email"
                            style={{ borderRadius: 10 }}
                          />
                        </Form.Group>
                        <div className="d-flex justify-content-end">
                          <Button
                            variant="secondary"
                            className="me-2"
                            onClick={() => setShowReset(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" variant="success">
                            Send Reset Link
                          </Button>
                        </div>
                      </Form>
                    </>
                  )}
                </Card.Body>
              </Card>
            </div>
          </Col>

          {/* Right Side (Branding) */}
          <Col
            md={7}
            className="d-none d-md-flex align-items-center justify-content-center"
            style={{
              backgroundImage: `url('https://www.ispsctagudin.info/library/img/campus.jpg')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              color: "#fff",
              minHeight: "100vh",
            }}
          >

            <div style={{
              maxWidth: 640,
              width: '100%',
              padding: 32,
              background: 'linear-gradient(180deg, rgba(11,34,24,0.55), rgba(11,34,24,0.28))',
              borderRadius: 14,
              boxShadow: '0 12px 30px rgba(0,0,0,0.3)'
            }}>
              <h1 className="fw-bold mb-3">Welcome to FreshGroup</h1>
              <p className="lead mb-4">Empowering institutions with insights on student performance and demographics.</p>

              <ul className="text-white mb-4" style={{ lineHeight: 1.9 }}>
                <li>• Cluster students using advanced algorithms</li>
                <li>• Visualize performance trends and demographics</li>
                <li>• Export reports and share insights securely</li>
              </ul>

              <div className="d-flex">
                <Button variant="light" style={{ color: '#2c3e50', fontWeight: 600, borderRadius: 10 }} className="me-3">Learn More</Button>
                <Button variant="outline-light" style={{ borderRadius: 10 }}>Contact Us</Button>
              </div>
            </div>
          </Col>
        </Row>
      </Container>

      {/* Terms & Conditions Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Terms & Conditions & Privacy Policy</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: "400px", overflowY: "auto" }}>
          <h6>Terms & Conditions</h6>
          <p>
            By using FreshGroup, you agree to abide by institutional policies and ensure
            the responsible use of student information. Unauthorized access or misuse 
            of data is strictly prohibited.
          </p>
          <h6>Privacy Policy</h6>
          <p>
            FreshGroup values your privacy. We collect and process student data 
            solely for academic profiling and clustering purposes. Information will 
            not be shared with third parties without consent.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

export default Login
