import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getQuestion, getTopReasons } from '../utils/api'
import ReasonCard from '../components/ReasonCard.jsx'
import VoteModal from '../components/VoteModal.jsx'
import TopReasons from '../components/TopReasons.jsx'

export default function QuestionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [question, setQuestion] = useState(null)
  const [topReasons, setTopReasons] = useState({ A: [], B: [] })
  const [loading, setLoading] = useState(true)
  const [showVoteModal, setShowVoteModal] = useState(false)

  useEffect(() => {
    loadQuestion()
    loadTopReasons()
  }, [id])

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
          .sort((a, b) => b.likes - a.likes)
      }
    }))
    loadTopReasons()
  }

  const handleReasonUpdate = (updatedReason, side) => {
    setQuestion(prev => ({
      ...prev,
      reasons: {
        ...prev.reasons,
        [side]: prev.reasons[side].map(r => 
          r.id === updatedReason.id ? updatedReason : r
        ).sort((a, b) => b.likes - a.likes)
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
          <h2>{question.title}</h2>
          {question.description && (
            <p className="description">{question.description}</p>
          )}
          <p style={{ color: '#6b7280', fontSize: 14 }}>
            由 @{question.author_name} 发布
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

      <div className="vote-sides-container">
        <div className="side-column">
          <div className="side-header side-a">
            <div className="vote-count">{question.votes_a}</div>
            <div>{question.option_a}</div>
          </div>
          {question.reasons.A.length === 0 ? (
            <div className="card empty-state" style={{ padding: '20px' }}>
              <p>暂无理由</p>
            </div>
          ) : (
            question.reasons.A.map(reason => (
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
          {question.reasons.B.length === 0 ? (
            <div className="card empty-state" style={{ padding: '20px' }}>
              <p>暂无理由</p>
            </div>
          ) : (
            question.reasons.B.map(reason => (
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
