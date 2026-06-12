import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import CreateQuestionModal from '../components/CreateQuestionModal.jsx'
import VoteModal from '../components/VoteModal.jsx'
import { getAllDrafts, deleteDraft, formatDraftTime, getDraftById } from '../utils/draft'

export default function DraftList() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [drafts, setDrafts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [showVoteModal, setShowVoteModal] = useState(false)
  const [currentDraft, setCurrentDraft] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const loadDrafts = () => {
    const allDrafts = getAllDrafts()
    setDrafts(allDrafts)
    setLoading(false)
  }

  useEffect(() => {
    loadDrafts()
  }, [])

  const handleDeleteDraft = (id) => {
    deleteDraft(id)
    setDeleteConfirm(null)
    loadDrafts()
  }

  const handleEditQuestionDraft = (draft) => {
    setCurrentDraft(draft)
    setShowQuestionModal(true)
  }

  const handleEditVoteDraft = (draft) => {
    setCurrentDraft(draft)
    setShowVoteModal(true)
  }

  const handleModalClose = () => {
    setShowQuestionModal(false)
    setShowVoteModal(false)
    setCurrentDraft(null)
    loadDrafts()
  }

  const handleQuestionSuccess = () => {
    handleModalClose()
  }

  const handleVoteSuccess = () => {
    handleModalClose()
  }

  const renderQuestionDraftCard = (draft) => {
    const data = draft.data || {}
    return (
      <div key={draft.id} className="card question-card">
        <div className="question-category-tag" style={{ background: '#fef3c7', color: '#92400e' }}>
          📝 问题草稿
        </div>
        <h3 style={{ minHeight: 28 }}>
          {data.title || <span style={{ color: '#9ca3af', fontSize: 14, fontWeight: 'normal' }}>（未填写标题）</span>}
        </h3>
        {data.description && (
          <p className="question-description">{data.description}</p>
        )}
        {(data.optionA || data.optionB) && (
          <div className="question-options">
            <div className="option-tag side-a">{data.optionA || '选项A'}</div>
            <div className="option-tag side-b">{data.optionB || '选项B'}</div>
          </div>
        )}
        <div className="question-meta" style={{ marginTop: 16 }}>
          <span style={{ color: '#6b7280', fontSize: 13 }}>
            创建于 {formatDraftTime(draft.created_at)} · 更新于 {formatDraftTime(draft.updated_at)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1, fontSize: 13, padding: '8px 12px' }}
            onClick={() => handleEditQuestionDraft(draft)}
          >
            ✏️ 继续编辑
          </button>
          {deleteConfirm === draft.id ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                className="btn btn-primary"
                style={{ fontSize: 12, padding: '8px 10px', background: '#ef4444' }}
                onClick={() => handleDeleteDraft(draft.id)}
              >
                确认
              </button>
              <button
                className="btn btn-outline"
                style={{ fontSize: 12, padding: '8px 10px' }}
                onClick={() => setDeleteConfirm(null)}
              >
                取消
              </button>
            </div>
          ) : (
            <button
              className="btn btn-outline"
              style={{ fontSize: 13, padding: '8px 12px', color: '#ef4444', borderColor: '#fecaca' }}
              onClick={() => setDeleteConfirm(draft.id)}
            >
              🗑️ 删除
            </button>
          )}
        </div>
      </div>
    )
  }

  const renderVoteDraftCard = (draft) => {
    const data = draft.data || {}
    const sideText = data.side === 'A' ? draft.question_option_a : (data.side === 'B' ? draft.question_option_b : null)
    return (
      <div key={draft.id} className="card question-card">
        <div className="question-category-tag" style={{ background: '#ede9fe', color: '#6d28d9' }}>
          📝 投票草稿
        </div>
        <h3 style={{ minHeight: 28, fontSize: 16 }}>
          {draft.question_title || <span style={{ color: '#9ca3af', fontSize: 14, fontWeight: 'normal' }}>（问题信息丢失）</span>}
        </h3>
        {(draft.question_option_a || draft.question_option_b) && (
          <div className="question-options">
            <div className={`option-tag side-a ${data.side === 'A' ? '' : ''}`}
              style={data.side === 'A' ? { boxShadow: '0 0 0 2px #be185d', fontWeight: 'bold' } : {}}>
              {draft.question_option_a || '选项A'}
            </div>
            <div className={`option-tag side-b ${data.side === 'B' ? '' : ''}`}
              style={data.side === 'B' ? { boxShadow: '0 0 0 2px #1d4ed8', fontWeight: 'bold' } : {}}>
              {draft.question_option_b || '选项B'}
            </div>
          </div>
        )}
        {sideText && (
          <div style={{
            marginTop: 12,
            padding: '8px 12px',
            background: data.side === 'A' ? '#fdf2f8' : '#eff6ff',
            borderRadius: 8,
            fontSize: 13,
            color: data.side === 'A' ? '#be185d' : '#1d4ed8'
          }}>
            已选择：{sideText}
          </div>
        )}
        {data.content && (
          <div style={{
            marginTop: 10,
            padding: '10px 12px',
            background: '#f9fafb',
            borderRadius: 8,
            fontSize: 14,
            color: '#374151',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {data.content}
          </div>
        )}
        <div className="question-meta" style={{ marginTop: 16 }}>
          <span style={{ color: '#6b7280', fontSize: 13 }}>
            创建于 {formatDraftTime(draft.created_at)} · 更新于 {formatDraftTime(draft.updated_at)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1, fontSize: 13, padding: '8px 12px' }}
            onClick={() => handleEditVoteDraft(draft)}
          >
            ✏️ 继续编辑
          </button>
          {deleteConfirm === draft.id ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                className="btn btn-primary"
                style={{ fontSize: 12, padding: '8px 10px', background: '#ef4444' }}
                onClick={() => handleDeleteDraft(draft.id)}
              >
                确认
              </button>
              <button
                className="btn btn-outline"
                style={{ fontSize: 12, padding: '8px 10px' }}
                onClick={() => setDeleteConfirm(null)}
              >
                取消
              </button>
            </div>
          ) : (
            <button
              className="btn btn-outline"
              style={{ fontSize: 13, padding: '8px 12px', color: '#ef4444', borderColor: '#fecaca' }}
              onClick={() => setDeleteConfirm(draft.id)}
            >
              🗑️ 删除
            </button>
          )}
        </div>
      </div>
    )
  }

  const questionDrafts = drafts.filter(d => d.type === 'question')
  const voteDrafts = drafts.filter(d => d.type === 'vote')

  return (
    <div className="page-container" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 'bold', margin: 0 }}>📝 我的草稿</h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: '6px 0 0' }}>
            共 {drafts.length} 个草稿 · 自动保存在本地
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>加载中...</div>
      ) : drafts.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: '#f9fafb',
          borderRadius: 12,
          border: '2px dashed #e5e7eb'
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 16, color: '#6b7280', marginBottom: 8 }}>还没有草稿</div>
          <div style={{ fontSize: 13, color: '#9ca3af' }}>发布问题或投票时，内容会自动保存为草稿</div>
          <button
            className="btn btn-primary"
            style={{ marginTop: 20 }}
            onClick={() => navigate('/')}
          >
            去首页看看
          </button>
        </div>
      ) : (
        <div>
          {questionDrafts.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{
                fontSize: 15,
                fontWeight: 'bold',
                marginBottom: 12,
                paddingLeft: 10,
                borderLeft: '3px solid #f59e0b'
              }}>
                问题草稿（{questionDrafts.length}）
              </div>
              <div className="question-list">
                {questionDrafts.map(renderQuestionDraftCard)}
              </div>
            </div>
          )}

          {voteDrafts.length > 0 && (
            <div>
              <div style={{
                fontSize: 15,
                fontWeight: 'bold',
                marginBottom: 12,
                paddingLeft: 10,
                borderLeft: '3px solid #8b5cf6'
              }}>
                投票草稿（{voteDrafts.length}）
              </div>
              <div className="question-list">
                {voteDrafts.map(renderVoteDraftCard)}
              </div>
            </div>
          )}
        </div>
      )}

      {showQuestionModal && currentDraft && (
        <CreateQuestionModal
          onClose={handleModalClose}
          onSuccess={handleQuestionSuccess}
          initialDraft={currentDraft}
        />
      )}

      {showVoteModal && currentDraft && (
        <VoteModal
          question={{
            id: currentDraft.key,
            title: currentDraft.question_title,
            option_a: currentDraft.question_option_a,
            option_b: currentDraft.question_option_b
          }}
          onClose={handleModalClose}
          onSuccess={handleVoteSuccess}
          initialDraft={currentDraft}
        />
      )}
    </div>
  )
}
