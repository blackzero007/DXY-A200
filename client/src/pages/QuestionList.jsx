import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getQuestions, CATEGORIES, getFavorites, removeFavorite } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import CreateQuestionModal from '../components/CreateQuestionModal.jsx'

function handleUserClick(e, nickname, navigate) {
  e.stopPropagation()
  navigate(`/user/${encodeURIComponent(nickname)}`)
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

function highlightText(text, keyword) {
  if (!keyword || !keyword.trim() || !text) return text
  
  const kw = keyword.trim()
  const regex = new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  
  return parts.map((part, index) => 
    part.toLowerCase() === kw.toLowerCase() 
      ? <span key={index} className="highlight">{part}</span> 
      : part
  )
}

function QuestionCard({ question, onClick, keyword, showFavorite, isFavorited, onToggleFavorite, favoriteLoading }) {
  const navigate = useNavigate()
  const totalVotes = question.votes_a + question.votes_b
  const percentA = totalVotes > 0 ? (question.votes_a / totalVotes) * 100 : 50
  const percentB = totalVotes > 0 ? (question.votes_b / totalVotes) * 100 : 50

  const handleFavoriteClick = (e) => {
    e.stopPropagation()
    if (onToggleFavorite) {
      onToggleFavorite(question.id)
    }
  }

  return (
    <div className="card question-card" onClick={onClick}>
      {showFavorite && (
        <button
          className={`favorite-btn question-card-favorite ${isFavorited ? 'favorited' : ''}`}
          onClick={handleFavoriteClick}
          disabled={favoriteLoading}
          title={isFavorited ? '取消收藏' : '收藏'}
        >
          {isFavorited ? '⭐' : '☆'}
        </button>
      )}
      <div className="question-category-tag">{question.category || '职场'}</div>
      <h3>{highlightText(question.title, keyword)}</h3>
      {question.description && (
        <p className="question-description">{highlightText(question.description, keyword)}</p>
      )}
      <div className="question-options">
        <div className="option-tag side-a">{highlightText(question.option_a, keyword)}</div>
        <div className="option-tag side-b">{highlightText(question.option_b, keyword)}</div>
      </div>
      <div className="vote-bar-container">
        <div className="vote-bar-a" style={{ width: `${percentA}%` }}></div>
        <div className="vote-bar-b" style={{ width: `${percentB}%` }}></div>
      </div>
      <div className="question-meta">
        <span 
          className="user-nickname-link"
          onClick={(e) => handleUserClick(e, question.author_name, navigate)}
        >
          @{question.author_name}
        </span>
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
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [questions, setQuestions] = useState([])
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest')
  const [category, setCategory] = useState(searchParams.get('category') || '全部')
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '')
  const [searchInput, setSearchInput] = useState(searchParams.get('keyword') || '')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [activeTab, setActiveTab] = useState('questions')
  const [favoritesPage, setFavoritesPage] = useState(1)
  const [favoritesTotal, setFavoritesTotal] = useState(0)
  const [favoritesLoading, setFavoritesLoading] = useState(false)
  const [removingFavoriteId, setRemovingFavoriteId] = useState(null)

  useEffect(() => {
    const params = {}
    if (sort !== 'newest') params.sort = sort
    if (category !== '全部') params.category = category
    if (keyword) params.keyword = keyword
    setSearchParams(params, { replace: true })
  }, [sort, category, keyword, setSearchParams])

  useEffect(() => {
    if (activeTab === 'questions') {
      loadQuestions()
    } else if (activeTab === 'favorites' && user) {
      loadFavorites()
    }
  }, [sort, category, keyword, page, activeTab, user, favoritesPage])

  const loadQuestions = async () => {
    setLoading(true)
    try {
      const data = await getQuestions({ sort, category, keyword, page, limit: 10 })
      setQuestions(data.list)
      setTotal(data.total)
    } catch (err) {
      console.error('加载问题失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadFavorites = async () => {
    if (!user) return
    setFavoritesLoading(true)
    try {
      const data = await getFavorites({ page: favoritesPage, limit: 10 })
      setFavorites(data.list)
      setFavoritesTotal(data.total)
    } catch (err) {
      console.error('加载收藏失败:', err)
    } finally {
      setFavoritesLoading(false)
    }
  }

  const handleRemoveFavorite = async (questionId) => {
    if (!user) {
      navigate('/login')
      return
    }
    setRemovingFavoriteId(questionId)
    try {
      await removeFavorite(questionId)
      setFavorites(prev => prev.filter(f => f.id !== questionId))
      setFavoritesTotal(prev => prev - 1)
    } catch (err) {
      console.error('取消收藏失败:', err)
    } finally {
      setRemovingFavoriteId(null)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setKeyword(searchInput)
    setPage(1)
  }

  const handleClearSearch = () => {
    setSearchInput('')
    setKeyword('')
    setPage(1)
  }

  const handleCreateSuccess = (newQuestion) => {
    setShowCreateModal(false)
    navigate(`/question/${newQuestion.id}`)
  }

  const isSearching = keyword && keyword.trim()

  return (
    <div className="container">
      <div className="header">
        <h1>🤔 困境选择</h1>
        <p>每个两难问题，都值得认真思考</p>
      </div>

      <div className="search-container">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="搜索问题标题或描述..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={handleClearSearch}
              >
                ✕
              </button>
            )}
          </div>
          <button type="submit" className="btn btn-primary search-btn">
            搜索
          </button>
        </form>
      </div>

      {isSearching && (
        <div className="search-result-header">
          <span className="search-keyword">"{keyword}"</span>
          <span className="search-count">找到 {total} 个相关问题</span>
        </div>
      )}

      <div className="category-filter">
        <div 
          className={`filter-tag ${category === '全部' ? 'active' : ''}`}
          onClick={() => { setCategory('全部'); setPage(1); }}
        >
          全部
        </div>
        {CATEGORIES.map(cat => (
          <div 
            key={cat}
            className={`filter-tag ${category === cat ? 'active' : ''}`}
            onClick={() => { setCategory(cat); setPage(1); }}
          >
            {cat}
          </div>
        ))}
      </div>

      <div className="tabs">
        <div 
          className={`tab ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => { setActiveTab('questions'); setPage(1); }}
        >
          全部问题
        </div>
        <div 
          className={`tab ${activeTab === 'favorites' ? 'active' : ''}`}
          onClick={() => { setActiveTab('favorites'); setFavoritesPage(1); }}
        >
          ⭐ 我的收藏
        </div>
      </div>

      {activeTab === 'questions' && (
        <>
          <div className="tabs sort-tabs">
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
              <h3>{isSearching ? '没有找到相关问题' : '还没有问题'}</h3>
              <p>{isSearching ? '试试其他关键词吧' : '点击右下角按钮发布第一个两难问题吧！'}</p>
            </div>
          ) : (
            questions.map(q => (
              <QuestionCard 
                key={q.id} 
                question={q} 
                keyword={keyword}
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
        </>
      )}

      {activeTab === 'favorites' && (
        <>
          {!user ? (
            <div className="card empty-state">
              <h3>请先登录</h3>
              <p>登录后即可查看你的收藏</p>
              <button 
                className="btn btn-primary"
                style={{ marginTop: 16 }}
                onClick={() => navigate('/login')}
              >
                去登录
              </button>
            </div>
          ) : favoritesLoading ? (
            <div className="card loading">加载中...</div>
          ) : favorites.length === 0 ? (
            <div className="card empty-state">
              <h3>还没有收藏</h3>
              <p>浏览问题时点击收藏按钮，即可添加到这里</p>
            </div>
          ) : (
            favorites.map(q => (
              <QuestionCard 
                key={q.id} 
                question={q} 
                keyword={keyword}
                onClick={() => navigate(`/question/${q.id}`)}
                showFavorite={true}
                isFavorited={true}
                onToggleFavorite={handleRemoveFavorite}
                favoriteLoading={removingFavoriteId === q.id}
              />
            ))
          )}

          {user && favoritesTotal > favorites.length && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button 
                className="btn btn-outline" 
                style={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
                onClick={() => setFavoritesPage(p => p + 1)}
              >
                加载更多
              </button>
            </div>
          )}
        </>
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
