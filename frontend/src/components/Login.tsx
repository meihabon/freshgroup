import React, { useState } from 'react'
import { Container, Row, Col, Card, Form, Button, Alert, Nav, Modal } from 'react-bootstrap'
import { Eye, EyeOff } from 'lucide-react'
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

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: connect to backend API
    setSuccess(`Password reset link sent to ${resetEmail}`)
    setShowReset(false)
    setResetEmail('')
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
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa" }}>
      <Container fluid className="h-100">
        <Row className="h-100 g-0">
          
          {/* Left Side (Form) */}
          <Col 
            md={5} 
            className="d-flex flex-column bg-white"
            style={{ 
              minHeight: "100vh", 
              boxShadow: "2px 0 8px rgba(0,0,0,0.05)" 
            }}
          >
            <div className="flex-grow-1 d-flex align-items-center justify-content-center">
              <Card className="border-0 w-100" style={{ maxWidth: "420px" }}>
                <Card.Body className="p-5">
                  
                {/* Brand */}
                <div className="mb-4 text-center">
                  <img 
                    src="https://www.ispsc.edu.ph/images/misc/logo.png" 
                    alt="ISPSC Logo" 
                    style={{ width: "80px", marginBottom: "10px" }} 
                  />
                  <h2 className="fw-bold" style={{ color: "#27ae60" }}>
                    FreshGroup
                  </h2>
                  <p className="text-muted mb-0">
                    Student Profiling & Clustering System
                  </p>
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
                              backgroundColor: isLogin ? "#27ae60" : "#f8f9fa",
                              color: isLogin ? "#fff" : "#333",
                              fontWeight: 500
                            }}
                          >
                            Login
                          </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                          <Nav.Link
                            active={!isLogin}
                            onClick={() => setIsLogin(false)}
                            className="px-4"
                            style={{
                              borderRadius: "8px",
                              backgroundColor: !isLogin ? "#f1c40f" : "#f8f9fa",
                              color: !isLogin ? "#2c3e50" : "#333",
                              fontWeight: 500
                            }}
                          >
                            Register
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
                            <Form.Group className="mb-3">
                              <Form.Label>Full Name</Form.Label>
                              <Form.Control
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required={!isLogin}
                                placeholder="Enter your full name"
                              />
                            </Form.Group>

                            <Form.Group className="mb-3">
                              <Form.Label>Department</Form.Label>
                              <Form.Control
                                type="text"
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                                required={!isLogin}
                                placeholder="Enter your department"
                              />
                            </Form.Group>
                          </>
                        )}

                        <Form.Group className="mb-3">
                          <Form.Label>Email</Form.Label>
                          <Form.Control
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="Enter your email"
                          />
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Label>Password</Form.Label>
                          <div className="input-group">
                            <Form.Control
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                              placeholder="Enter your password"
                            />
                            <Button
                              variant="outline-secondary"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </Button>
                          </div>
                        </Form.Group>

                        {!isLogin && (
                          <>
                            <Form.Group className="mb-3">
                              <Form.Label>Confirm Password</Form.Label>
                              <Form.Control
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required={!isLogin}
                                placeholder="Confirm your password"
                              />
                            </Form.Group>

                            {/* Terms & Conditions */}
                            <Form.Group className="mb-3">
                              <Form.Check
                                type="checkbox"
                                label={
                                  <>
                                    I agree to the{" "}
                                    <Button 
                                      variant="link" 
                                      size="sm" 
                                      onClick={() => setShowModal(true)}
                                    >
                                      Terms & Conditions
                                    </Button>{" "}
                                    and{" "}
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
                            backgroundColor: isLogin ? "#27ae60" : "#f1c40f",
                            border: "none",
                            color: "#fff",
                            fontWeight: 600
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
              backgroundImage: `
                linear-gradient(rgba(39, 174, 96, 0.7), rgba(241, 196, 15, 0.7)),
                url('https://www.ispsctagudin.info/library/img/campus.jpg')
              `,
              backgroundSize: "cover",
              backgroundPosition: "center",
              color: "#fff",
              minHeight: "100vh",
            }}
          >

            <div className="text-center px-5">
              <h1 className="fw-bold mb-3">Welcome to FreshGroup</h1>
              <p className="lead">
                Empowering institutions with insights on student performance and demographics.  
                Log in or create your account to explore analytics and clustering results.
              </p>
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
