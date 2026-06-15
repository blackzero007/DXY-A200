import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getUserProfile, getUserQuestions, getUserReasons, getUserReplies, checkFollowStatus, followUser, unfollowUser } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'

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

function formatRegisterDate(timestamp) {
  const date = new Date(timestamp)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

function getAvatar(name) {
  return name ? name.charAt(0).toUpperCase() : '匿'
}

const TABS = [
  { key: 'questions', label: '发布的问题' },
  { key: 'reasons', label: '投票理由' },
  { key: 'replies', label: '回复记录' }
]

export default function UserProfile() {
  const { nickname } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const decodedNickname = decodeURIComponent(nickname || '')
  const [profile, setProfile] = useState(null)
  const [activeTab, setActiveTab] = useState('questions')
  const [listData, setListData] = useState([])
  const [loading, setLoading] = useState(true)
  const [listLoading, setListLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [decodedNickname])

  useEffect(() => {
    if (currentUser && decodedNickname !== currentUser.nickname) {
      checkFollowStatus(decodedNickname)
        .then(data => setIsFollowing(data.is_following))
        .catch(() => {})
    } else {
      setIsFollowing(false)
    }
  }, [decodedNickname, currentUser])

  useEffect(() => {
    loadListData()
  }, [activeTab, decodedNickname, page])

  const loadProfile = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getUserProfile(decodedNickname)
      setProfile(data)
    } catch (err) {
      setError(err.response?.data?.error || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const loadListData = async () => {
    setListLoading(true)
    try {
      let data
      switch (activeTab) {
        case 'questions':
          data = await getUserQuestions(decodedNickname, { page, limit: 10 })
          break
        case 'reasons':
          data = await getUserReasons(decodedNickname, { page, limit: 10 })
          break
        case 'replies':
          data = await getUserReplies(decodedNickname, { page, limit: 10 })
          break
      }
      setListData(prev => page === 1 ? data.list : [...prev, ...data.list])
      setTotal(data.total)
    } catch (err) {
      console.error('加载列表失败:', err)
    } finally {
      setListLoading(false)
    }
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setPage(1)
    setListData([])
  }

  const handleLoadMore = () => {
    setPage(p => p + 1)
  }

  const handleToggleFollow = async () => {
    if (!currentUser) {
      navigate('/login')
      return
    }
    setFollowLoading(true)
    try {
      if (isFollowing) {
        await unfollowUser(decodedNickname)
        setIsFollowing(false)
      } else {
        await followUser(decodedNickname)
        setIsFollowing(true)
      }
    } catch (err) {
      console.error('关注操作失败:', err)
    } finally {
      setFollowLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="card loading">加载中...</div>
      </div>
    )
  }

  if (error || !profile || !profile.user) {
    return (
      <div className="container">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← 返回首页
        </button>
        <div className="card empty-state">
          <h3>{error || '用户不存在'}</h3>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            返回首页
          </button>
        </div>
      </div>
    )
  }

  const { user, stats } = profile

  return (
    <div className="container">
      <button className="back-btn" onClick={() => navigate(-1)}>
        ← 返回
      </button>

      <div className="card profile-header-card">
        <div className="profile-header">
          <div 
            className="profile-avatar"
            style={{ 
              background: user.avatar?.bgColor || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
            }}
          >
            {user.avatar?.initial || getAvatar(user.nickname)}
          </div>
          <div className="profile-info">
            <div className="profile-name-row">
              <h2 className="profile-nickname">@{user.nickname}</h2>
              {currentUser && currentUser.nickname !== user.nickname && (
                <button
                  className={`btn follow-btn ${isFollowing ? 'following' : ''}`}
                  onClick={handleToggleFollow}
                  disabled={followLoading}
                >
                  {isFollowing ? '已关注' : '+ 关注'}
                </button>
              )}
              {!currentUser && (
                <button
                  className="btn follow-btn"
                  onClick={() => navigate('/login')}
                >
                  + 关注
                </button>
              )}
            </div>
            {user.is_registered ? (
              <p className="profile-register-date">
                注册于 {formatRegisterDate(user.created_at)}
              </p>
            ) : (
              <p className="profile-register-date">
                首次活跃于 {formatRegisterDate(user.created_at)}
              </p>
            )}
          </div>
        </div>

        <div className="profile-stats">
          <div className="stat-item">
            <div className="stat-number">{stats.question_count}</div>
            <div className="stat-label">问题</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{stats.reason_count}</div>
            <div className="stat-label">理由</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{stats.reply_count}</div>
            <div className="stat-label">回复</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{stats.total_likes}</div>
            <div className="stat-label">获赞</div>
          </div>
        </div>
      </div>

      <div className="tabs profile-tabs">
        {TABS.map(tab => (
          <div
            key={tab.key}
            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {activeTab === 'questions' && (
        <div className="profile-list">
          {listData.length === 0 && !listLoading ? (
            <div className="card empty-state">
              <h3>还没有发布问题</h3>
            </div>
          ) : (
            listData.map(q => (
              <div 
                key={q.id} 
                className="card question-card"
                onClick={() => navigate(`/question/${q.id}`)}
              >
                <div className="question-category-tag">{q.category || '职场'}</div>
                <h3>{q.title}</h3>
                {q.description && (
                  <p className="question-description">{q.description}</p>
                )}
                <div className="question-options">
                  <div className="option-tag side-a">{q.option_a}</div>
                  <div className="option-tag side-b">{q.option_b}</div>
                </div>
                <div className="vote-bar-container">
                  <div 
                    className="vote-bar-a" 
                    style={{ width: `${q.total_votes > 0 ? (q.votes_a / q.total_votes) * 100 : 50}%` }}
                  ></div>
                  <div 
                    className="vote-bar-b" 
                    style={{ width: `${q.total_votes > 0 ? (q.votes_b / q.total_votes) * 100 : 50}%` }}
                  ></div>
                </div>
                <div className="question-meta">
                  <span>{q.total_votes} 人投票</span>
                  <span>{formatTime(q.created_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'reasons' && (
        <div className="profile-list">
          {listData.length === 0 && !listLoading ? (
            <div className="card empty-state">
              <h3>还没有投票理由</h3>
            </div>
          ) : (
            listData.map(reason => (
              <div 
                key={reason.id} 
                className={`reason-card side-${reason.side.toLowerCase()}`}
                onClick={() => navigate(`/question/${reason.question_id}`)}
              >
                <div className="reason-question-title">
                  {reason.question_title}
                </div>
                <div className="reason-option-tag">
                  支持：{reason.question_option}
                </div>
                <div className="reason-content">
                  {reason.changed_vote && (
                    <span className="changed-vote-badge">已改票</span>
                  )}
                  {reason.changed_from && (
                    <span className="changed-from-badge">改票自{reason.changed_from}方</span>
                  )}
                  {reason.content}
                </div>
                <div className="reason-footer">
                  <span>{formatTime(reason.created_at)}</span>
                  <div className="reason-actions">
                    <span>👍 {reason.likes}</span>
                    <span>👎 {reason.dislikes}</span>
                    <span>💬 {reason.reply_count}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'replies' && (
        <div className="profile-list">
          {listData.length === 0 && !listLoading ? (
            <div className="card empty-state">
              <h3>还没有回复记录</h3>
            </div>
          ) : (
            listData.map(reply => (
              <div 
                key={reply.id} 
                className="card reply-card"
                onClick={() => navigate(`/question/${reply.question_id}`)}
              >
                <div className="reply-question-title">
                  {reply.question_title}
                </div>
                <div className="reply-original-reason">
                  原理由：{reply.reason_content}
                </div>
                <div className="reply-content">{reply.content}</div>
                <div className="reply-footer">
                  <span>{formatTime(reply.created_at)}</span>
                  <div className="reason-actions">
                    <span>👍 {reply.likes}</span>
                    <span>👎 {reply.dislikes}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {listLoading && (
        <div style={{ textAlign: 'center', padding: 20, color: 'white' }}>
          加载中...
        </div>
      )}

      {total > listData.length && !listLoading && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button 
            className="btn btn-outline" 
            style={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
            onClick={handleLoadMore}
          >
            加载更多
          </button>
        </div>
      )}
    </div>
  )
}
