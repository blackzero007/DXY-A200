import { useState, useEffect } from 'react'
import { getReportReasons, createReport } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'

export default function ReportModal({ isOpen, onClose, targetType, targetId, targetContent }) {
  const { user } = useAuth()
  const [reportReasons, setReportReasons] = useState([])
  const [selectedReason, setSelectedReason] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadReportReasons()
    }
  }, [isOpen])

  const loadReportReasons = async () => {
    setLoading(true)
    try {
      const data = await getReportReasons()
      setReportReasons(data)
    } catch (err) {
      console.error('获取举报原因失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedReason) return
    if (!user) {
      alert('请先登录后再举报')
      onClose()
      return
    }

    setSubmitting(true)
    try {
      await createReport({
        target_type: targetType,
        target_id: targetId,
        reason: selectedReason,
        description: description.trim()
      })
      alert('举报提交成功，我们会尽快处理')
      onClose()
      setSelectedReason('')
      setDescription('')
    } catch (err) {
      alert('举报失败：' + (err.response?.data?.error || err.message))
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedReason('')
    setDescription('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content report-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>举报内容</h3>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          {targetContent && (
            <div className="report-target-content">
              <div className="report-target-label">举报内容：</div>
              <div className="report-target-text">{targetContent}</div>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>加载中...</div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">请选择举报原因：</label>
                <div className="report-reasons-list">
                  {reportReasons.map(reason => (
                    <label key={reason.value} className="report-reason-item">
                      <input
                        type="radio"
                        name="reportReason"
                        value={reason.value}
                        checked={selectedReason === reason.value}
                        onChange={e => setSelectedReason(e.target.value)}
                      />
                      <span className="report-reason-label">{reason.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">补充说明（可选）：</label>
                <textarea
                  className="form-textarea"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="请详细描述违规内容..."
                  rows={3}
                  maxLength={500}
                />
                <div className="char-count">{description.length}/500</div>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={handleClose}
                  disabled={submitting}
                >
                  取消
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submitting || !selectedReason}
                >
                  {submitting ? '提交中...' : '提交举报'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
