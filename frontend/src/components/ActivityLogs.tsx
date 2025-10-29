import { useEffect, useState } from 'react'
import { Table, Card, Spinner, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap'
import { useAuth } from '../context/AuthContext'

function ActivityLogs() {
  const { user, API } = useAuth()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>
  if (error) return <Alert variant="danger" className="mt-4 text-center">{error}</Alert>

  return (
    <div className="container py-4">
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-success text-white">
          <h5 className="mb-0 fw-bold">
            Activity Logs {user?.role === 'Admin' && <small className="text-light opacity-75"> (All Users)</small>}
          </h5>
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
                  {logs.map((log) => (
                    <tr key={log.id}>
                      {user?.role === 'Admin' && (
                        <td className="fw-semibold text-success">{log.user_email || '-'}</td>
                      )}
                      <td>{log.action}</td>
                      <td className="text-truncate" style={{ maxWidth: '400px' }}>
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip>{log.details}</Tooltip>}
                        >
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
      </Card>
    </div>
  )
}

export default ActivityLogs
