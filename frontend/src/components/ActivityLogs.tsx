import { useEffect, useState } from 'react'
import { Table, Card, Spinner, Alert, OverlayTrigger, Tooltip, Form, Button, Pagination } from 'react-bootstrap'
import { useAuth } from '../context/AuthContext'
import { ArrowDown, ArrowUp } from 'lucide-react'

function ActivityLogs() {
  const { user, API } = useAuth()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters + pagination + sorting
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage, setRecordsPerPage] = useState(10)
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

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

  // ✅ Filtering
  const filteredLogs = logs.filter(
    (log) =>
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      log.details?.toLowerCase().includes(search.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(search.toLowerCase())
  )

  // ✅ Sorting by date
  const sortedLogs = [...filteredLogs].sort((a, b) => {
    const timeA = new Date(a.created_at).getTime()
    const timeB = new Date(b.created_at).getTime()
    return sortOrder === 'asc' ? timeA - timeB : timeB - timeA
  })

  // ✅ Pagination
  const totalPages = Math.ceil(sortedLogs.length / recordsPerPage)
  const startIndex = (currentPage - 1) * recordsPerPage
  const currentLogs = sortedLogs.slice(startIndex, startIndex + recordsPerPage)

  const handleRecordsChange = (e: any) => {
    setRecordsPerPage(Number(e.target.value))
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleSortOrder = () => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>
  if (error) return <Alert variant="danger" className="mt-4 text-center">{error}</Alert>

  return (
    <div className="container py-4">
      <Card className="shadow-lg border-0 rounded-4 overflow-hidden">
        <Card.Header className="bg-gradient d-flex flex-wrap justify-content-between align-items-center gap-3"
          style={{ background: 'linear-gradient(90deg, #28a745, #20c997)', color: '#fff' }}
        >
          <h5 className="mb-0 fw-bold">
            Activity Logs{' '}
            {user?.role === 'Admin' && (
              <small className="text-light opacity-75"> (All Users)</small>
            )}
          </h5>

          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* Search */}
            <Form.Control
              type="text"
              placeholder="🔍 Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="sm"
              className="shadow-sm"
              style={{ width: '180px', borderRadius: '8px' }}
            />

            {/* Show count */}
            <Form.Select
              size="sm"
              value={recordsPerPage}
              onChange={handleRecordsChange}
              className="shadow-sm"
              style={{ width: '120px', borderRadius: '8px' }}
            >
              <option value={10}>Show 10</option>
              <option value={15}>Show 15</option>
              <option value={20}>Show 20</option>
            </Form.Select>

            {/* Sort button */}
            <Button
              size="sm"
              variant="light"
              onClick={toggleSortOrder}
              className="d-flex align-items-center gap-1 fw-semibold shadow-sm"
              style={{ borderRadius: '8px', color: '#28a745' }}
            >
              {sortOrder === 'asc' ? (
                <>
                  <ArrowUp size={16} /> Oldest First
                </>
              ) : (
                <>
                  <ArrowDown size={16} /> Newest First
                </>
              )}
            </Button>
          </div>
        </Card.Header>

        <Card.Body className="p-0 bg-white">
          {sortedLogs.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <Spinner animation="grow" variant="success" size="sm" className="me-2" />
              No activity logs available.
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover borderless className="mb-0 align-middle text-center">
                <thead className="table-success" style={{ backgroundColor: '#d1f2eb' }}>
                  <tr>
                    {user?.role === 'Admin' && <th style={{ width: '20%' }}>User</th>}
                    <th style={{ width: '20%' }}>Action</th>
                    <th style={{ width: '40%' }}>Details</th>
                    <th style={{ width: '20%' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLogs.map((log) => (
                    <tr key={log.id} className="table-row-hover">
                      {user?.role === 'Admin' && (
                        <td className="fw-semibold text-success">{log.user_email || '-'}</td>
                      )}
                      <td className="fw-semibold">{log.action}</td>
                      <td className="text-truncate text-secondary" style={{ maxWidth: '400px' }}>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <Card.Footer className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <span className="small text-muted">
              Showing {startIndex + 1}–{Math.min(startIndex + recordsPerPage, sortedLogs.length)} of{' '}
              {sortedLogs.length} logs
            </span>

            <Pagination className="mb-0">
              <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
              <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
                .map((page) => (
                  <Pagination.Item
                    key={page}
                    active={page === currentPage}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </Pagination.Item>
                ))}

              <Pagination.Next
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              />
              <Pagination.Last
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
              />
            </Pagination>
          </Card.Footer>
        )}
      </Card>

      <style>
        {`
          .table-row-hover:hover {
            background-color: #f1fdf3 !important;
            transition: background-color 0.2s ease;
          }
          .bg-gradient {
            background: linear-gradient(90deg, #28a745, #20c997);
          }
        `}
      </style>
    </div>
  )
}

export default ActivityLogs
