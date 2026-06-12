import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { createQuestion, CATEGORIES } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { getDraftByTypeAndKey, saveDraft, deleteDraftByTypeAndKey, formatDraftTime } from '../utils/draft'

const DRAFT_TYPE = 'question'
const DRAFT_KEY = 'new'

export default function CreateQuestionModal({ onClose, onSuccess, initialDraft }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [optionA, setOptionA] = useState('')
  const [optionB, setOptionB] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [showRestoreTip, setShowRestoreTip] = useState(false)
  const saveTimerRef = useRef(null)
  const formChangedRef = useRef(false)

  useEffect(() => {
    if (initialDraft) {
      setTitle(initialDraft.data.title || '')
      setOptionA(initialDraft.data.optionA || '')
      setOptionB(initialDraft.data.optionB || '')
      setDescription(initialDraft.data.description || '')
      setCategory(initialDraft.data.category || CATEGORIES[0])
      setLastSavedAt(initialDraft.updated_at)
      formChangedRef.current = true
    } else {
      const existingDraft = getDraftByTypeAndKey(DRAFT_TYPE, DRAFT_KEY)
      if (existingDraft) {
        setShowRestoreTip(true)
      }
    }
  }, [initialDraft])

  const restoreDraft = () => {
    const draft = getDraftByTypeAndKey(DRAFT_TYPE, DRAFT_KEY)
    if (draft) {
      setTitle(draft.data.title || '')
      setOptionA(draft.data.optionA || '')
      setOptionB(draft.data.optionB || '')
      setDescription(draft.data.description || '')
      setCategory(draft.data.category || CATEGORIES[0])
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
    const hasContent = title.trim() || optionA.trim() || optionB.trim() || description.trim()
    if (!hasContent) return

    const saved = saveDraft({
      type: DRAFT_TYPE,
      key: initialDraft?.id || DRAFT_KEY,
      data: {
        title,
        optionA,
        optionB,
        description,
        category
      }
    })
    setLastSavedAt(saved.updated_at)
  }

  useEffect(() => {
    scheduleSave()
  }, [title, optionA, optionB, description, category])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
      doSaveDraft()
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!user) {
      alert('请先登录后再发布问题')
      navigate('/login')
      return
    }

    if (!title.trim()) {
      setError('请输入问题标题')
      return
    }
    if (!optionA.trim() || !optionB.trim()) {
      setError('请输入两个选项')
      return
    }
    if (optionA.trim() === optionB.trim()) {
      setError('两个选项不能相同')
      return
    }

    setSubmitting(true)
    try {
      const result = await createQuestion({
        title: title.trim(),
        option_a: optionA.trim(),
        option_b: optionB.trim(),
        description: description.trim() || null,
        category
      })
      deleteDraftByTypeAndKey(DRAFT_TYPE, initialDraft?.id || DRAFT_KEY)
      onSuccess && onSuccess(result)
    } catch (err) {
      if (err.response?.status === 401) {
        alert('请先登录后再发布问题')
        navigate('/login')
      } else {
        setError(err.response?.data?.error || '发布失败，请重试')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>发布两难问题</h2>

        {showRestoreTip && (
          <div className="draft-restore-tip" style={{
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
          <div className="form-group">
            <label>问题标题 *</label>
            <input
              type="text"
              placeholder="比如：留在大城市还是回老家？"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label>选项A *</label>
            <input
              type="text"
              placeholder="第一个选项"
              value={optionA}
              onChange={e => setOptionA(e.target.value)}
              maxLength={30}
            />
          </div>

          <div className="vs-divider">VS</div>

          <div className="form-group">
            <label>选项B *</label>
            <input
              type="text"
              placeholder="第二个选项"
              value={optionB}
              onChange={e => setOptionB(e.target.value)}
              maxLength={30}
            />
          </div>

          <div className="form-group">
            <label>详细描述（可选）</label>
            <textarea
              placeholder="补充一下背景信息，让大家更好地给建议..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="form-group">
            <label>分类标签 *</label>
            <div className="category-selector">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`category-tag ${category === cat ? 'active' : ''}`}
                  onClick={() => setCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {user && (
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16, background: '#f9fafb', padding: '8px 12px', borderRadius: 8 }}>
              将以 <strong style={{ color: '#1f2937' }}>@{user.nickname}</strong> 的身份发布
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
              {submitting ? '发布中...' : '发布问题'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
