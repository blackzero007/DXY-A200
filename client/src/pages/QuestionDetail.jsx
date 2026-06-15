import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getQuestion, getTopReasons, checkFavorite, addFavorite, removeFavorite, getQuestionStatistics } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import ReasonCard from '../components/ReasonCard.jsx'
import VoteModal from '../components/VoteModal.jsx'
import TopReasons from '../components/TopReasons.jsx'
import VoteStatistics from '../components/VoteStatistics.jsx'

export default function QuestionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [question, setQuestion] = useState(null)
  const [topReasons, setTopReasons] = useState({ A: [], B: [] })
  const [loading, setLoading] = useState(true)
  const [showVoteModal, setShowVoteModal] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [statistics, setStatistics] = useState(null)
  const [statisticsLoading, setStatisticsLoading] = useState(true)
  const [sortByA, setSortByA] = useState('netLikes')
  const [sortByB, setSortByB] = useState('netLikes')

  const SORT_OPTIONS = [
    { key: 'netLikes', label: '默认（净赞数）' },
    { key: 'newest', label: '最新发表' },
    { key: 'mostReplies', label: '最多回复' },
  ]

  const sortReasons = (reasons, sortBy) => {
    const sorted = [...reasons]
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => b.created_at - a.created_at)
      case 'mostReplies':
        return sorted.sort((a, b) => b.reply_count - a.reply_count)
      case 'netLikes':
      default:
        return sorted.sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes) || b.likes - a.likes || b.created_at - a.created_at)
    }
  }

  useEffect(() => {
    loadQuestion()
    loadTopReasons()
    loadStatistics()
    if (user) {
      loadFavoriteStatus()
    }
  }, [id, user])

  const loadStatistics = async () => {
    setStatisticsLoading(true)
    try {
      const data = await getQuestionStatistics(id)
      setStatistics(data)
    } catch (err) {
      console.error('加载统计数据失败:', err)
    } finally {
      setStatisticsLoading(false)
    }
  }

  const loadFavoriteStatus = async () => {
    try {
      const data = await checkFavorite(id)
      setIsFavorited(data.is_favorited)
    } catch (err) {
      console.error('检查收藏状态失败:', err)
    }
  }

  const handleToggleFavorite = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    setFavoriteLoading(true)
    try {
      if (isFavorited) {
        await removeFavorite(id)
        setIsFavorited(false)
      } else {
        await addFavorite(id)
        setIsFavorited(true)
      }
    } catch (err) {
      console.error('操作收藏失败:', err)
    } finally {
      setFavoriteLoading(false)
    }
  }

  const loadQuestion = async () => {
    setLoading(true)
    try {
      const data = await getQuestion(id)
      setQuestion(data)
    } catch (err) {
      console.error('加载问题失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadTopReasons = async () => {
    try {
      const data = await getTopReasons(id)
      setTopReasons(data)
    } catch (err) {
      console.error('加载Top理由失败:', err)
    }
  }

  const handleVoteSuccess = (result) => {
    setShowVoteModal(false)
    setQuestion(prev => ({
      ...prev,
      votes_a: result.question.votes_a,
      votes_b: result.question.votes_b,
      total_votes: result.question.total_votes,
      reasons: {
        ...prev.reasons,
        [result.reason.side]: [result.reason, ...prev.reasons[result.reason.side]]
          .sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes) || b.likes - a.likes || b.created_at - a.created_at)
      }
    }))
    loadTopReasons()
    loadStatistics()
  }

  const handleReasonUpdate = (updatedReason, side) => {
    setQuestion(prev => ({
      ...prev,
      reasons: {
        ...prev.reasons,
        [side]: prev.reasons[side].map(r => 
          r.id === updatedReason.id ? updatedReason : r
        ).sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes) || b.likes - a.likes || b.created_at - a.created_at)
      }
    }))
  }

  if (loading) {
    return (
      <div className="container">
        <div className="card loading">加载中...</div>
      </div>
    )
  }

  if (!question) {
    return (
      <div className="container">
        <div className="card empty-state">
          <h3>问题不存在</h3>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            返回首页
          </button>
        </div>
      </div>
    )
  }

  const totalVotes = question.total_votes || question.votes_a + question.votes_b
  const percentA = totalVotes > 0 ? (question.votes_a / totalVotes) * 100 : 50
  const percentB = totalVotes > 0 ? (question.votes_b / totalVotes) * 100 : 50

  return (
    <div className="container">
      <button className="back-btn" onClick={() => navigate('/')}>
        ← 返回列表
      </button>

      <div className="card">
        <div className="question-detail-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div className="question-category-tag large">{question.category || '职场'}</div>
            <button
              className={`favorite-btn ${isFavorited ? 'favorited' : ''}`}
              onClick={handleToggleFavorite}
              disabled={favoriteLoading}
              title={isFavorited ? '取消收藏' : '收藏'}
            >
              {isFavorited ? '⭐ 已收藏' : '☆ 收藏'}
            </button>
          </div>
          <h2>{question.title}</h2>
          {question.description && (
            <p className="description">{question.description}</p>
          )}
          <p style={{ color: '#6b7280', fontSize: 14 }}>
            由{' '}
            <span 
              className="user-nickname-link"
              onClick={() => navigate(`/user/${encodeURIComponent(question.author_name)}`)}
              style={{ cursor: 'pointer' }}
            >
              @{question.author_name}
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
            {question.option_a}: {question.votes_a} 票 ({percentA.toFixed(1)}%)
          </span>
          <span style={{ color: '#1d4ed8', fontWeight: 'bold' }}>
            {question.option_b}: {question.votes_b} 票 ({percentB.toFixed(1)}%)
          </span>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button 
            className="btn btn-primary" 
            style={{ fontSize: 16, padding: '14px 40px' }}
            onClick={() => setShowVoteModal(true)}
          >
            我要投票（必须写理由）
          </button>
        </div>
      </div>

      <TopReasons 
        topA={topReasons.A} 
        topB={topReasons.B}
        optionA={question.option_a}
        optionB={question.option_b}
      />

      <VoteStatistics statistics={statistics} loading={statisticsLoading} />

      <div className="vote-sides-container">
        <div className="side-column">
          <div className="side-header side-a">
            <div className="vote-count">{question.votes_a}</div>
            <div>{question.option_a}</div>
          </div>
          <div className="sort-bar">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                className={`sort-btn ${sortByA === opt.key ? 'active' : ''}`}
                onClick={() => setSortByA(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {question.reasons.A.length === 0 ? (
            <div className="card empty-state" style={{ padding: '20px' }}>
              <p>暂无理由</p>
            </div>
          ) : (
            sortReasons(question.reasons.A, sortByA).map(reason => (
              <ReasonCard 
                key={reason.id} 
                reason={reason} 
                side="A"
                onUpdate={(r) => handleReasonUpdate(r, 'A')}
              />
            ))
          )}
        </div>

        <div className="vs-center">VS</div>

        <div className="side-column">
          <div className="side-header side-b">
            <div className="vote-count">{question.votes_b}</div>
            <div>{question.option_b}</div>
          </div>
          <div className="sort-bar">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                className={`sort-btn ${sortByB === opt.key ? 'active' : ''}`}
                onClick={() => setSortByB(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {question.reasons.B.length === 0 ? (
            <div className="card empty-state" style={{ padding: '20px' }}>
              <p>暂无理由</p>
            </div>
          ) : (
            sortReasons(question.reasons.B, sortByB).map(reason => (
              <ReasonCard 
                key={reason.id} 
                reason={reason} 
                side="B"
                onUpdate={(r) => handleReasonUpdate(r, 'B')}
              />
            ))
          )}
        </div>
      </div>

      {showVoteModal && (
        <VoteModal 
          question={question}
          onClose={() => setShowVoteModal(false)}
          onSuccess={handleVoteSuccess}
        />
      )}
    </div>
  )
}
