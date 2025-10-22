import { useState } from "react"
import { FileText } from 'lucide-react'
import { Button, Card, Row, Col, Alert, Spinner, Modal } from "react-bootstrap"
import { useAuth } from "../context/AuthContext"

function Reports() {
  const { API } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleExport = async (reportType: string, format: string) => {
    setLoading(true)
    setError("")
    try {
      const response = await API.get(`/reports/${reportType}?format=${format}`, {
        responseType: "blob",
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `${reportType}.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err: any) {
      console.error(err)
      setError("Failed to generate report. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const handlePreview = async (reportKey: string) => {
    setPreviewLoading(true)
    setPreviewHtml(null)
    try {
      const res = await API.get(`/reports/${reportKey}/preview`, { responseType: 'text' })
      setPreviewHtml(res.data)
      setPreviewOpen(true)
    } catch (err: any) {
      setPreviewHtml('<p class="text-danger">Failed to load preview.</p>')
      setPreviewOpen(true)
    } finally {
      setPreviewLoading(false)
    }
  }


  const reports = [
    {
      key: "dashboard_summary",
      title: "Dashboard Summary",
      description: "A complete overview of the dataset including charts, statistics, and the full student list.",
    },
    {
      key: "income_analysis",
      title: "Income Analysis",
      description: "Focuses on income levels and categories across students, with distributions and trends.",
    },
    {
      key: "honors_report",
      title: "Honors Report",
      description: "Highlights honors classifications alongside GWA scores, with summary statistics.",
    },
    {
      key: "municipality_report",
      title: "Municipality Report",
      description: "Breakdown of students by municipality, showing geographic distribution and trends.",
    },
    {
      key: "shs_report",
      title: "Senior High School Background",
      description: "Looks at students based on their Senior High School type (Public or Private), showing student counts and performance comparisons.",
    },
    {
      key: "cluster_analysis",
      title: "Cluster Analysis",
      description: "Exports official clusters (GWA vs. Income) with assigned groups and statistical insights.",
    },
  ]

  return (
    <div className="fade-in">
      <h2 className="fw-bold mb-4">Reports</h2>
     
      {error && <Alert variant="danger">{error}</Alert>}

      {loading && (
        <div className="d-flex justify-content-center my-3">
          <Spinner animation="border" variant="primary" />
        </div>
      )}

      <Row>
        {reports.map((report) => (
          <Col md={6} lg={4} key={report.key} className="mb-4">
            <Card className="h-100 shadow-sm">
              <Card.Body className="d-flex flex-column">
                <Card.Title className="fw-bold">{report.title}</Card.Title>
                <Card.Text className="flex-grow-1 text-muted">{report.description}</Card.Text>
                <div className="d-flex gap-2 mt-2">
                  <Button
                    variant="outline-primary"
                    onClick={() => handlePreview(report.key)}
                    disabled={loading || previewLoading}
                  >
                    Preview
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleExport(report.key, "pdf")}
                    disabled={loading}
                  >
                    Export PDF
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleExport(report.key, "csv")}
                    disabled={loading}
                  >
                    Export CSV
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ✅ Instructions */}
      <div className="mt-4 p-3 border rounded bg-light text-muted small">
        <p className="mb-1 fw-bold">How to Use:</p>
        <ul className="mb-0">
          <li><b>Dashboard Summary</b> → full analytics with charts, distributions, and complete student list.</li>
          <li><b>Other reports</b> → focused datasets with only relevant fields (e.g., income, honors, SHS type).</li>
          <li><b>PDF</b> → formatted report, ready to share. <b>CSV</b> → raw data for spreadsheets or further processing.</li>
        </ul>
      </div>
      {/* Preview Modal */}
      <Modal show={previewOpen} onHide={() => setPreviewOpen(false)} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>Report Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {previewLoading ? (
            <div className="d-flex justify-content-center py-4">
              <Spinner animation="border" />
            </div>
          ) : (
            <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
              {previewHtml ? (
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              ) : (
                <div className="text-muted">No preview available.</div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setPreviewOpen(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

export default Reports
