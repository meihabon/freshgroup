import React, { useState } from "react"
import { Button, Card, Row, Col, Alert, Spinner } from "react-bootstrap"
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
      description: "Looks at SHS strands (STEM, ABM, HUMSS, TVL) with student counts and performance comparisons.",
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

      {/* ✅ Introductory explanation */}
      <div className="mb-4 p-3 border rounded bg-light text-muted">
        <h6 className="fw-bold mb-2">ℹ️ About Reports</h6>
        <p className="mb-0">
          Reports let you export data-driven insights from the system. 
          Use <strong>PDF</strong> for polished documents with charts and tables, 
          or <strong>CSV</strong> if you need raw data for further analysis in Excel, Python, or R. 
          Each report highlights a different aspect of the dataset to support decision-making and policy planning.
        </p>
      </div>

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
    </div>
  )
}

export default Reports
