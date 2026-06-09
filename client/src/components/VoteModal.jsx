import { useState } from 'react'
import { voteQuestion } from '../utils/api'

export default function VoteModal({ question, onClose, onSuccess }) {
  const [side, setSide] = useState(null)
  const [content, setContent] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!side) {
      setError('请选择支持哪一边')
      return
    }
    if (!content.trim() || content.trim().length < 5) {
      setError('理由至少写5个字吧，真诚一点~')
      return
    }

    setSubmitting(true)
    try {
      const result = await voteQuestion(question.id, {
        side,
        content: content.trim(),
        author_name: authorName.trim() || '匿名用户'
      })
      onSuccess && onSuccess(result)
    } catch (err) {
      setError(err.response?.data?.error || '提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal vote-modal" onClick={e => e.stopPropagation()}>
        <h2>说出你的选择</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="vote-options">
            <div 
              className={`vote-option-card side-a ${side === 'A' ? 'selected' : ''}`}
              onClick={() => setSide('A')}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>👍</div>
              <div style={{ fontWeight: 'bold', color: '#be185d' }}>
                {question.option_a}
              </div>
            </div>
            <div 
              className={`vote-option-card side-b ${side === 'B' ? 'selected' : ''}`}
              onClick={() => setSide('B')}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>👍</div>
              <div style={{ fontWeight: 'bold', color: '#1d4ed8' }}>
                {question.option_b}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>你的理由 *</label>
            <textarea
              placeholder="写下你选择的理由，哪怕一句话也行..."
              value={content}
              onChange={e => setContent(e.target.value)}
              maxLength={500}
              rows={4}
            />
            <div style={{ textAlign: 'right', fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
              {content.length}/500
            </div>
          </div>

          <div className="form-group">
            <label>你的昵称（可选）</label>
            <input
              type="text"
              placeholder="不填则为匿名用户"
              value={authorName}
              onChange={e => setAuthorName(e.target.value)}
              maxLength={20}
            />
          </div>

          {error && (
            <div style={{ color: '#ef4444', marginBottom: 16, fontSize: 14 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button 
              type="button" 
              className="btn btn-outline"
              onClick={onClose}
              disabled={submitting}
            >
              取消
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? '提交中...' : '提交投票'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
