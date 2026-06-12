const DRAFT_STORAGE_KEY = 'dxy_a200_drafts'

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

export function getAllDrafts() {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    console.error('Failed to load drafts:', e)
    return []
  }
}

export function saveDraft(draft) {
  const drafts = getAllDrafts()
  const existingIndex = draft.id
    ? drafts.findIndex(d => d.id === draft.id)
    : drafts.findIndex(d => d.type === draft.type && d.key === draft.key)

  const draftToSave = {
    ...draft,
    id: draft.id || generateId(),
    updated_at: Date.now()
  }

  if (existingIndex >= 0) {
    drafts[existingIndex] = {
      ...drafts[existingIndex],
      ...draftToSave,
      created_at: drafts[existingIndex].created_at || Date.now()
    }
  } else {
    draftToSave.created_at = Date.now()
    drafts.unshift(draftToSave)
  }

  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts))
  return draftToSave
}

export function getDraftByTypeAndKey(type, key) {
  const drafts = getAllDrafts()
  return drafts.find(d => d.type === type && d.key === key) || null
}

export function getDraftById(id) {
  const drafts = getAllDrafts()
  return drafts.find(d => d.id === id) || null
}

export function deleteDraft(id) {
  const drafts = getAllDrafts()
  const filtered = drafts.filter(d => d.id !== id)
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(filtered))
}

export function deleteDraftByTypeAndKey(type, key) {
  const drafts = getAllDrafts()
  const filtered = drafts.filter(d => !(d.type === type && d.key === key))
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(filtered))
}

export function clearAllDrafts() {
  localStorage.removeItem(DRAFT_STORAGE_KEY)
}

export function formatDraftTime(timestamp) {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}
