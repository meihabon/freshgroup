import React, { useState, useEffect } from 'react'
import { 
  Row, Col, Card, Table, Form, Button, 
  InputGroup, Badge, Spinner, Alert, Modal
} from 'react-bootstrap'
import { Search, Filter, Download } from 'lucide-react'
import { useAuth } from "../context/AuthContext"

interface Student {
  id: number
  firstname: string
  lastname: string
  sex: 'Male' | 'Female' | 'Incomplete' | null
  program: string
  municipality: string
  income: number
  SHS_type: string
  GWA: number
  Honors: string
  IncomeCategory: string
}

function Students() {
  const { API } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [programFilter, setProgramFilter] = useState('')
  const [sexFilter, setSexFilter] = useState('')
  const [municipalityFilter, setMunicipalityFilter] = useState('')
  const [incomeFilter, setIncomeFilter] = useState('')
  const [shsFilter, setShsFilter] = useState('')
  const [honorsFilter, setHonorsFilter] = useState('')

  // Dropdown options
  const [programs, setPrograms] = useState<string[]>([])
  const [municipalities, setMunicipalities] = useState<string[]>([])
  const [shsTypes, setShsTypes] = useState<string[]>([])
  
  //Edit students
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [saving, setSaving] = useState(false)

  const handleEdit = (student: Student) => {
    setEditingStudent(student)
    setShowEditModal(true)
  }

  const handleSave = async () => {
    if (!editingStudent) return
    try {
      setSaving(true)
      await API.put(`/students/${editingStudent.id}`, editingStudent)
      // refresh students
      await fetchStudents()
      setShowEditModal(false)
    } catch (err: any) {
      alert(err.response?.data?.detail || "Update failed")
    } finally {
      setSaving(false)
    }
  }
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const studentsPerPage = 25

  useEffect(() => {
    fetchStudents()
  }, [])

  useEffect(() => {
    applyFilters()
    setCurrentPage(1) // reset to page 1 when filters change
  }, [students, searchTerm, programFilter, sexFilter, municipalityFilter, incomeFilter, shsFilter, honorsFilter])

  const fetchStudents = async () => {
    try {
      const response = await API.get('/students')
      setStudents(response.data)

      const uniquePrograms = [...new Set(response.data.map((s: Student) => s.program))].sort()
      const uniqueMunicipalities = [...new Set(response.data.map((s: Student) => s.municipality))].sort()
      const uniqueShsTypes = [...new Set(response.data.map((s: Student) => s.SHS_type))].sort()

    setPrograms(uniquePrograms as string[])
    setMunicipalities(uniqueMunicipalities as string[])
    setShsTypes(uniqueShsTypes as string[])

    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch students')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = students

    if (searchTerm) {
      filtered = filtered.filter(student =>
        `${student.firstname} ${student.lastname}`.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (programFilter) filtered = filtered.filter(s => s.program === programFilter)
    if (sexFilter) filtered = filtered.filter(s => s.sex === sexFilter)
    if (municipalityFilter) filtered = filtered.filter(s => s.municipality === municipalityFilter)
    if (incomeFilter) filtered = filtered.filter(s => s.IncomeCategory === incomeFilter)
    if (shsFilter) filtered = filtered.filter(s => s.SHS_type === shsFilter)
    if (honorsFilter) filtered = filtered.filter(s => s.Honors === honorsFilter)

    setFilteredStudents(filtered)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setProgramFilter('')
    setSexFilter('')
    setMunicipalityFilter('')
    setIncomeFilter('')
    setShsFilter('')
    setHonorsFilter('')
  }

  const exportToCSV = () => {
   
    const headers = [
      'firstname',
      'lastname',
      'sex',
      'program',
      'municipality',
      'income',
      'SHS_type',
      'GWA',
    ]

    const csvContent = [
      headers.join(','),
      ...filteredStudents.map(student =>
        [
          student.firstname,
          student.lastname,
          student.sex,
          student.program,
          student.municipality,
          student.income,
          student.SHS_type,
          student.GWA,
        ].join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'students.csv'
    a.click()
  }


  const getHonorsBadgeVariant = (honors: string) => {
    switch (honors) {
      case 'With Highest Honors': return 'success'
      case 'With High Honors': return 'warning'
      case 'With Honors': return 'info'
      default: return 'secondary'
    }
  }

  const getIncomeBadgeVariant = (income: string) => {
    switch (income) {
      case 'Poor':
      case 'Low-Income': return 'danger'
      case 'Lower-Middle': return 'warning'
      case 'Middle-Middle': return 'secondary'
      case 'Upper-Middle': return 'info'
      case 'Upper-Income': return 'primary'
      case 'Rich': return 'success'
      default: return 'dark'
    }
  }

  // Pagination logic
  const indexOfLast = currentPage * studentsPerPage
  const indexOfFirst = indexOfLast - studentsPerPage
  const currentStudents = filteredStudents.slice(indexOfFirst, indexOfLast)
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage)

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    )
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>
  }

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">Students</h2>
        <Button variant="success" onClick={exportToCSV}>
          <Download size={18} className="me-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="filter-section mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={6} lg={4}>
              <Form.Label>Search Students</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <Search size={16} />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>

            <Col md={6} lg={2}>
              <Form.Label>Program</Form.Label>
              <Form.Select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
                <option value="">All Programs</option>
                {programs.map(program => (
                  <option key={program} value={program}>{program}</option>
                ))}
              </Form.Select>
            </Col>

            <Col md={6} lg={2}>
              <Form.Label>Sex</Form.Label>
              <Form.Select value={sexFilter} onChange={(e) => setSexFilter(e.target.value)}>
                <option value="">All</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </Form.Select>
            </Col>

            <Col md={6} lg={2}>
              <Form.Label>Municipality</Form.Label>
              <Form.Select value={municipalityFilter} onChange={(e) => setMunicipalityFilter(e.target.value)}>
                <option value="">All Municipalities</option>
                {municipalities.map(municipality => (
                  <option key={municipality} value={municipality}>{municipality}</option>
                ))}
              </Form.Select>
            </Col>

            <Col md={6} lg={2}>
              <Form.Label>Income Category</Form.Label>
              <Form.Select value={incomeFilter} onChange={(e) => setIncomeFilter(e.target.value)}>
                <option value="">All Income Levels</option>
                <option value="Poor">Poor</option>
                <option value="Low-Income">Low-Income</option>
                <option value="Lower-Middle">Lower-Middle</option>
                <option value="Middle-Middle">Middle-Middle</option>
                <option value="Upper-Middle">Upper-Middle</option>
                <option value="Upper-Income">Upper-Income</option>
                <option value="Rich">Rich</option>
              </Form.Select>
            </Col>

            <Col md={6} lg={2}>
              <Form.Label>SHS Type</Form.Label>
              <Form.Select value={shsFilter} onChange={(e) => setShsFilter(e.target.value)}>
                <option value="">All SHS Types</option>
                {shsTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Form.Select>
            </Col>

            <Col md={6} lg={2}>
              <Form.Label>Honors</Form.Label>
              <Form.Select value={honorsFilter} onChange={(e) => setHonorsFilter(e.target.value)}>
                <option value="">All Honors</option>
                <option value="Average">Average</option>
                <option value="With Honors">With Honors</option>
                <option value="With High Honors">With High Honors</option>
                <option value="With Highest Honors">With Highest Honors</option>
              </Form.Select>
            </Col>

            <Col lg={2} className="d-flex align-items-end">
              <Button variant="outline-secondary" onClick={clearFilters} className="w-100">
                <Filter size={16} className="me-2" />
                Clear Filters
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Students Table with Pagination */}
      <Card>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table striped hover className="mb-0">
              <thead>
                <tr>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Sex</th>
                  <th>Program</th>
                  <th>Municipality</th>
                  <th>Income</th>
                  <th>Senior High School Type</th>
                  <th>General Weighted Average (GWA)</th>
                  <th>Honors</th>
                  <th>Income Category</th>
                  <th>Action</th>
                </tr>
              </thead>
                <tbody>
                  {currentStudents.map((student) => (
                    <tr key={student.id}>
                      {/* Firstname */}
                      <td className="fw-semibold">
                        {student.firstname && student.firstname !== "Incomplete"
                          ? student.firstname
                          : <Badge bg="danger">No First Name</Badge>}
                      </td>

                      {/* Lastname */}
                      <td className="fw-semibold">
                        {student.lastname && student.lastname !== "Incomplete"
                          ? student.lastname
                          : <Badge bg="danger">No Last Name</Badge>}
                      </td>

                      {/* Sex */}
                      <td>
                        {student.sex && student.sex !== "Incomplete"
                          ? student.sex
                          : <Badge bg="danger">No Sex</Badge>}
                      </td>

                      {/* Program */}
                      <td>
                        {student.program && student.program !== "Incomplete"
                          ? student.program
                          : <Badge bg="danger">No Program</Badge>}
                      </td>

                      {/* Municipality */}
                      <td>
                        {student.municipality && student.municipality !== "Incomplete"
                          ? student.municipality
                          : <Badge bg="danger">No Municipality</Badge>}
                      </td>

                      {/* Income */}
                      <td>
                        {student.income === -1 || student.income === null
                          ? <Badge bg="danger">No Income Entered</Badge>
                          : `₱${student.income.toLocaleString()}`}
                      </td>

                      {/* SHS Type */}
                      <td>
                        {student.SHS_type && student.SHS_type !== "Incomplete"
                          ? student.SHS_type
                          : <Badge bg="danger">No SHS Type</Badge>}
                      </td>

                      {/* GWA */}
                      <td>
                        {student.GWA === -1 || student.GWA === null
                          ? <Badge bg="danger">No GWA Entered</Badge>
                          : student.GWA}
                      </td>

                      {/* Honors */}
                      <td>
                        <Badge bg={getHonorsBadgeVariant(student.Honors)}>
                          {student.Honors && student.Honors !== "Incomplete" ? student.Honors : "No Honors"}
                        </Badge>
                      </td>

                      {/* Income Category */}
                      <td>
                        <Badge bg={getIncomeBadgeVariant(student.IncomeCategory)}>
                          {student.IncomeCategory && student.IncomeCategory !== "Incomplete"
                            ? student.IncomeCategory
                            : "No Income Category"}
                        </Badge>
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => handleEdit(student)}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
            </Table>
          </div>
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
              <Modal.Header closeButton>
                <Modal.Title>Edit Student</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                {editingStudent && (
                  <Form>
                    {/* First Name */}
                    <Form.Group className="mb-2">
                      <Form.Label>First Name</Form.Label>
                      <Form.Control
                        value={editingStudent.firstname}
                        onChange={(e) =>
                          setEditingStudent({ ...editingStudent, firstname: e.target.value })
                        }
                      />
                    </Form.Group>

                    {/* Last Name */}
                    <Form.Group className="mb-2">
                      <Form.Label>Last Name</Form.Label>
                      <Form.Control
                        value={editingStudent.lastname}
                        onChange={(e) =>
                          setEditingStudent({ ...editingStudent, lastname: e.target.value })
                        }
                      />
                    </Form.Group>

                    {/* Program */}
                    <Form.Group className="mb-2">
                      <Form.Label>Program</Form.Label>
                      <Form.Select
                        value={editingStudent.program || ""}
                        onChange={(e) =>
                          setEditingStudent({ ...editingStudent, program: e.target.value })
                        }
                      >
                        <option value="">Select...</option>
                        {programs.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    {/* Sex */}
                    <Form.Group className="mb-2">
                      <Form.Label>Sex</Form.Label>
                      <Form.Select
                        value={editingStudent.sex || ""}
                        onChange={(e) =>
                          setEditingStudent({ ...editingStudent, sex: e.target.value as any })
                        }
                      >
                        <option value="">Select...</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </Form.Select>
                    </Form.Group>

                    {/* Municipality */}
                    <Form.Group className="mb-2">
                      <Form.Label>Municipality</Form.Label>
                      <Form.Select
                        value={editingStudent.municipality || ""}
                        onChange={(e) =>
                          setEditingStudent({ ...editingStudent, municipality: e.target.value })
                        }
                      >
                        <option value="">Select...</option>
                        {municipalities.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    {/* SHS Type */}
                    <Form.Group className="mb-2">
                      <Form.Label>SHS Type</Form.Label>
                      <Form.Select
                        value={editingStudent.SHS_type || ""}
                        onChange={(e) =>
                          setEditingStudent({ ...editingStudent, SHS_type: e.target.value })
                        }
                      >
                        <option value="">Select...</option>
                        {shsTypes.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    {/* Income (numeric) */}
                    <Form.Group className="mb-2">
                      <Form.Label>Income (₱)</Form.Label>
                      <Form.Control
                        type="number"
                        value={editingStudent.income ?? ""}
                        onChange={(e) =>
                          setEditingStudent({ ...editingStudent, income: Number(e.target.value) })
                        }
                      />
                    </Form.Group>

                    {/* GWA (numeric) */}
                    <Form.Group className="mb-2">
                      <Form.Label>General Weighted Average (GWA)</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        value={editingStudent.GWA ?? ""}
                        onChange={(e) =>
                          setEditingStudent({ ...editingStudent, GWA: Number(e.target.value) })
                        }
                      />
                    </Form.Group>
                  </Form>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button variant="success" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </Modal.Footer>
            </Modal>

          {filteredStudents.length === 0 && (
            <div className="text-center py-5">
              <p className="text-muted">No students found matching the current filters.</p>
            </div>
          )}

          {/* Pagination Controls */}
          <div className="d-flex flex-column align-items-center mt-3">
            <div className="mb-2 text-muted">
              Showing {currentStudents.length} of {filteredStudents.length} students
              {filteredStudents.length > studentsPerPage && ` (Page ${currentPage} of ${totalPages})`}
            </div>

            {totalPages > 1 && (
              <div className="d-flex gap-2 flex-wrap justify-content-center">
                <Button
                  size="sm"
                  variant="outline-success"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Prev
                </Button>

                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1
                  return (
                    <Button
                      key={page}
                      size="sm"
                      variant={currentPage === page ? 'success' : 'outline-success'}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  )
                })}

                <Button
                  size="sm"
                  variant="outline-success"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </Card.Body>
      </Card>
    </div>
  )
}

export default Students
