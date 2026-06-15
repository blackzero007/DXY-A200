import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { createQuestion, CATEGORIES } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { getDraftByTypeAndKey, saveDraft, deleteDraftByTypeAndKey, formatDraftTime } from '../utils/draft'

const DRAFT_TYPE = 'question'
const DRAFT_KEY = 'new'

function PreviewQuestionCard({ title, optionA, optionB, description, category, authorName }) {
  const percentA = 50
  const percentB = 50

  const descriptionSnippet = description
    ? description.length > 80
      ? description.slice(0, 80) + '...'
      : description
    : null

  return (
    <div className="card question-card preview-card">
      <div className="preview-label">📋 列表页预览</div>
      <div className="question-category-tag">{category || '职场'}</div>
      <h3>{title}</h3>
      {description && (
        <p className="question-description">{description}</p>
      )}
      <div className="question-options">
        <div className="option-tag side-a">{optionA}</div>
        <div className="option-tag side-b">{optionB}</div>
      </div>
      <div className="vote-bar-container">
        <div className="vote-bar-a" style={{ width: `${percentA}%` }}></div>
        <div className="vote-bar-b" style={{ width: `${percentB}%` }}></div>
      </div>
      <div className="question-meta">
        <span className="user-nickname-link">@{authorName}</span>
        <div className="vote-stats">
          <span>0 人投票</span>
          <span>刚刚</span>
        </div>
      </div>
      <div className="question-card-tooltip preview-tooltip">
        {descriptionSnippet && (
          <div className="tooltip-description">{descriptionSnippet}</div>
        )}
        <div className="tooltip-vote-compare">
          <div className="tooltip-vote-side tooltip-vote-a">
            <span className="tooltip-vote-label">{optionA}</span>
            <span className="tooltip-vote-count">0 票</span>
            <div className="tooltip-vote-bar">
              <div className="tooltip-vote-bar-fill side-a" style={{ width: '50%' }}></div>
            </div>
          </div>
          <div className="tooltip-vote-divider">VS</div>
          <div className="tooltip-vote-side tooltip-vote-b">
            <span className="tooltip-vote-label">{optionB}</span>
            <span className="tooltip-vote-count">0 票</span>
            <div className="tooltip-vote-bar">
              <div className="tooltip-vote-bar-fill side-b" style={{ width: '50%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewQuestionDetail({ title, optionA, optionB, description, category, authorName }) {
  const percentA = 50
  const percentB = 50

  return (
    <div className="card preview-detail-card">
      <div className="preview-label">📄 详情页预览</div>
      <div className="question-detail-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div className="question-category-tag large">{category || '职场'}</div>
          <button className="favorite-btn" disabled>
            ☆ 收藏
          </button>
        </div>
        <h2>{title}</h2>
        {description && (
          <p className="description">{description}</p>
        )}
        <p style={{ color: '#6b7280', fontSize: 14 }}>
          由{' '}
          <span className="user-nickname-link" style={{ cursor: 'pointer' }}>
            @{authorName}
          </span>{' '}
          发布
        </p>
      </div>

      <div className="vote-bar-container">
        <div className="vote-bar-a" style={{ width: `${percentA}%` }}></div>
        <div className="vote-bar-b" style={{ width: `${percentB}%` }}></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <span style={{ color: '#be185d', fontWeight: 'bold' }}>
          {optionA}: 0 票 ({percentA.toFixed(1)}%)
        </span>
        <span style={{ color: '#1d4ed8', fontWeight: 'bold' }}>
          {optionB}: 0 票 ({percentB.toFixed(1)}%)
        </span>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button className="btn btn-primary" style={{ fontSize: 16, padding: '14px 40px' }} disabled>
          我要投票（必须写理由）
        </button>
      </div>

      <div className="vote-sides-container preview-vote-sides">
        <div className="side-column">
          <div className="side-header side-a">
            <div className="vote-count">0</div>
            <div>{optionA}</div>
          </div>
          <div className="card empty-state" style={{ padding: '20px' }}>
            <p>暂无理由</p>
          </div>
        </div>

        <div className="vs-center">VS</div>

        <div className="side-column">
          <div className="side-header side-b">
            <div className="vote-count">0</div>
            <div>{optionB}</div>
          </div>
          <div className="card empty-state" style={{ padding: '20px' }}>
            <p>暂无理由</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CreateQuestionModal({ onClose, onSuccess, initialDraft }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('form')
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

  const validateForm = () => {
    setError('')

    if (!user) {
      alert('请先登录后再发布问题')
      navigate('/login')
      return false
    }

    if (!title.trim()) {
      setError('请输入问题标题')
      return false
    }
    if (!optionA.trim() || !optionB.trim()) {
      setError('请输入两个选项')
      return false
    }
    if (optionA.trim() === optionB.trim()) {
      setError('两个选项不能相同')
      return false
    }

    return true
  }

  const handleGoToPreview = (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setStep('preview')
  }

  const handleBackToEdit = () => {
    setStep('form')
  }

  const handleSubmit = async () => {
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
        setStep('form')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const authorName = user?.nickname || '匿名用户'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${step === 'preview' ? 'preview-modal' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="step-indicator">
          <div className={`step-item ${step === 'form' ? 'active' : ''} ${step === 'preview' ? 'done' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-text">编辑内容</span>
          </div>
          <div className="step-line"></div>
          <div className={`step-item ${step === 'preview' ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-text">预览确认</span>
          </div>
        </div>

        <h2>{step === 'form' ? '发布两难问题' : '预览并确认发布'}</h2>

        {step === 'form' && showRestoreTip && (
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

        {lastSavedAt && step === 'form' && (
          <div style={{
            fontSize: 12,
            color: '#6b7280',
            marginBottom: 12,
            textAlign: 'right'
          }}>
            ✅ 草稿已保存于 {formatDraftTime(lastSavedAt)}
          </div>
        )}

        {step === 'form' && (
          <form onSubmit={handleGoToPreview}>
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
              >
                取消
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                下一步：预览 →
              </button>
            </div>
          </form>
        )}

        {step === 'preview' && (
          <div className="preview-container">
            <div className="preview-tip">
              👀 请仔细预览你的问题在列表页和详情页的展示效果，确认无误后点击「确认发布」。
            </div>

            <PreviewQuestionCard
              title={title.trim()}
              optionA={optionA.trim()}
              optionB={optionB.trim()}
              description={description.trim()}
              category={category}
              authorName={authorName}
            />

            <PreviewQuestionDetail
              title={title.trim()}
              optionA={optionA.trim()}
              optionB={optionB.trim()}
              description={description.trim()}
              category={category}
              authorName={authorName}
            />

            {error && (
              <div style={{ color: '#ef4444', marginBottom: 16, fontSize: 14 }}>
                {error}
              </div>
            )}

            <div className="preview-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleBackToEdit}
                disabled={submitting}
              >
                ← 返回修改
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? '发布中...' : '✓ 确认发布'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
