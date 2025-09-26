import React, { useState, useEffect } from 'react'
import { 
  Row, Col, Card, Table, Form, Button, 
  InputGroup, Badge, Spinner, Alert 
} from 'react-bootstrap'
import { Search, Filter, Download } from 'lucide-react'
import axios from 'axios'

interface Student {
  id: number
  name: string
  sex: 'Male' | 'Female'
  program: string
  municipality: string
  income: number
  SHS_type: string
  GWA: number
  Honors: string
  IncomeCategory: string
}

function Students() {
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
      const response = await axios.get('/api/students')
      setStudents(response.data)

      const uniquePrograms = [...new Set(response.data.map((s: Student) => s.program))].sort()
      const uniqueMunicipalities = [...new Set(response.data.map((s: Student) => s.municipality))].sort()
      const uniqueShsTypes = [...new Set(response.data.map((s: Student) => s.SHS_type))].sort()

      setPrograms(uniquePrograms)
      setMunicipalities(uniqueMunicipalities)
      setShsTypes(uniqueShsTypes)
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
        student.name.toLowerCase().includes(searchTerm.toLowerCase())
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
    const headers = ['Name', 'Sex', 'Program', 'Municipality', 'Income', 'SHS Type', 'GWA', 'Honors', 'Income Category']
    const csvContent = [
      headers.join(','),
      ...filteredStudents.map(student =>
        [
          student.name,
          student.sex,
          student.program,
          student.municipality,
          student.income,
          student.SHS_type,
          student.GWA,
          student.Honors,
          student.IncomeCategory
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

          <div className="table-responsive">
            <Table striped hover className="mb-0">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Sex</th>
                  <th>Program</th>
                  <th>Municipality</th>
                  <th>Income</th>
                  <th>SHS Type</th>
                  <th>GWA</th>
                  <th>Honors</th>
                  <th>Income Category</th>
                </tr>
              </thead>
              <tbody>
                {currentStudents.map((student) => (
                  <tr key={student.id}>
                    <td className="fw-semibold">{student.name}</td>
                    <td>{student.sex}</td>
                    <td>{student.program}</td>
                    <td>{student.municipality}</td>
                    <td>₱{student.income.toLocaleString()}</td>
                    <td>{student.SHS_type}</td>
                    <td>{student.GWA}</td>
                    <td>
                      <Badge bg={getHonorsBadgeVariant(student.Honors)}>
                        {student.Honors}
                      </Badge>
                    </td>
                    <td>
                      <Badge bg={getIncomeBadgeVariant(student.IncomeCategory)}>
                        {student.IncomeCategory}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-5">
              <p className="text-muted">No students found matching the current filters.</p>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  )
}

export default Students
