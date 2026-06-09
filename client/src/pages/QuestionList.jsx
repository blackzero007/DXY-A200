import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getQuestions } from '../utils/api'
import CreateQuestionModal from '../components/CreateQuestionModal.jsx'

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

function QuestionCard({ question, onClick }) {
  const totalVotes = question.votes_a + question.votes_b
  const percentA = totalVotes > 0 ? (question.votes_a / totalVotes) * 100 : 50
  const percentB = totalVotes > 0 ? (question.votes_b / totalVotes) * 100 : 50

  return (
    <div className="card question-card" onClick={onClick}>
      <h3>{question.title}</h3>
      <div className="question-options">
        <div className="option-tag side-a">{question.option_a}</div>
        <div className="option-tag side-b">{question.option_b}</div>
      </div>
      <div className="vote-bar-container">
        <div className="vote-bar-a" style={{ width: `${percentA}%` }}></div>
        <div className="vote-bar-b" style={{ width: `${percentB}%` }}></div>
      </div>
      <div className="question-meta">
        <span>@{question.author_name}</span>
        <div className="vote-stats">
          <span>{totalVotes} 人投票</span>
          <span>{formatTime(question.created_at)}</span>
        </div>
      </div>
    </div>
  )
}

export default function QuestionList() {
  const navigate = useNavigate()
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('newest')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadQuestions()
  }, [sort, page])

  const loadQuestions = async () => {
    setLoading(true)
    try {
      const data = await getQuestions({ sort, page, limit: 10 })
      setQuestions(data.list)
      setTotal(data.total)
    } catch (err) {
      console.error('加载问题失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSuccess = (newQuestion) => {
    setShowCreateModal(false)
    navigate(`/question/${newQuestion.id}`)
  }

  return (
    <div className="container">
      <div className="header">
        <h1>🤔 困境选择</h1>
        <p>每个两难问题，都值得认真思考</p>
      </div>

      <div className="tabs">
        <div 
          className={`tab ${sort === 'newest' ? 'active' : ''}`}
          onClick={() => { setSort('newest'); setPage(1); }}
        >
          最新发布
        </div>
        <div 
          className={`tab ${sort === 'hot' ? 'active' : ''}`}
          onClick={() => { setSort('hot'); setPage(1); }}
        >
          最热门
        </div>
      </div>

      {loading ? (
        <div className="card loading">加载中...</div>
      ) : questions.length === 0 ? (
        <div className="card empty-state">
          <h3>还没有问题</h3>
          <p>点击右下角按钮发布第一个两难问题吧！</p>
        </div>
      ) : (
        questions.map(q => (
          <QuestionCard 
            key={q.id} 
            question={q} 
            onClick={() => navigate(`/question/${q.id}`)}
          />
        ))
      )}

      {total > questions.length && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button 
            className="btn btn-outline" 
            style={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
            onClick={() => setPage(p => p + 1)}
          >
            加载更多
          </button>
        </div>
      )}

      <button 
        className="create-btn"
        onClick={() => setShowCreateModal(true)}
        title="发布问题"
      >
        +
      </button>

      {showCreateModal && (
        <CreateQuestionModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  )
}
