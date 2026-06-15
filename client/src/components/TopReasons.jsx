import { useNavigate } from 'react-router-dom'

export default function TopReasons({ topA, topB, optionA, optionB }) {
  const navigate = useNavigate()

  const getRankStyle = (rank) => {
    const styles = {
      1: { background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: 'white' },
      2: { background: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)', color: 'white' },
      3: { background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', color: 'white' }
    }
    return styles[rank] || {}
  }

  const handleUserClick = (e, nickname) => {
    e.stopPropagation()
    navigate(`/user/${encodeURIComponent(nickname)}`)
  }

  const renderTopList = (reasons, side) => (
    <div className="side-column">
      <div className={`side-header side-${side.toLowerCase()}`} style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '1rem' }}>
          {side === 'A' ? optionA : optionB}
        </div>
      </div>
      {reasons.length === 0 ? (
        <div className="card empty-state" style={{ padding: '16px', fontSize: 14 }}>
          暂无上榜理由
        </div>
      ) : (
        reasons.map((reason, index) => (
          <div 
            key={reason.id} 
            className={`reason-card side-${side.toLowerCase()}`}
            style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}
          >
            <div 
              className={`top-rank rank-${index + 1}`}
              style={getRankStyle(index + 1)}
            >
              {index + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div className="reason-content" style={{ marginBottom: 8 }}>
                {reason.changed_vote && (
                  <span className="changed-vote-badge">已改票</span>
                )}
                {reason.changed_from && (
                  <span className="changed-from-badge">改票自{reason.changed_from}方</span>
                )}
                {reason.content}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af' }}>
                <span 
                  className="user-nickname-link"
                  onClick={(e) => handleUserClick(e, reason.author_name)}
                >
                  @{reason.author_name}
                </span>
                <span>👍 {reason.likes}</span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )

  return (
    <div className="card top-reasons-section">
      <h3>🏆 最有说服力的正反理由 Top3</h3>
      <div className="top-reasons-grid">
        {renderTopList(topA, 'A')}
        {renderTopList(topB, 'B')}
      </div>
    </div>
  )
}
