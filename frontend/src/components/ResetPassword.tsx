import React, { useState } from "react"
import { Container, Card, Form, Button, Alert, InputGroup, ProgressBar } from "react-bootstrap"
import { useSearchParams, useNavigate } from "react-router-dom"
import axios from "axios"
import { Eye, EyeOff } from "lucide-react"

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  // --- Password Strength Checker ---
  const getPasswordStrength = (pwd: string) => {
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++ // special chars

    if (score <= 1) return { label: "Weak", variant: "danger", value: 33 }
    if (score === 2) return { label: "Medium", variant: "warning", value: 66 }
    if (score >= 3) return { label: "Strong", variant: "success", value: 100 }
    return { label: "Too Short", variant: "danger", value: 20 }
  }

  const strength = getPasswordStrength(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!token) {
      setError("Invalid or missing reset token.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    try {
      setLoading(true)
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/reset-password`,
        { token, new_password: password }
      )

      setSuccess(response.data.message || "Password reset successful.")
      setTimeout(() => navigate("/login"), 2000)
    } catch (err: any) {
      setError(err.response?.data?.detail || "Reset failed. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
      <Card className="shadow-sm" style={{ maxWidth: "420px", width: "100%" }}>
        <Card.Body className="p-4">
          <h3 className="fw-bold mb-3 text-center">Reset Password</h3>
          <p className="text-muted text-center mb-4">
            Enter your new password below. Your reset link will expire after 1 hour.
          </p>

          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <Form onSubmit={handleSubmit}>
            {/* New password with toggle + strength meter */}
            <Form.Group className="mb-3">
              <Form.Label>New Password</Form.Label>
              <InputGroup>
                <Form.Control
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </Button>
              </InputGroup>
              {password && (
                <div className="mt-2">
                  <ProgressBar
                    now={strength.value}
                    variant={strength.variant}
                    label={strength.label}
                    style={{ height: "8px" }}
                  />
                </div>
              )}
            </Form.Group>

            {/* Confirm password (no toggle) */}
            <Form.Group className="mb-3">
              <Form.Label>Confirm Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </Form.Group>

            <Button type="submit" className="w-100" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  )
}

export default ResetPassword
