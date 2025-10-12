import React, { useState, useEffect } from 'react'
import { 
  Row, Col, Card, Table, Button, Modal, Form, 
  Spinner, Alert, Badge, ProgressBar 
} from 'react-bootstrap'
import { Upload, Trash2, Eye, Database, Download } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Plot from 'react-plotly.js'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

interface Dataset {
  id: number
  filename: string
  uploaded_by_email: string
  upload_date: string
  student_count: number
  cluster_count: number
}

function DatasetHistory() {
  const { API } = useAuth()
  const { user } = useAuth()
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadLoading, setUploadLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [clusterCount, setClusterCount] = useState(3)
  const [previewRows, setPreviewRows] = useState<any[]>([])
  const [showPreview, setShowPreview] = useState(false)

  // Elbow preview state
  const [elbowLoading, setElbowLoading] = useState(false)
  const [elbowError, setElbowError] = useState('')
  const [wcss, setWcss] = useState<number[]>([])
  const [recommendedK, setRecommendedK] = useState<number | null>(null)

  useEffect(() => {
    if (user?.role === 'Admin') {
      fetchDatasets()
    }
  }, [user])

  const fetchDatasets = async () => {
    try {
      const response = await API.get('/datasets')
      setDatasets(response.data)
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch datasets')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.name.endsWith('.csv') || file.name.endsWith('.xlsx')) {
        setSelectedFile(file)
        setError('')
        previewElbow(file)
      } else {
        setError('Please select a CSV or Excel (.xlsx) file')
        setSelectedFile(null)
        setWcss([])
        setRecommendedK(null)
      }
    }
  }

  const previewElbow = async (file: File) => {
    setElbowLoading(true)
    setElbowError('')
    setWcss([])
    setRecommendedK(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await API.post('/datasets/elbow', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const data = response.data
      if (data && Array.isArray(data.wcss)) {
        setWcss(data.wcss)
      }
      if (data && data.recommended_k) {
        setRecommendedK(data.recommended_k)
        setClusterCount(data.recommended_k) // auto-select recommended
      }
    } catch (err: any) {
      setElbowError(err.response?.data?.detail || 'Failed to compute elbow preview')
    } finally {
      setElbowLoading(false)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first')
      return
    }

    if (clusterCount < 2 || clusterCount > 10) {
      setError('Number of clusters must be between 2 and 10')
      return
    }

    setUploadLoading(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('k', clusterCount.toString())

      const response = await API.post('/datasets/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      setSuccess(`Dataset uploaded successfully! Processed ${response.data.total_students} students into ${response.data.clusters} clusters.`)
      setShowUpload(false)
      setSelectedFile(null)
      setWcss([])
      setRecommendedK(null)
      fetchDatasets()
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to upload dataset')
    } finally {
      setUploadLoading(false)
    }
  }

  const handlePreview = async (id: number) => {
    try {
      const response = await API.get(`/datasets/${id}/preview`)
      setPreviewRows(response.data.rows || [])
      setShowPreview(true)
    } catch (error: any) {
      setError(error.response?.data?.detail || "Failed to preview dataset")
    }
  }

  const handleDownload = async (id: number) => {
    try {
      const response = await API.get(`/datasets/${id}/download`, { responseType: "blob" })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `dataset_${id}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error: any) {
      setError(error.response?.data?.detail || "Failed to download dataset")
    }
  }

  const deleteDataset = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this dataset? This action cannot be undone.')) {
      return
    }

    try {
      await API.delete(`/datasets/${id}`)
      setSuccess('Dataset deleted successfully')
      fetchDatasets()
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to delete dataset')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  // --- 📄 Download Dataset Template (CSV) ---
  const handleDownloadTemplateCSV = () => {
    const header = ["firstname", "lastname", "sex", "program", "municipality", "income", "SHS_type", "GWA"]
    const rows = [
      ["Juan", "Dela Cruz", "Male", "BSIT", "Tagudin", "15000", "Academic", "85"],
      ["Maria", "Santos", "Female", "BSBA", "Sta. Cruz", "8000", "TVL", "90"],
    ]
      
    const csvContent =
      [header, ...rows]
        .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
        .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "dataset_template.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // --- 📄 Download Dataset Template (Excel) ---
  const handleDownloadTemplateExcel = () => {
    const header = ["firstname", "lastname", "sex", "program", "municipality", "income", "SHS_type", "GWA"]
    const rows = [
      ["Juan", "Dela Cruz", "Male", "BSIT", "Tagudin", 15000, "Private", 85],
      ["Maria", "Santos", "Female", "BSBA", "Sta. Cruz", 8000, "Public", 90],
    ]

    const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dataset Template")

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
    const data = new Blob([excelBuffer], { type: "application/octet-stream" })
    saveAs(data, "dataset_template.xlsx")
  }

  if (user?.role !== 'Admin') {
    return (
      <Alert variant="warning">
        You don't have permission to access dataset management. Only Admins can manage datasets.
      </Alert>
    )
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    )
  }

  const elbowPlot = () => {
    if (!wcss || wcss.length === 0) return null
    const ks = Array.from({ length: wcss.length }, (_, i) => i + 2)
    return (
      <div>
        <Plot
          data={[
            {
              x: ks,
              y: wcss,
              type: 'scatter',
              mode: 'lines+markers',
              name: 'WCSS',
              hovertemplate: 'k=%{x}<br>WCSS=%{y:.2f}<extra></extra>'
            }
          ]}
          layout={{
            title: { text: 'Elbow Method (WCSS vs k)' },
            xaxis: { title: { text: 'k (number of clusters)' }, dtick: 1 },
            yaxis: { title: { text: 'WCSS (lower is better)' } },
            height: 250,
            margin: { t: 40, b: 40, l: 60, r: 20 },
            showlegend: false
          }}
          style={{ width: '100%' }}
        />

        {recommendedK && (
          <div className="mt-2 d-flex align-items-center gap-2">
            <Badge bg="info">K: {recommendedK}</Badge>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="fw-bold">Dataset History</h2>
        <Button variant="primary" onClick={() => setShowUpload(true)}>
          <Upload size={18} className="me-2" />
          Upload New Dataset
        </Button>
      </div>

      {/* 🔹 Distinct Template Download Section */}
      <div className="mb-4">
        <h6 className="fw-bold mb-2">Download Dataset Template:</h6>
        <div className="d-flex gap-2">
          <Button variant="success" onClick={handleDownloadTemplateCSV}>
            <Download size={16} className="me-2" /> CSV Template
          </Button>
          <Button variant="outline-success" onClick={handleDownloadTemplateExcel}>
            <Download size={16} className="me-2" /> Excel Template
          </Button>
        </div>
        <small className="text-muted">
          Use this template to prepare your dataset before uploading. Columns must include: 
          <code> firstname, lastname, sex, program, municipality, income, SHS_type, GWA </code>.
        </small>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* Dataset Overview Cards */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <Database size={40} className="text-primary mb-2" />
              <h4 className="fw-bold">{datasets.length}</h4>
              <p className="text-muted mb-0">Total Datasets</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <Eye size={40} className="text-success mb-2" />
              <h4 className="fw-bold">
                {datasets.reduce((sum, d) => sum + (d.student_count || 0), 0).toLocaleString()}
              </h4>
              <p className="text-muted mb-0">Total Students</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <Upload size={40} className="text-info mb-2" />
              <h4 className="fw-bold">
                {datasets.length > 0 ? formatDate(datasets[0].upload_date).split(',')[0] : 'N/A'}
              </h4>
              <p className="text-muted mb-0">Latest Upload</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Datasets Table */}
      <Card>
        <Card.Header>
          <h6 className="mb-0 fw-bold">Dataset History</h6>
        </Card.Header>
        <Card.Body className="p-0">
          {datasets.length === 0 ? (
            <div className="text-center py-5">
              <Database size={48} className="text-muted mb-3" />
              <h5 className="text-muted">No datasets uploaded yet</h5>
              <p className="text-muted">Upload your first dataset to get started with student profiling and clustering.</p>
              <Button variant="primary" onClick={() => setShowUpload(true)}>
                <Upload size={18} className="me-2" />
                Upload Dataset
              </Button>
            </div>
          ) : (
            <div className="table-responsive">
              <Table striped hover className="mb-0">
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Uploaded By</th>
                    <th>Upload Date</th>
                    <th>Students</th>
                    <th>Clusters</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {datasets.map((dataset, index) => (
                    <tr key={dataset.id}>
                      <td className="fw-semibold">{dataset.filename}</td>
                      <td>{dataset.uploaded_by_email}</td>
                      <td>{formatDate(dataset.upload_date)}</td>
                      <td>
                        <Badge bg="info">{dataset.student_count?.toLocaleString() || 'N/A'}</Badge>
                      </td>
                      <td>
                        <Badge bg="success">{dataset.cluster_count || 'N/A'}</Badge>
                      </td>
                      <td>
                        {index === 0 ? (
                          <Badge bg="primary">Active</Badge>
                        ) : (
                          <Badge bg="secondary">Archived</Badge>
                        )}
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button variant="outline-info" size="sm" onClick={() => handlePreview(dataset.id)}>
                            <Eye size={14} />
                          </Button>
                          <Button variant="outline-success" size="sm" onClick={() => handleDownload(dataset.id)}>
                            <Download size={14} />
                          </Button>
                          <Button variant="outline-danger" size="sm" onClick={() => deleteDataset(dataset.id)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Upload Modal */}
      <Modal show={showUpload} onHide={() => setShowUpload(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Upload New Dataset</Modal.Title>
        </Modal.Header>
          <Modal.Body>
            <Form>
              <Row>
                {/* Left side: Bigger Elbow Preview */}
                <Col md={7}>
                  <Card>
                    <Card.Header>
                      <strong>Elbow Method Preview</strong>
                    </Card.Header>
                    <Card.Body style={{ minHeight: 320 }}>
                      {elbowLoading ? (
                        <div className="d-flex justify-content-center align-items-center" style={{ height: 280 }}>
                          <Spinner animation="border" />
                        </div>
                      ) : elbowError ? (
                        <Alert variant="danger">{elbowError}</Alert>
                      ) : wcss && wcss.length > 0 ? (
                        elbowPlot()
                      ) : (
                        <div className="text-muted">
                          Select a CSV/XLSX file to compute an Elbow preview (k=2..10).  
                          The system will automatically choose the most suitable k.
                        </div>
                      )}
                    </Card.Body>
                  </Card>

                  {/* Justification */}
                  <div className="mt-3 p-3 bg-light rounded border">
                    <h6 className="fw-bold">Why the Elbow Method?</h6>
                    <p style={{ fontSize: "0.9rem" }}>
                      The <b>Elbow Method</b> is a technique to determine the optimal number of clusters (k) in a dataset.  
                      It works by plotting the <b>Within-Cluster Sum of Squares (WCSS)</b> for different values of k.  
                      At first, adding more clusters reduces WCSS sharply, but after a certain point, the improvements become minimal.  
                      This point looks like an “elbow” on the chart and usually indicates the most suitable k.  
                      Our system automatically selects this value for you.
                    </p>
                  </div>
                </Col>

                {/* Right side: File Upload + System K */}
                <Col md={5}>
                  <Form.Group className="mb-3">
                    <Form.Label>Select Dataset File</Form.Label>
                    <Form.Control type="file" accept=".csv,.xlsx" onChange={handleFileSelect} />
                      <Form.Text className="text-muted">
                        Supported formats: CSV, Excel (.xlsx). File must include: 
                        firstname, lastname, sex, program, municipality, income, SHS_type, GWA
                      </Form.Text>
                  </Form.Group>

                  {selectedFile && (
                    <div className="mb-3">
                      <small className="text-success">
                        Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </small>
                    </div>
                  )}

                  <Form.Group className="mb-3">
                    <Form.Label>Number of Clusters (K)</Form.Label>
                    <Form.Control
                      type="number"
                      value={clusterCount}
                      readOnly
                    />
                    <Form.Text className="text-muted">
                      The system has determined this optimal value automatically.
                    </Form.Text>
                  </Form.Group>

                  {uploadLoading && (
                    <div className="mb-3">
                      <ProgressBar animated now={100} label="Processing..." />
                    </div>
                  )}
                </Col>
              </Row>
            </Form>
          </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUpload(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleUpload} disabled={!selectedFile || uploadLoading}>
            {uploadLoading ? (
              <>
                <Spinner size="sm" className="me-2" /> Processing...
              </>
            ) : (
              <>
                <Upload size={16} className="me-2" /> Upload & Process
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showPreview} onHide={() => setShowPreview(false)} size="xl" centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="fw-bold">Dataset Preview</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {previewRows.length > 0 ? (
            <div className="table-responsive position-relative">
              <Table striped bordered hover size="sm" className="align-middle mb-0">
                <thead className="table-dark">
                  <tr>
                    {Object.keys(previewRows[0]).map((col) => (
                      <th key={col} className="text-center">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, idx) => {
                    // Fade rows after index 6
                    let opacity = 1;
                    if (idx >= 7) {
                      const fadeFactor = (idx - 7) / (previewRows.length - 7);
                      opacity = Math.max(1 - fadeFactor * 0.8, 0.2);
                    }

                    return (
                      <tr
                        key={idx}
                        style={{
                          opacity,
                          transition: "opacity 0.6s ease"
                        }}
                      >
                        {Object.values(row).map((val, i) => (
                          <td key={i} className="text-center">
                            {val !== null && val !== undefined ? val.toString() : "—"}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </Table>

              {/* 🔹 Gradient overlay if preview is capped at 15 */}
              {previewRows.length === 15 && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "40px",
                    background:
                      "linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,1))"
                  }}
                />
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted mb-0">No data available for preview.</p>
            </div>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPreview(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>


    </div>
  )
}

export default DatasetHistory
