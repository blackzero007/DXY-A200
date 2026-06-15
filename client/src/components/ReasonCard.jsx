import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { likeReason, dislikeReason, getReplies, replyReason, likeReply, dislikeReply } from '../utils/api'
import ReportModal from './ReportModal'
import { useAuth } from '../contexts/AuthContext'

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      return true
    } catch (e) {
      return false
    } finally {
      document.body.removeChild(textarea)
    }
  }
}

function CopyToast({ visible }) {
  return (
    <div className={`copy-toast ${visible ? 'visible' : ''}`}>
      <span>✓</span> 已复制
    </div>
  )
}

function formatTime(timestamp) {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  return new Date(timestamp).toLocaleDateString()
}

function getAvatar(name) {
  return name ? name.charAt(0).toUpperCase() : '匿'
}

function ReplyItem({ reply, onLike, onDislike, onReply }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [nestedExpanded, setNestedExpanded] = useState(false)
  const [showCopyToast, setShowCopyToast] = useState(false)
  const [contentExpanded, setContentExpanded] = useState(false)

  const COLLAPSE_THRESHOLD = 5
  const VISIBLE_WHEN_COLLAPSED = 2
  const CONTENT_COLLAPSE_THRESHOLD = 200
  const CONTENT_VISIBLE_LENGTH = 100
  const MAX_REPLY_LENGTH = 500

  const handleCopy = async () => {
    const success = await copyToClipboard(reply.content)
    if (success) {
      setShowCopyToast(true)
      setTimeout(() => setShowCopyToast(false), 1500)
    }
  }

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) return
    if (!user) {
      alert('请先登录后再回复')
      navigate('/login')
      return
    }
    setSubmitting(true)
    try {
      const result = await replyReason(reply.reason_id, {
        content: replyContent.trim(),
        parent_id: reply.id,
        question_id: reply.question_id
      })
      setReplyContent('')
      setShowReplyForm(false)
      onReply && onReply(result, reply.id)
    } catch (err) {
      if (err.response?.status === 401) {
        alert('请先登录后再回复')
        navigate('/login')
      } else {
        alert('回复失败：' + (err.response?.data?.error || err.message))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleUserClick = (e, nickname) => {
    e.stopPropagation()
    navigate(`/user/${encodeURIComponent(nickname)}`)
  }

  const isLongContent = reply.content.length > CONTENT_COLLAPSE_THRESHOLD
  const displayContent = isLongContent && !contentExpanded
    ? reply.content.slice(0, CONTENT_VISIBLE_LENGTH)
    : reply.content

  return (
    <div className="reply-item">
      <div className="reply-content-wrapper">
        <div className="reply-content">
          <span 
            className="user-nickname-link"
            onClick={(e) => handleUserClick(e, reply.author_name)}
          >
            @{reply.author_name}
          </span>
          {' '}{displayContent}
          {isLongContent && !contentExpanded && (
            <span>
              ...
              <button
                className="expand-content-btn"
                onClick={() => setContentExpanded(true)}
              >
                展开全文
              </button>
            </span>
          )}
          {isLongContent && contentExpanded && (
            <button
              className="expand-content-btn"
              onClick={() => setContentExpanded(false)}
            >
              收起
            </button>
          )}
        </div>
        <button className="copy-btn" onClick={handleCopy} title="复制内容">
          📋
        </button>
        <CopyToast visible={showCopyToast} />
      </div>
      <div className="reply-footer">
        <span>{formatTime(reply.created_at)}</span>
        <div className="reason-actions">
          <button className="action-btn like" onClick={() => onLike(reply.id)}>
            👍 {reply.likes}
          </button>
          <button className="action-btn dislike" onClick={() => onDislike(reply.id)}>
            👎 {reply.dislikes}
          </button>
          <button className="action-btn reply" onClick={() => {
            if (!user) {
              alert('请先登录后再回复')
              navigate('/login')
              return
            }
            setShowReplyForm(!showReplyForm)
          }}>
            💬 回复
          </button>
          <button 
            className="action-btn report" 
            onClick={() => {
              if (!user) {
                alert('请先登录后再举报')
                return
              }
              setShowReportModal(true)
            }}
          >
            🚩 举报
          </button>
        </div>
      </div>

      {showReplyForm && (
        <div className="reply-form">
          <textarea
            placeholder={`回复 @${reply.author_name}...`}
            value={replyContent}
            onChange={e => setReplyContent(e.target.value)}
            maxLength={MAX_REPLY_LENGTH}
            rows={2}
          />
          <div className="reply-form-footer">
            <div className="char-count">
              {replyContent.length}/{MAX_REPLY_LENGTH}
            </div>
            <div className="reply-form-actions">
              <button 
                className="btn btn-outline" 
                size="small"
                onClick={() => setShowReplyForm(false)}
              >
                取消
              </button>
              <button 
                className="btn btn-primary" 
                size="small"
                onClick={handleSubmitReply}
                disabled={submitting || !replyContent.trim()}
              >
                {submitting ? '发送中...' : '发送'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reply.replies && reply.replies.length > 0 && (
        <div className="reply-list">
          {(nestedExpanded ? reply.replies : reply.replies.slice(0, VISIBLE_WHEN_COLLAPSED)).map(child => (
            <ReplyItem
              key={child.id}
              reply={child}
              onLike={onLike}
              onDislike={onDislike}
              onReply={onReply}
            />
          ))}
          {!nestedExpanded && reply.replies.length > COLLAPSE_THRESHOLD && (
            <button
              className="expand-replies-btn"
              onClick={() => setNestedExpanded(true)}
            >
              展开剩余{reply.replies.length - VISIBLE_WHEN_COLLAPSED}条回复
            </button>
          )}
          {nestedExpanded && reply.replies.length > COLLAPSE_THRESHOLD && (
            <button
              className="expand-replies-btn"
              onClick={() => setNestedExpanded(false)}
            >
              收起回复
            </button>
          )}
        </div>
      )}

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType="reply"
        targetId={reply.id}
        targetContent={reply.content}
      />
    </div>
  )
}

export default function ReasonCard({ reason, side, onUpdate }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [showReplies, setShowReplies] = useState(false)
  const [replies, setReplies] = useState([])
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingReplies, setLoadingReplies] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showCopyToast, setShowCopyToast] = useState(false)
  const [contentExpanded, setContentExpanded] = useState(false)

  const CONTENT_COLLAPSE_THRESHOLD = 200
  const CONTENT_VISIBLE_LENGTH = 100
  const MAX_REPLY_LENGTH = 500

  const handleCopy = async () => {
    const success = await copyToClipboard(reason.content)
    if (success) {
      setShowCopyToast(true)
      setTimeout(() => setShowCopyToast(false), 1500)
    }
  }

  const handleUserClick = (e, nickname) => {
    e.stopPropagation()
    navigate(`/user/${encodeURIComponent(nickname)}`)
  }

  const loadReplies = async () => {
    if (replies.length > 0) {
      setShowReplies(!showReplies)
      return
    }
    setLoadingReplies(true)
    try {
      const data = await getReplies(reason.id)
      setReplies(data)
      setShowReplies(true)
    } catch (err) {
      console.error('加载回复失败:', err)
    } finally {
      setLoadingReplies(false)
    }
  }

  const handleLike = async () => {
    if (!user) {
      alert('请先登录后再点赞')
      navigate('/login')
      return
    }
    try {
      const updated = await likeReason(reason.id)
      onUpdate && onUpdate(updated)
    } catch (err) {
      if (err.response?.status === 401) {
        alert('请先登录后再点赞')
        navigate('/login')
      } else {
        console.error('点赞失败:', err)
      }
    }
  }

  const handleDislike = async () => {
    if (!user) {
      alert('请先登录后再点踩')
      navigate('/login')
      return
    }
    try {
      const updated = await dislikeReason(reason.id)
      onUpdate && onUpdate(updated)
    } catch (err) {
      if (err.response?.status === 401) {
        alert('请先登录后再点踩')
        navigate('/login')
      } else {
        console.error('点踩失败:', err)
      }
    }
  }

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) return
    if (!user) {
      alert('请先登录后再回复')
      navigate('/login')
      return
    }
    setSubmitting(true)
    try {
      const result = await replyReason(reason.id, {
        content: replyContent.trim(),
        question_id: reason.question_id
      })
      setReplies(prev => [...prev, result])
      setReplyContent('')
      setShowReplies(true)
      onUpdate && onUpdate({ ...reason, reply_count: reason.reply_count + 1 })
    } catch (err) {
      if (err.response?.status === 401) {
        alert('请先登录后再回复')
        navigate('/login')
      } else {
        alert('回复失败：' + (err.response?.data?.error || err.message))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleReplyLike = async (replyId) => {
    if (!user) {
      alert('请先登录后再点赞')
      navigate('/login')
      return
    }
    try {
      await likeReply(replyId)
      setReplies(prev => updateReplyInTree(prev, replyId, r => ({ ...r, likes: r.likes + 1 })))
    } catch (err) {
      if (err.response?.status === 401) {
        alert('请先登录后再点赞')
        navigate('/login')
      } else {
        console.error('点赞失败:', err)
      }
    }
  }

  const handleReplyDislike = async (replyId) => {
    if (!user) {
      alert('请先登录后再点踩')
      navigate('/login')
      return
    }
    try {
      await dislikeReply(replyId)
      setReplies(prev => updateReplyInTree(prev, replyId, r => ({ ...r, dislikes: r.dislikes + 1 })))
    } catch (err) {
      if (err.response?.status === 401) {
        alert('请先登录后再点踩')
        navigate('/login')
      } else {
        console.error('点踩失败:', err)
      }
    }
  }

  const handleNestedReply = (newReply, parentId) => {
    setReplies(prev => addReplyToTree(prev, parentId, newReply))
    onUpdate && onUpdate({ ...reason, reply_count: reason.reply_count + 1 })
  }

  function updateReplyInTree(repliesList, replyId, updater) {
    return repliesList.map(r => {
      if (r.id === replyId) {
        return updater(r)
      }
      if (r.replies && r.replies.length > 0) {
        return { ...r, replies: updateReplyInTree(r.replies, replyId, updater) }
      }
      return r
    })
  }

  function addReplyToTree(repliesList, parentId, newReply) {
    return repliesList.map(r => {
      if (r.id === parentId) {
        return { ...r, replies: [...(r.replies || []), newReply] }
      }
      if (r.replies && r.replies.length > 0) {
        return { ...r, replies: addReplyToTree(r.replies, parentId, newReply) }
      }
      return r
    })
  }

  const isLongContent = reason.content.length > CONTENT_COLLAPSE_THRESHOLD
  const displayContent = isLongContent && !contentExpanded
    ? reason.content.slice(0, CONTENT_VISIBLE_LENGTH)
    : reason.content

  return (
    <div className={`reason-card side-${side.toLowerCase()}`}>
      <div className="reason-content-wrapper">
        <div className="reason-content">
          {reason.changed_vote && (
            <span className="changed-vote-badge">已改票</span>
          )}
          {reason.changed_from && (
            <span className="changed-from-badge">改票自{reason.changed_from}方</span>
          )}
          {displayContent}
          {isLongContent && !contentExpanded && (
            <span>
              ...
              <button
                className="expand-content-btn"
                onClick={() => setContentExpanded(true)}
              >
                展开全文
              </button>
            </span>
          )}
          {isLongContent && contentExpanded && (
            <button
              className="expand-content-btn"
              onClick={() => setContentExpanded(false)}
            >
              收起
            </button>
          )}
        </div>
        <button className="copy-btn" onClick={handleCopy} title="复制内容">
          📋
        </button>
        <CopyToast visible={showCopyToast} />
      </div>
      <div className="reason-footer">
        <div className="author-info">
          <div 
            className="avatar"
            onClick={(e) => handleUserClick(e, reason.author_name)}
            style={{ cursor: 'pointer' }}
          >
            {getAvatar(reason.author_name)}
          </div>
          <span 
            className="user-nickname-link"
            onClick={(e) => handleUserClick(e, reason.author_name)}
          >
            @{reason.author_name}
          </span>
          <span style={{ marginLeft: 8 }}>{formatTime(reason.created_at)}</span>
        </div>
        <div className="reason-actions">
          <button className="action-btn like" onClick={handleLike}>
            👍 {reason.likes}
          </button>
          <button className="action-btn dislike" onClick={handleDislike}>
            👎 {reason.dislikes}
          </button>
          <button className="action-btn reply" onClick={loadReplies}>
            💬 {reason.reply_count}
          </button>
          <button 
            className="action-btn report" 
            onClick={() => {
              if (!user) {
                alert('请先登录后再举报')
                return
              }
              setShowReportModal(true)
            }}
          >
            🚩 举报
          </button>
        </div>
      </div>

      <div className="reply-form">
        <textarea
          placeholder="我有话说..."
          value={replyContent}
          onChange={e => setReplyContent(e.target.value)}
          maxLength={MAX_REPLY_LENGTH}
          rows={2}
        />
        <div className="reply-form-footer">
          <div className="char-count">
            {replyContent.length}/{MAX_REPLY_LENGTH}
          </div>
          <div className="reply-form-actions">
            <button 
              className="btn btn-primary" 
              onClick={handleSubmitReply}
              disabled={submitting || !replyContent.trim()}
              style={{ fontSize: 13, padding: '6px 14px' }}
            >
              {submitting ? '发送中...' : '发送'}
            </button>
          </div>
        </div>
      </div>

      {loadingReplies && (
        <div style={{ textAlign: 'center', padding: 10, fontSize: 13, color: '#9ca3af' }}>
          加载回复中...
        </div>
      )}

      {showReplies && !loadingReplies && (
        <div className="reply-list">
          {replies.length === 0 ? (
            <div className="empty-state empty-state-replies">
              <div className="empty-state-icon">💬</div>
              <div className="empty-state-desc" style={{ fontSize: 13 }}>
                还没有回复，<span className="highlight">来说两句吧~</span>
              </div>
            </div>
          ) : (
            replies.map(reply => (
              <ReplyItem
                key={reply.id}
                reply={reply}
                onLike={handleReplyLike}
                onDislike={handleReplyDislike}
                onReply={handleNestedReply}
              />
            ))
          )}
        </div>
      )}

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType="reason"
        targetId={reason.id}
        targetContent={reason.content}
      />
    </div>
  )
}
