import { useEffect, useState } from 'react'
import { Table, Card, Spinner, Alert } from 'react-bootstrap'
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

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>
  if (error) return <Alert variant="danger" className="mt-4 text-center">{error}</Alert>

  return (
    <div className="container py-4">
      <Card>
        <Card.Header>
          <h5 className="mb-0 fw-bold">
            Activity Logs {user?.role === 'Admin' && <small className="text-muted"> (All Users)</small>}
          </h5>
        </Card.Header>
        <Card.Body className="p-0">
          {logs.length === 0 ? (
            <div className="text-center py-4 text-muted">No activity logs available.</div>
          ) : (
            <div className="table-responsive">
              <Table hover striped className="mb-0">
                <thead className="table-light">
                  <tr>
                    {user?.role === 'Admin' && <th>User</th>}
                    <th>Action</th>
                    <th>Details</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      {user?.role === 'Admin' && <td>{log.user_email || '-'}</td>}
                      <td>{log.action}</td>
                      <td>{log.details || '-'}</td>
                      <td>{new Date(log.created_at).toLocaleString()}</td>
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
