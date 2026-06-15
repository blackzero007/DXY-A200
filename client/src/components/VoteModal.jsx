import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { voteQuestion } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { getDraftByTypeAndKey, saveDraft, deleteDraftByTypeAndKey, formatDraftTime } from '../utils/draft'

export default function VoteModal({ question, myVote, onClose, onSuccess, initialDraft }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const DRAFT_TYPE = 'vote'
  const DRAFT_KEY = question?.id?.toString() || 'current'

  const isChangeVote = !!(myVote && myVote.voted)

  const [side, setSide] = useState(isChangeVote ? (myVote.side === 'A' ? 'B' : 'A') : null)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [showRestoreTip, setShowRestoreTip] = useState(false)
  const saveTimerRef = useRef(null)
  const formChangedRef = useRef(false)

  useEffect(() => {
    if (initialDraft) {
      setSide(initialDraft.data.side || null)
      setContent(initialDraft.data.content || '')
      setLastSavedAt(initialDraft.updated_at)
      formChangedRef.current = true
    } else if (question?.id) {
      const existingDraft = getDraftByTypeAndKey(DRAFT_TYPE, DRAFT_KEY)
      if (existingDraft) {
        setShowRestoreTip(true)
      }
    }
  }, [initialDraft, question?.id])

  const restoreDraft = () => {
    const draft = getDraftByTypeAndKey(DRAFT_TYPE, DRAFT_KEY)
    if (draft) {
      if (isChangeVote && draft.data.side === myVote.side) {
        setSide(myVote.side === 'A' ? 'B' : 'A')
      } else {
        setSide(draft.data.side || null)
      }
      setContent(draft.data.content || '')
      setLastSavedAt(draft.updated_at)
      formChangedRef.current = true
    }
    setShowRestoreTip(false)
  }

  const discardDraft = () => {
    setShowRestoreTip(false)
  }

  const scheduleSave = () => {
    formChangedRef.current = true
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    saveTimerRef.current = setTimeout(() => {
      doSaveDraft()
    }, 800)
  }

  const doSaveDraft = () => {
    if (!formChangedRef.current) return
    const hasContent = side || content.trim()
    if (!hasContent) return

    const saved = saveDraft({
      type: DRAFT_TYPE,
      key: initialDraft?.id || DRAFT_KEY,
      question_title: question?.title,
      question_option_a: question?.option_a,
      question_option_b: question?.option_b,
      data: {
        side,
        content
      }
    })
    setLastSavedAt(saved.updated_at)
  }

  useEffect(() => {
    scheduleSave()
  }, [side, content])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
      doSaveDraft()
    }
  }, [])

  const handleSideClick = (clickedSide) => {
    if (isChangeVote && clickedSide === myVote.side) {
      return
    }
    setSide(clickedSide)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!user) {
      alert('请先登录后再发表理由')
      navigate('/login')
      return
    }

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
        content: content.trim()
      })
      deleteDraftByTypeAndKey(DRAFT_TYPE, initialDraft?.id || DRAFT_KEY)
      onSuccess && onSuccess(result)
    } catch (err) {
      if (err.response?.status === 401) {
        alert('请先登录后再发表理由')
        navigate('/login')
      } else {
        setError(err.response?.data?.error || '提交失败，请重试')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal vote-modal" onClick={e => e.stopPropagation()}>
        <h2>{isChangeVote ? '改票 - 重新选择' : '说出你的选择'}</h2>

        {isChangeVote && (
          <div style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 16,
            fontSize: 13,
            color: '#92400e'
          }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              🔄 你当前支持{myVote.side === 'A' ? 'A方' : 'B方'}：
            </div>
            <div style={{ 
              background: '#fefce8', 
              padding: '8px 10px', 
              borderRadius: 6,
              color: '#78350f',
              fontSize: 13,
              lineHeight: 1.5
            }}>
              {myVote.reason.content}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: '#b45309' }}>
              改票后，原理由将保留并标记为「已改票」，票数将自动更新
            </div>
          </div>
        )}

        {showRestoreTip && (
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 16,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ color: '#0369a1' }}>
              📝 检测到未完成的草稿（{formatDraftTime(getDraftByTypeAndKey(DRAFT_TYPE, DRAFT_KEY)?.updated_at)}），是否恢复？
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={discardDraft}
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  cursor: 'pointer'
                }}
              >
                放弃
              </button>
              <button
                type="button"
                onClick={restoreDraft}
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  borderRadius: 6,
                  border: 'none',
                  background: '#0284c7',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                恢复
              </button>
            </div>
          </div>
        )}

        {lastSavedAt && (
          <div style={{
            fontSize: 12,
            color: '#6b7280',
            marginBottom: 12,
            textAlign: 'right'
          }}>
            ✅ 草稿已保存于 {formatDraftTime(lastSavedAt)}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="vote-options">
            <div 
              className={`vote-option-card side-a ${side === 'A' ? 'selected' : ''} ${isChangeVote && myVote.side === 'A' ? 'disabled-option' : ''}`}
              onClick={() => handleSideClick('A')}
              style={isChangeVote && myVote.side === 'A' ? { opacity: 0.5, cursor: 'not-allowed', position: 'relative' } : {}}
            >
              {isChangeVote && myVote.side === 'A' && (
                <div style={{ 
                  position: 'absolute', 
                  top: 8, 
                  right: 8, 
                  fontSize: 10, 
                  background: '#fbbf24', 
                  color: '#78350f',
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontWeight: 600
                }}>
                  当前
                </div>
              )}
              <div style={{ fontSize: 24, marginBottom: 8 }}>👍</div>
              <div style={{ fontWeight: 'bold', color: '#be185d' }}>
                {question.option_a}
              </div>
            </div>
            <div 
              className={`vote-option-card side-b ${side === 'B' ? 'selected' : ''} ${isChangeVote && myVote.side === 'B' ? 'disabled-option' : ''}`}
              onClick={() => handleSideClick('B')}
              style={isChangeVote && myVote.side === 'B' ? { opacity: 0.5, cursor: 'not-allowed', position: 'relative' } : {}}
            >
              {isChangeVote && myVote.side === 'B' && (
                <div style={{ 
                  position: 'absolute', 
                  top: 8, 
                  right: 8, 
                  fontSize: 10, 
                  background: '#fbbf24', 
                  color: '#78350f',
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontWeight: 600
                }}>
                  当前
                </div>
              )}
              <div style={{ fontSize: 24, marginBottom: 8 }}>👍</div>
              <div style={{ fontWeight: 'bold', color: '#1d4ed8' }}>
                {question.option_b}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>{isChangeVote ? '改票理由 *' : '你的理由 *'}</label>
            <textarea
              placeholder={isChangeVote ? '写下你改变选择的理由...' : '写下你选择的理由，哪怕一句话也行...'}
              value={content}
              onChange={e => setContent(e.target.value)}
              maxLength={500}
              rows={4}
            />
            <div className="char-count">
              {content.length}/500
            </div>
          </div>

          {user && (
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16, background: '#f9fafb', padding: '8px 12px', borderRadius: 8 }}>
              将以 <strong style={{ color: '#1f2937' }}>@{user.nickname}</strong> 的身份发表
            </div>
          )}

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
              {submitting ? '提交中...' : isChangeVote ? '确认改票' : '提交投票'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
