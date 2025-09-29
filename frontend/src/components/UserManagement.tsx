import React, { useState, useEffect } from "react"
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Badge,
  Spinner,
  Alert,
} from "react-bootstrap"
import {
  UserPlus,
  Edit,
  Shield,
  Users,
  Trash,
  Key,
  Eye,
  EyeOff,
  Download,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"

interface UserProfile {
  name: string
  department: string
  position: string
}

interface UserType {
  id: number
  email: string
  role: string
  active: boolean
  profile: UserProfile
  created_at: string
}

function UserManagement() {
  const { API } = useAuth()
  const { user } = useAuth()
  const [users, setUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserType | null>(null)
  const [form, setForm] = useState({
    email: "",
    role: "Viewer",
    name: "",
    department: "",
    position: "",   
    password: "",   
  })


  const [showResetModal, setShowResetModal] = useState(false)
  const [resetUser, setResetUser] = useState<UserType | null>(null)
  const [resetForm, setResetForm] = useState({ newPassword: "", confirmPassword: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)

  const totalUsers = users.length
  const adminCount = users.filter((u) => u.role === "Admin").length
  const viewerCount = users.filter((u) => u.role === "Viewer").length

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await API.get("users")
      setUsers(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to fetch users")
    } finally {
      setLoading(false)
    }
  }

  const handleShowAdd = () => {
    setEditingUser(null)
    setForm({ email: "", role: "Viewer", name: "", department: "", position: "", password: "" })
    setShowModal(true)
  }

  const handleShowEdit = (user: UserType) => {
    setEditingUser(user)
    setForm({
      email: user.email,
      role: user.role,
      name: user.profile?.name || "",
      department: user.profile?.department || "",
      position: user.profile?.position || "",   // 👈 added
      password: "",
    })
    setShowModal(true)
  }

  const handleFormChange: React.ChangeEventHandler<any> = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSaveUser = async () => {
    setSaving(true)
    setError("")
    setSuccess("")
    try {
      if (editingUser) {
        await API.put(`users/${editingUser.id}`, form)
        setSuccess("User updated successfully")
      } else {
        await API.post("users", form)
        setSuccess("User added successfully")
      }
      setShowModal(false)
      fetchUsers()
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to save user")
    } finally {
      setSaving(false)
    }
  }

  const handleShowResetPassword = (user: UserType) => {
    setResetUser(user)
    setResetForm({ newPassword: "", confirmPassword: "" })
    setShowResetModal(true)
  }

  const handleResetPassword = async () => {
    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setError("Passwords do not match")
      return
    }
    setSaving(true)
    setError("")
    setSuccess("")
    try {
      await API.post(`users/${resetUser?.id}/reset-password`, resetForm)
      setSuccess(`Password updated for ${resetUser?.email}`)
      setShowResetModal(false)
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to reset password")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return
    try {
      await API.delete(`users/${id}`)
      setSuccess("User deleted successfully")
      fetchUsers()
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to delete user")
    }
  }

    // --- 📊 Download CSV ---
  const handleDownloadCSV = () => {
    if (users.length === 0) {
      setError("No users available to download")
      return
    }
    const header = ["ID", "Email", "Role", "Name", "Department", "Position", "Status", "Created"] 
    const rows = users.map((u) => [
      u.id,
      u.email,
      u.role,
      u.profile?.name || "",
      u.profile?.department || "",
      u.profile?.position || "",   
      u.active ? "Active" : "Inactive",
      new Date(u.created_at).toLocaleString(),
    ])
    const csvContent = [header, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "users.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }


  // --- 📄 Download PDF ---
  const handleDownloadPDF = () => {
    if (users.length === 0) {
      setError("No users available to download")
      return
    }

    const doc = new jsPDF()
    doc.text("User List", 14, 15)

    const tableData = users.map((u) => [
      u.id,
      u.email,
      u.role,
      u.profile?.name || "",
      u.profile?.department || "",
      u.profile?.position || "",
      u.active ? "Active" : "Inactive",
      new Date(u.created_at).toLocaleDateString(),
    ])

    autoTable(doc, {
      head: [["ID", "Email", "Role", "Name", "Department", "Position", "Status", "Created"]],
      body: tableData,
      startY: 20,
      theme: "grid",
    })

    doc.save("users.pdf")
  }


  // --- 📑 Download Excel ---
  const handleDownloadExcel = () => {
    if (users.length === 0) {
      setError("No users available to download")
      return
    }
    const worksheetData = users.map((u) => ({
      ID: u.id,
      Email: u.email,
      Role: u.role,
      Name: u.profile?.name || "",
      Department: u.profile?.department || "",
      Position: u.profile?.position || "",   // ✅ added
      Status: u.active ? "Active" : "Inactive",
      Created: new Date(u.created_at).toLocaleString(),
    }))
    const worksheet = XLSX.utils.json_to_sheet(worksheetData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users")
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" })
    saveAs(blob, "users.xlsx")
  }


  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "Admin":
        return "danger"
      case "OSAS":
        return "warning"
      case "Viewer":
        return "info"
      default:
        return "secondary"
    }
  }

  if (user?.role !== "Admin") {
    return (
      <Alert variant="warning">
        You don&apos;t have permission to access user management. Only Admins
        can manage users.
      </Alert>
    )
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "400px" }}>
        <Spinner animation="border" variant="primary" />
      </div>
    )
  }

  return (
  <div className="fade-in">
    <div className="d-flex justify-content-between align-items-center mb-4">
      {/* Left side: Title + Download buttons */}
      <div className="d-flex align-items-center gap-2">
        <h2 className="fw-bold mb-0">User Management</h2>
        <Button variant="success" onClick={handleDownloadCSV}>
          <Download size={16} className="me-2" /> CSV
        </Button>
        <Button variant="danger" onClick={handleDownloadPDF}>
          <Download size={16} className="me-2" /> PDF
        </Button>
        <Button variant="info" onClick={handleDownloadExcel}>
          <Download size={16} className="me-2" /> Excel
        </Button>
      </div>

      {/* Right side: Add User */}
      <Button variant="primary" onClick={handleShowAdd}>
        <UserPlus size={16} className="me-2" /> Add User
      </Button>
    </div>



      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* Stats */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <Users size={40} className="text-primary mb-2" />
              <h4 className="fw-bold">{totalUsers}</h4>
              <p className="text-muted mb-0">Total Users</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <Shield size={40} className="text-danger mb-2" />
              <h4 className="fw-bold">{adminCount}</h4>
              <p className="text-muted mb-0">Admins</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <Shield size={40} className="text-info mb-2" />
              <h4 className="fw-bold">{viewerCount}</h4>
              <p className="text-muted mb-0">Viewers</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Users Table */}
      <Card>
        <Card.Header>
          <h6 className="mb-0 fw-bold">System Users</h6>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table striped hover className="mb-0">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Position</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div>
                        <div className="fw-semibold">{u.profile?.name || "No Name"}</div>
                        <small className="text-muted">ID: {u.id}</small>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td><Badge bg={getRoleBadgeVariant(u.role)}>{u.role}</Badge></td>
                    <td>{u.profile?.department || "N/A"}</td>
                    <td>{u.profile?.position || "N/A"}</td>   
                    <td>
                      <Badge bg={u.active ? "success" : "secondary"}>
                        {u.active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleShowEdit(u)}>
                        <Edit size={14} />
                      </Button>
                      <Button variant="outline-secondary" size="sm" className="me-2" onClick={() => handleShowResetPassword(u)}>
                        <Key size={14} />
                      </Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDeleteUser(u.id)}>
                        <Trash size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Add/Edit User Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingUser ? "Edit User" : "Add New User"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" name="email" value={form.email} onChange={handleFormChange} disabled={!!editingUser} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control type="text" name="name" value={form.name} onChange={handleFormChange} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Department</Form.Label>
              <Form.Control type="text" name="department" value={form.department} onChange={handleFormChange} />
            </Form.Group>
            <Form.Label>Position</Form.Label>
            <Form.Control
              type="text" name="position" value={form.position} onChange={handleFormChange} />
            {!editingUser && (
              <Form.Group className="mb-3">
                <Form.Label>Password</Form.Label>
                <div className="d-flex">
                  <Form.Control type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={handleFormChange} />
                  <Button variant="outline-secondary" onClick={() => setShowPassword(!showPassword)} className="ms-2">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </div>
              </Form.Group>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select name="role" value={form.role} onChange={handleFormChange}>
                <option value="Admin">Admin</option>
                <option value="Viewer">Viewer</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveUser} disabled={saving}>
            {saving ? <Spinner size="sm" animation="border" /> : "Save"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Reset Password Modal */}
      <Modal show={showResetModal} onHide={() => setShowResetModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Reset Password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>New Password</Form.Label>
              <div className="d-flex">
                <Form.Control type={showPassword ? "text" : "password"} value={resetForm.newPassword} onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })} />
                <Button variant="outline-secondary" onClick={() => setShowPassword(!showPassword)} className="ms-2">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Confirm Password</Form.Label>
              <Form.Control type="password" value={resetForm.confirmPassword} onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })} />
              {resetForm.confirmPassword && resetForm.newPassword !== resetForm.confirmPassword && (
                <Form.Text className="text-danger">Passwords do not match</Form.Text>
              )}
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowResetModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleResetPassword} disabled={saving}>
            {saving ? <Spinner size="sm" animation="border" /> : "Update Password"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

export default UserManagement
