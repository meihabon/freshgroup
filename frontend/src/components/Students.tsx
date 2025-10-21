import { useState, useEffect } from 'react'
import { 
  Row, Col, Card, Table, Form, Button, 
  InputGroup, Badge, Spinner, Alert, Modal 
} from 'react-bootstrap'
import { Search, Filter, Download } from 'lucide-react'
import RecordViewModal from './RecordViewModal'
import { useAuth } from "../context/AuthContext"
import { updateStudent } from "../api"
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
  areaType?: string 
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
  const [areaTypeFilter, setAreaTypeFilter] = useState("");


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
    setCurrentPage(1)
  }, [students, searchTerm, programFilter, sexFilter, municipalityFilter, incomeFilter, shsFilter, honorsFilter, areaTypeFilter])

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
    if (areaTypeFilter) {
      filtered = filtered.filter((s) => getAreaType(s.municipality) === areaTypeFilter);
    }

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
      'area_type',
      'income',
      'SHS_type',
      'GWA',
      'Honors',
      'IncomeCategory',
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
          getAreaType(student.municipality),
          student.income,
          student.SHS_type,
          student.GWA,
          student.Honors,
          student.IncomeCategory, 
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

  const getAreaType = (municipality: string) => {
    if (!municipality || municipality.trim() === "") return "No Municipality Entered";

    const uplandMunicipalities = [
    // 📍 Ilocos Sur (14 official upland)
    "Alilem", "Banayoyo", "Burgos", "Cervantes", "Galimuyod",
    "Gregorio del Pilar", "Lidlidda", "Nagbukel", "Quirino",
    "Salcedo", "San Emilio", "Sigay", "Sugpon", "Suyo",

    // 📍 La Union (mountainous upland)
    "Bagulin", "Burgos", "Naguilian", "San Gabriel", "Santol", "Sudipen", "Tubao"
    ];

    // Normalize municipality name
    const normalized = municipality
      .replace(/^sta\.?\s*/i, "santa ")
      .replace(/^sto\.?\s*/i, "santo ")
      .trim()
      .toLowerCase();

    const isUpland = uplandMunicipalities.some(
      (m) => m.toLowerCase() === normalized
    );

    return isUpland ? "Upland" : "Lowland";
  };


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

  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewedStudent, setViewedStudent] = useState<Student | null>(null)

  const handleEditClick = (student: Student) => {
    setSelectedStudent(student)
    setShowEditModal(true)
  }

  const handleRowClick = (student: Student) => {
    setViewedStudent(student)
    setShowViewModal(true)
  }

  const handleSave = async () => {
    if (!selectedStudent) return

    const payload = {
      firstname: selectedStudent.firstname,
      lastname: selectedStudent.lastname,
      sex: selectedStudent.sex,
      program: selectedStudent.program,
      municipality: selectedStudent.municipality,
      SHS_type: selectedStudent.SHS_type,
      GWA: selectedStudent.GWA,
      income: selectedStudent.income,
    }

    try {
      const res = await updateStudent(selectedStudent.id, payload)
      alert(res.data.message || "Student updated successfully")  // 👈 show backend message
      setShowEditModal(false)
      fetchStudents()
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to update student")
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
      <div className="students-layout mb-4">
        <div className="filters-column">
          <Card className="filter-section mb-4">
            <Card.Body>
              <Row className="g-3">
                <Col xs={12}>
                  <Form.Label>Program</Form.Label>
                  <Form.Select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
                    <option value="">All Programs</option>
                    {programs.map(program => (
                      <option key={program} value={program}>{program}</option>
                    ))}
                  </Form.Select>
                </Col>

                <Col xs={12}>
                  <Form.Label>Sex</Form.Label>
                  <Form.Select value={sexFilter} onChange={(e) => setSexFilter(e.target.value)}>
                    <option value="">All</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Unknown">Unknown</option>
                  </Form.Select>
                </Col>

                <Col xs={12}>
                  <Form.Label>Municipality</Form.Label>
                  <Form.Select value={municipalityFilter} onChange={(e) => setMunicipalityFilter(e.target.value)}>
                    <option value="">All Municipalities</option>
                    {municipalities.map(municipality => (
                      <option key={municipality} value={municipality}>{municipality}</option>
                    ))}
                  </Form.Select>
                </Col>

                <Col xs={12}>
                  <Form.Label>Area Type</Form.Label>
                  <Form.Select
                    value={areaTypeFilter}
                    onChange={(e) => setAreaTypeFilter(e.target.value)}
                  >
                    <option value="">All Areas</option>
                    <option value="Upland">Upland</option>
                    <option value="Lowland">Lowland</option>
                  </Form.Select>
                </Col>

                <Col xs={12}>
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
                    <option value="Unknown">Unknown</option>
                  </Form.Select>
                </Col>

                <Col xs={12}>
                  <Form.Label>SHS Type</Form.Label>
                  <Form.Select value={shsFilter} onChange={(e) => setShsFilter(e.target.value)}>
                    <option value="">All SHS Types</option>
                    {shsTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </Form.Select>
                </Col>

                <Col xs={12}>
                  <Form.Label>Honors</Form.Label>
                  <Form.Select value={honorsFilter} onChange={(e) => setHonorsFilter(e.target.value)}>
                    <option value="">All Honors</option>
                    <option value="Average">Average</option>
                    <option value="With Honors">With Honors</option>
                    <option value="With High Honors">With High Honors</option>
                    <option value="With Highest Honors">With Highest Honors</option>
                    <option value="Unknown">Unknown</option>
                  </Form.Select>
                </Col>

                <Col xs={12} className="d-grid mt-2">
                  <Button variant="outline-secondary" onClick={clearFilters} className="w-100">
                    <Filter size={16} className="me-2" />
                    Clear Filters
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Read-only view modal for rows */}
          <RecordViewModal
            show={showViewModal}
            onHide={() => setShowViewModal(false)}
            title="Student Details"
            fields={viewedStudent ? [
              { label: 'First Name', value: viewedStudent.firstname || '—' },
              { label: 'Last Name', value: viewedStudent.lastname || '—' },
              { label: 'Sex', value: viewedStudent.sex || '—' },
              { label: 'Program', value: viewedStudent.program || '—' },
              { label: 'Municipality', value: viewedStudent.municipality || '—' },
              { label: 'Area Type', value: getAreaType(viewedStudent.municipality) },
              { label: 'Income', value: viewedStudent.income === -1 || viewedStudent.income === null ? '—' : `₱${viewedStudent.income.toLocaleString()}` },
              { label: 'SHS Type', value: viewedStudent.SHS_type || '—' },
              { label: 'GWA', value: viewedStudent.GWA === -1 || viewedStudent.GWA === null ? '—' : viewedStudent.GWA },
              { label: 'Honors', value: viewedStudent.Honors || '—' },
              { label: 'Income Category', value: viewedStudent.IncomeCategory || '—' },
            ] : []}
          />
        </div>

        <div>
          {/* Top row: title and search */}
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
            <h2 className="fw-bold mb-0">Students</h2>
            <div className="d-flex align-items-center gap-2">
              <InputGroup className="me-2" style={{ minWidth: 260 }}>
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
              <div className="btn-group" role="group" aria-label="Export options">
                <Button variant="success" onClick={exportToCSV} className="d-flex align-items-center px-3 py-2">
                  <Download size={18} className="me-2" /> Export CSV
                </Button>
              </div>
            </div>
          </div>

          <Card>
            <Card.Body className="p-0">
              <div className="table-responsive-sm students-table-wrapper">
                <Table striped hover responsive className="mb-0 students-table table-sm">
                  <thead>
                    <tr>
                      <th className="col-first">First Name</th>
                      <th className="col-last">Last Name</th>
                      <th className="col-sex">Sex</th>
                      <th className="col-program">Program</th>
                      <th className="col-muni">Municipality</th>
                      <th className="col-area">Area Type</th>
                      <th className="col-income">Income</th>
                      <th className="col-shs">Senior High School Type</th>
                      <th className="col-gwa">GWA</th>
                      <th className="d-none d-md-table-cell col-honors">Honors</th>
                      <th className="d-none d-md-table-cell col-income-cat">Income Category</th>
                      <th className="col-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentStudents.map((student) => (
                      <tr key={student.id} onClick={() => handleRowClick(student)} style={{ cursor: 'pointer' }}>
                        <td data-label="First Name" className="fw-semibold">{student.firstname && student.firstname !== 'Incomplete' ? student.firstname : <Badge bg="danger">No First Name</Badge>}</td>
                        <td data-label="Last Name" className="fw-semibold">{student.lastname && student.lastname !== 'Incomplete' ? student.lastname : <Badge bg="danger">No Last Name</Badge>}</td>
                        <td data-label="Sex">{student.sex && student.sex !== 'Incomplete' ? student.sex : <Badge bg="danger">No Sex</Badge>}</td>
                        <td data-label="Program">{student.program && student.program !== 'Incomplete' ? student.program : <Badge bg="danger">No Program</Badge>}</td>
                        <td data-label="Municipality">{student.municipality && student.municipality !== 'Incomplete' ? student.municipality : <Badge bg="danger">No Municipality</Badge>}</td>
                        <td data-label="Area Type">
                          <Badge bg={getAreaType(student.municipality) === 'Upland' ? 'success' : getAreaType(student.municipality) === 'Lowland' ? 'info' : 'secondary'}>
                            {getAreaType(student.municipality)}
                          </Badge>
                        </td>
                        <td data-label="Income">{student.income === -1 || student.income === null ? <Badge bg="danger">No Income Entered</Badge> : `₱${student.income.toLocaleString()}`}</td>
                        <td data-label="SHS Type">{student.SHS_type && student.SHS_type !== 'Incomplete' ? student.SHS_type : <Badge bg="danger">No SHS Type</Badge>}</td>
                        <td data-label="GWA">{student.GWA === -1 || student.GWA === null ? <Badge bg="danger">No GWA Entered</Badge> : student.GWA}</td>
                        <td data-label="Honors"><Badge bg={getHonorsBadgeVariant(student.Honors)}>{student.Honors && student.Honors !== 'Incomplete' ? student.Honors : 'No Honors'}</Badge></td>
                        <td data-label="Income Category" className="d-none d-md-table-cell"><Badge bg={getIncomeBadgeVariant(student.IncomeCategory)}>{student.IncomeCategory && student.IncomeCategory !== 'Incomplete' ? student.IncomeCategory : 'No Income Category'}</Badge></td>
                        <td data-label="Actions"><Button variant="outline-primary" size="sm" onClick={(e) => { e.stopPropagation(); handleEditClick(student); }}>Edit</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>

                {/* Pagination Controls */}
                <div className="d-flex flex-column align-items-center mt-3">
                  <div className="mb-2 text-muted">
                    Showing {Math.min(indexOfFirst + 1, filteredStudents.length)} - {Math.min(indexOfLast, filteredStudents.length)} of {filteredStudents.length} students
                    {filteredStudents.length > studentsPerPage && ` (Page ${currentPage} of ${totalPages})`}
                  </div>

                  {totalPages > 1 && (() => {
                    const pageChunkSize = 10
                    const currentChunk = Math.floor((currentPage - 1) / pageChunkSize)
                    const startPage = currentChunk * pageChunkSize + 1
                    const endPage = Math.min(startPage + pageChunkSize - 1, totalPages)

                    return (
                      <div className="d-flex gap-2 flex-wrap justify-content-center align-items-center">
                        <Button size="sm" variant="outline-success" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Prev</Button>
                        {startPage > 1 && (<Button size="sm" variant="outline-success" onClick={() => setCurrentPage(startPage - 1)}>&hellip;</Button>)}
                        {[...Array(endPage - startPage + 1)].map((_, i) => { const page = startPage + i; return (<Button key={page} size="sm" variant={currentPage === page ? 'success' : 'outline-success'} onClick={() => setCurrentPage(page)}>{page}</Button>); })}
                        {endPage < totalPages && (<Button size="sm" variant="outline-success" onClick={() => setCurrentPage(endPage + 1)}>Next</Button>)}
                        <Button size="sm" variant="outline-success" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Next Page</Button>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Edit Modal */}
          <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>Edit Student</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {selectedStudent && (
                <Form>
                  <Form.Group className="mb-3">
                    <Form.Label>First Name</Form.Label>
                    <Form.Control type="text" value={selectedStudent.firstname} onChange={(e) => setSelectedStudent({ ...selectedStudent, firstname: e.target.value })} />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Last Name</Form.Label>
                    <Form.Control type="text" value={selectedStudent.lastname} onChange={(e) => setSelectedStudent({ ...selectedStudent, lastname: e.target.value })} />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Sex</Form.Label>
                    <Form.Select value={selectedStudent.sex || ''} onChange={(e) => setSelectedStudent({ ...selectedStudent, sex: e.target.value as any })}>
                      <option value="">Select Sex</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Program</Form.Label>
                    <Form.Control type="text" value={selectedStudent.program} onChange={(e) => setSelectedStudent({ ...selectedStudent, program: e.target.value })} />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Municipality</Form.Label>
                    <Form.Control type="text" value={selectedStudent.municipality || ''} onChange={(e) => { const newMunicipality = e.target.value; const newAreaType = getAreaType(newMunicipality); setSelectedStudent({ ...selectedStudent, municipality: newMunicipality, areaType: newAreaType }); }} />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>SHS Type</Form.Label>
                    <Form.Select value={selectedStudent.SHS_type || ''} onChange={(e) => setSelectedStudent({ ...selectedStudent, SHS_type: e.target.value })}>
                      <option value="">Select SHS Type</option>
                      <option value="Public">Public</option>
                      <option value="Private">Private</option>
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Income</Form.Label>
                    <Form.Control type="number" value={selectedStudent.income} onChange={(e) => setSelectedStudent({ ...selectedStudent, income: parseFloat(e.target.value) })} />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>GWA</Form.Label>
                    <Form.Control type="number" value={selectedStudent.GWA} onChange={(e) => setSelectedStudent({ ...selectedStudent, GWA: parseFloat(e.target.value) })} />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Area Type (System Computed)</Form.Label>
                    <Form.Control type="text" value={selectedStudent.areaType || getAreaType(selectedStudent.municipality)} disabled />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Honors (System Computed)</Form.Label>
                    <Form.Control type="text" value={selectedStudent.Honors} disabled />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Income Category (System Computed)</Form.Label>
                    <Form.Control type="text" value={selectedStudent.IncomeCategory} disabled />
                  </Form.Group>
                </Form>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button variant="success" onClick={handleSave}>Save Changes</Button>
            </Modal.Footer>
          </Modal>
        </div>
      </div>
    </div>
  )
}

export default Students
