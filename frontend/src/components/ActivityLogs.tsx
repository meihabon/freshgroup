import { useEffect, useState } from 'react'
import {
  Table,
  Card,
  Spinner,
  Alert,
  OverlayTrigger,
  Tooltip,
  Form,
  Button,
  Pagination
} from 'react-bootstrap'
import { useAuth } from '../context/AuthContext'
import { ArrowDown, ArrowUp, Calendar, Eye } from 'lucide-react'
import RecordViewModal from '../components/RecordViewModal' // ✅ import modal

function ActivityLogs() {
  const { user, API } = useAuth()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination + filters + sorting
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage, setRecordsPerPage] = useState(10)
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [selectedLog, setSelectedLog] = useState<any | null>(null)

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

  // ✅ Date only format
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Filters
  const filteredLogs = logs.filter((log) => {
    const logDate = new Date(log.created_at)
    const matchesSearch =
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      log.details?.toLowerCase().includes(search.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(search.toLowerCase())

    const matchesStart = startDate ? logDate >= new Date(startDate) : true
    const matchesEnd = endDate ? logDate <= new Date(endDate) : true

    return matchesSearch && matchesStart && matchesEnd
  })

  // Sorting
  const sortedLogs = [...filteredLogs].sort((a, b) => {
    const timeA = new Date(a.created_at).getTime()
    const timeB = new Date(b.created_at).getTime()
    return sortOrder === 'asc' ? timeA - timeB : timeB - timeA
  })

  // Pagination
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

  const openViewModal = (log: any) => {
    setSelectedLog(log)
    setShowModal(true)
  }

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>
  if (error) return <Alert variant="danger" className="mt-4 text-center">{error}</Alert>

  return (
    <div className="container py-4">
      <Card className="shadow border-0 rounded-4 overflow-hidden">
        {/* Header */}
        <Card.Header
          className="d-flex flex-wrap justify-content-between align-items-center gap-3 px-4 py-3"
          style={{
            background: 'linear-gradient(90deg, #28a745 0%, #20c997 100%)',
            color: '#fff'
          }}
        >
          <h5 className="mb-0 fw-semibold">
            Activity Logs
            {user?.role === 'Admin' && (
              <small className="text-light opacity-75 ms-1">(All Users)</small>
            )}
          </h5>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            <Form.Control
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="sm"
              style={{
                width: '180px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.3)',
                backgroundColor: 'rgba(255,255,255,0.15)',
                color: '#fff'
              }}
            />
            <Form.Select
              size="sm"
              value={recordsPerPage}
              onChange={handleRecordsChange}
              style={{
                width: '120px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255,255,255,0.15)',
                color: '#28a745',
                border: '1px solid rgba(255,255,255,0.3)'
              }}
            >
              <option value={10}>Show 10</option>
              <option value={15}>Show 15</option>
              <option value={20}>Show 20</option>
            </Form.Select>

            <Button
              size="sm"
              variant="light"
              onClick={toggleSortOrder}
              className="fw-semibold"
              style={{
                border: 'none',
                borderRadius: '8px',
                color: '#28a745',
                backgroundColor: '#fff'
              }}
            >
              {sortOrder === 'asc' ? (
                <>
                  <ArrowUp size={16} className="me-1" /> Oldest
                </>
              ) : (
                <>
                  <ArrowDown size={16} className="me-1" /> Newest
                </>
              )}
            </Button>
          </div>
        </Card.Header>

        {/* Date Filters */}
        <div className="px-4 py-3 bg-light border-bottom">
          <div className="d-flex flex-wrap align-items-center gap-3">
            <div className="d-flex align-items-center gap-2">
              <Calendar size={18} className="text-success" />
              <span className="fw-semibold text-muted small">Filter by Date:</span>
            </div>

            <Form.Control
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              size="sm"
              style={{ width: '170px' }}
            />
            <span className="text-muted">to</span>
            <Form.Control
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              size="sm"
              style={{ width: '170px' }}
            />

            {(startDate || endDate) && (
              <Button
                size="sm"
                variant="outline-success"
                onClick={() => {
                  setStartDate('')
                  setEndDate('')
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <Card.Body className="p-0 bg-white">
          {sortedLogs.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <Spinner animation="grow" variant="success" size="sm" className="me-2" />
              No activity logs found
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover borderless className="mb-0 align-middle text-center">
                <thead style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
                  <tr>
                    {user?.role === 'Admin' && <th>User</th>}
                    <th>Action</th>
                    <th>Details</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {currentLogs.map((log) => (
                    <tr key={log.id}>
                      {user?.role === 'Admin' && (
                        <td className="fw-semibold text-success">{log.user_email || '-'}</td>
                      )}
                      <td className="fw-semibold text-dark">{log.action}</td>
                      <td className="text-truncate text-secondary" style={{ maxWidth: '400px' }}>
                        <OverlayTrigger placement="top" overlay={<Tooltip>{log.details}</Tooltip>}>
                          <span>{log.details || '-'}</span>
                        </OverlayTrigger>
                      </td>
                      <td className="text-muted small">{formatDate(log.created_at)}</td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-success"
                          onClick={() => openViewModal(log)}
                        >
                          <Eye size={16} className="me-1" /> View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>

        {/* Pagination (same as before) */}
        {/* ... (keep your existing pagination here) ... */}
      </Card>

      {/* ✅ RecordViewModal Integration */}
      <RecordViewModal
        show={showModal}
        onHide={() => setShowModal(false)}
        title="Activity Log Details"
        fields={
          selectedLog
            ? [
                ...(user?.role === 'Admin'
                  ? [{ label: 'User', value: selectedLog.user_email || '-' }]
                  : []),
                { label: 'Action', value: selectedLog.action },
                { label: 'Details', value: selectedLog.details || '-' },
                { label: 'Date', value: formatDate(selectedLog.created_at) }
              ]
            : []
        }
      />
    </div>
  )
}

export default ActivityLogs
