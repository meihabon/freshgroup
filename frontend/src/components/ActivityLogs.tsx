import { useEffect, useState } from 'react'
import { Table, Card, Spinner, Alert, OverlayTrigger, Tooltip, Form, Button } from 'react-bootstrap'
import { useAuth } from '../context/AuthContext'

function ActivityLogs() {
  const { user, API } = useAuth()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage, setRecordsPerPage] = useState(10)

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await API.get('/activity-logs')
        setLogs(res.data)
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load logs')
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [API])

  const timeAgo = (dateStr: string) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
    if (diff < 60) return `${Math.floor(diff)}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return new Date(dateStr).toLocaleString()
  }

  // Pagination calculations
  const totalPages = Math.ceil(logs.length / recordsPerPage)
  const startIndex = (currentPage - 1) * recordsPerPage
  const currentLogs = logs.slice(startIndex, startIndex + recordsPerPage)

  const handleRecordsChange = (e: any) => {
    setRecordsPerPage(Number(e.target.value))
    setCurrentPage(1)
  }

  const handlePageChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentPage > 1) setCurrentPage(currentPage - 1)
    if (direction === 'next' && currentPage < totalPages) setCurrentPage(currentPage + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>
  if (error) return <Alert variant="danger" className="mt-4 text-center">{error}</Alert>

  return (
    <div className="container py-4">
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-success text-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0 fw-bold">
            Activity Logs {user?.role === 'Admin' && <small className="text-light opacity-75"> (All Users)</small>}
          </h5>
          <div>
            <Form.Select
              size="sm"
              value={recordsPerPage}
              onChange={handleRecordsChange}
              style={{ width: '120px', display: 'inline-block' }}
            >
              <option value={10}>Show 10</option>
              <option value={15}>Show 15</option>
              <option value={20}>Show 20</option>
            </Form.Select>
          </div>
        </Card.Header>

        <Card.Body className="p-0">
          {logs.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <Spinner animation="grow" variant="success" size="sm" className="me-2" />
              No activity logs available.
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover striped borderless className="mb-0 align-middle text-center">
                <thead className="table-light">
                  <tr>
                    {user?.role === 'Admin' && <th style={{ width: '20%' }}>User</th>}
                    <th style={{ width: '20%' }}>Action</th>
                    <th style={{ width: '40%' }}>Details</th>
                    <th style={{ width: '20%' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLogs.map((log) => (
                    <tr key={log.id}>
                      {user?.role === 'Admin' && (
                        <td className="fw-semibold text-success">{log.user_email || '-'}</td>
                      )}
                      <td>{log.action}</td>
                      <td className="text-truncate" style={{ maxWidth: '400px' }}>
                        <OverlayTrigger placement="top" overlay={<Tooltip>{log.details}</Tooltip>}>
                          <span>{log.details || '-'}</span>
                        </OverlayTrigger>
                      </td>
                      <td className="text-muted small">{timeAgo(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>

        {/* Pagination controls */}
        {logs.length > recordsPerPage && (
          <Card.Footer className="d-flex justify-content-between align-items-center">
            <Button
              variant="outline-success"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => handlePageChange('prev')}
            >
              ◀ Prev
            </Button>
            <span className="small text-muted">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline-success"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange('next')}
            >
              Next ▶
            </Button>
          </Card.Footer>
        )}
      </Card>
    </div>
  )
}

export default ActivityLogs
