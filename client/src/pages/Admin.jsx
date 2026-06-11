import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getReports, updateReportStatus, deleteReport, getReportReasons } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'

const STATUS_LABELS = {
  pending: { label: '待处理', color: '#f59e0b' },
  processing: { label: '处理中', color: '#3b82f6' },
  resolved: { label: '已处理', color: '#10b981' },
  rejected: { label: '已驳回', color: '#6b7280' }
}

const TARGET_TYPE_LABELS = {
  reason: '理由',
  reply: '回复'
}

function formatTime(timestamp) {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}

function ReportItem({ report, reportReasons, onStatusChange, onDelete }) {
  const [showActions, setShowActions] = useState(false)
  const [processingNote, setProcessingNote] = useState('')
  const [updating, setUpdating] = useState(false)

  const reasonLabel = reportReasons.find(r => r.value === report.reason)?.label || report.reason

  const handleStatusChange = async (status) => {
    setUpdating(true)
    try {
      await updateReportStatus(report.id, {
        status,
        processing_note: processingNote.trim()
      })
      onStatusChange && onStatusChange()
      setShowActions(false)
      setProcessingNote('')
    } catch (err) {
      alert('操作失败：' + (err.response?.data?.error || err.message))
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('确定要删除这条举报记录吗？')) return
    try {
      await deleteReport(report.id)
      onDelete && onDelete(report.id)
    } catch (err) {
      alert('删除失败：' + (err.response?.data?.error || err.message))
    }
  }

  return (
    <div className="report-item">
      <div className="report-item-header">
        <div className="report-item-meta">
          <span className={`status-badge status-${report.status}`}>
            {STATUS_LABELS[report.status]?.label || report.status}
          </span>
          <span className="target-type-badge">
            {TARGET_TYPE_LABELS[report.target_type]}
          </span>
          <span className="report-reason-badge">
            {reasonLabel}
          </span>
        </div>
        <div className="report-item-time">
          {formatTime(report.created_at)}
        </div>
      </div>

      {report.question_title && (
        <div className="report-question-title">
          问题：{report.question_title}
        </div>
      )}

      <div className="report-target-content">
        <div className="report-target-author">
          <strong>@{report.target_author}</strong> 的{TARGET_TYPE_LABELS[report.target_type]}：
        </div>
        <div className="report-target-text">{report.target_content}</div>
      </div>

      {report.description && (
        <div className="report-description">
          <div className="report-description-label">举报说明：</div>
          <div className="report-description-text">{report.description}</div>
        </div>
      )}

      <div className="report-reporter">
        举报人：@{report.reporter_name}
      </div>

      {report.processed_at && (
        <div className="report-processed-info">
          处理人：@{report.processed_by} | 处理时间：{formatTime(report.processed_at)}
          {report.processing_note && (
            <div>处理备注：{report.processing_note}</div>
          )}
        </div>
      )}

      <div className="report-item-actions">
        {report.status !== 'resolved' && report.status !== 'rejected' && (
          <button 
            className="btn btn-outline btn-sm"
            onClick={() => setShowActions(!showActions)}
            disabled={updating}
          >
            {showActions ? '取消' : '处理举报'}
          </button>
        )}
        <button 
          className="btn btn-danger btn-sm"
          onClick={handleDelete}
          disabled={updating}
        >
          删除记录
        </button>
      </div>

      {showActions && (
        <div className="report-actions-panel">
          <div className="form-group">
            <label className="form-label">处理备注（可选）：</label>
            <textarea
              className="form-textarea"
              value={processingNote}
              onChange={e => setProcessingNote(e.target.value)}
              placeholder="输入处理备注..."
              rows={2}
            />
          </div>
          <div className="report-actions-buttons">
            <button 
              className="btn btn-warning btn-sm"
              onClick={() => handleStatusChange('processing')}
              disabled={updating}
            >
              标记处理中
            </button>
            <button 
              className="btn btn-success btn-sm"
              onClick={() => handleStatusChange('resolved')}
              disabled={updating}
            >
              处理并删除内容
            </button>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => handleStatusChange('rejected')}
              disabled={updating}
            >
              驳回举报
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Admin() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [reportReasons, setReportReasons] = useState([])
  const [loadingReports, setLoadingReports] = useState(false)
  const [currentStatus, setCurrentStatus] = useState('pending')
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusCounts, setStatusCounts] = useState({})
  const limit = 20

  useEffect(() => {
    if (loading) return
    if (!user) {
      navigate('/login')
      return
    }
    if (user.role !== 'admin') {
      alert('您没有管理员权限')
      navigate('/')
      return
    }
    loadReportReasons()
  }, [user, loading, navigate])

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadReports()
    }
  }, [user, currentStatus, currentPage])

  const loadReportReasons = async () => {
    try {
      const data = await getReportReasons()
      setReportReasons(data)
    } catch (err) {
      console.error('获取举报原因失败:', err)
    }
  }

  const loadReports = async () => {
    setLoadingReports(true)
    try {
      const data = await getReports({
        status: currentStatus,
        page: currentPage,
        limit
      })
      setReports(data.list)
      setTotal(data.total)
      setStatusCounts(data.status_counts)
    } catch (err) {
      console.error('获取举报列表失败:', err)
      if (err.response?.status === 403) {
        alert('您没有管理员权限')
        navigate('/')
      }
    } finally {
      setLoadingReports(false)
    }
  }

  const handleStatusChange = () => {
    loadReports()
  }

  const handleDelete = (reportId) => {
    setReports(prev => prev.filter(r => r.id !== reportId))
    setTotal(prev => prev - 1)
  }

  const tabs = [
    { value: 'pending', label: '待处理' },
    { value: 'processing', label: '处理中' },
    { value: 'resolved', label: '已处理' },
    { value: 'rejected', label: '已驳回' },
    { value: 'all', label: '全部' }
  ]

  const totalPages = Math.ceil(total / limit)

  if (loading || !user) {
    return <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>举报管理</h1>
      </div>

      <div className="status-tabs">
        {tabs.map(tab => (
          <button
            key={tab.value}
            className={`status-tab ${currentStatus === tab.value ? 'active' : ''}`}
            onClick={() => {
              setCurrentStatus(tab.value)
              setCurrentPage(1)
            }}
          >
            {tab.label}
            <span className="tab-count">
              {statusCounts[tab.value] || 0}
            </span>
          </button>
        ))}
      </div>

      {loadingReports ? (
        <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
      ) : reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
          暂无举报记录
        </div>
      ) : (
        <>
          <div className="report-list">
            {reports.map(report => (
              <ReportItem
                key={report.id}
                report={report}
                reportReasons={reportReasons}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                上一页
              </button>
              <span className="page-info">
                第 {currentPage} / {totalPages} 页，共 {total} 条
              </span>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
