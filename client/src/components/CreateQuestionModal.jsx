import { useState } from 'react'
import { createQuestion, CATEGORIES } from '../utils/api'

export default function CreateQuestionModal({ onClose, onSuccess }) {
  const [title, setTitle] = useState('')
  const [optionA, setOptionA] = useState('')
  const [optionB, setOptionB] = useState('')
  const [description, setDescription] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

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
        author_name: authorName.trim() || '匿名用户',
        category
      })
      onSuccess && onSuccess(result)
    } catch (err) {
      setError(err.response?.data?.error || '发布失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>发布两难问题</h2>
        
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

          <div className="form-group">
            <label>你的昵称（可选）</label>
            <input
              type="text"
              placeholder="不填则为匿名用户"
              value={authorName}
              onChange={e => setAuthorName(e.target.value)}
              maxLength={20}
            />
          </div>

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
