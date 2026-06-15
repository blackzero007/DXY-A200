import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      const event = new CustomEvent('auth:expired');
      window.dispatchEvent(event);
    }
    return Promise.reject(error);
  }
);

export const CATEGORIES = ['职场', '情感', '消费', '学业', '科技'];

export const getQuestions = (params = {}) => {
  return api.get('/questions', { params }).then(res => res.data);
};

export const getQuestion = (id) => {
  return api.get(`/questions/${id}`).then(res => res.data);
};

export const getTopReasons = (id) => {
  return api.get(`/questions/${id}/top-reasons`).then(res => res.data);
};

export const getQuestionStatistics = (id) => {
  return api.get(`/questions/${id}/statistics`).then(res => res.data);
};

export const createQuestion = (data) => {
  return api.post('/questions', data).then(res => res.data);
};

export const voteQuestion = (id, data) => {
  return api.post(`/questions/${id}/vote`, data).then(res => res.data);
};

export const likeReason = (id) => {
  return api.post(`/reasons/${id}/like`).then(res => res.data);
};

export const dislikeReason = (id) => {
  return api.post(`/reasons/${id}/dislike`).then(res => res.data);
};

export const getReplies = (reasonId) => {
  return api.get(`/reasons/${reasonId}/replies`).then(res => res.data);
};

export const replyReason = (reasonId, data) => {
  return api.post(`/reasons/${reasonId}/reply`, data).then(res => res.data);
};

export const likeReply = (replyId) => {
  return api.post(`/reasons/replies/${replyId}/like`).then(res => res.data);
};

export const dislikeReply = (replyId) => {
  return api.post(`/reasons/replies/${replyId}/dislike`).then(res => res.data);
};

export const register = (data) => {
  return api.post('/users/register', data).then(res => res.data);
};

export const login = (data) => {
  return api.post('/users/login', data).then(res => res.data);
};

export const getCurrentUser = () => {
  return api.get('/users/me').then(res => res.data);
};

export const logout = () => {
  return api.post('/users/logout').then(res => res.data);
};

export const getUserProfile = (nickname) => {
  return api.get(`/users/profile/${nickname}`).then(res => res.data);
};

export const getUserQuestions = (nickname, params = {}) => {
  return api.get(`/users/profile/${nickname}/questions`, { params }).then(res => res.data);
};

export const getUserReasons = (nickname, params = {}) => {
  return api.get(`/users/profile/${nickname}/reasons`, { params }).then(res => res.data);
};

export const getUserReplies = (nickname, params = {}) => {
  return api.get(`/users/profile/${nickname}/replies`, { params }).then(res => res.data);
};

export const getFavorites = (params = {}) => {
  return api.get('/users/favorites', { params }).then(res => res.data);
};

export const addFavorite = (questionId) => {
  return api.post(`/users/favorites/${questionId}`).then(res => res.data);
};

export const removeFavorite = (questionId) => {
  return api.delete(`/users/favorites/${questionId}`).then(res => res.data);
};

export const checkFavorite = (questionId) => {
  return api.get(`/users/favorites/check/${questionId}`).then(res => res.data);
};

export const getReportReasons = () => {
  return api.get('/reports/reasons').then(res => res.data);
};

export const createReport = (data) => {
  return api.post('/reports', data).then(res => res.data);
};

export const getReports = (params = {}) => {
  return api.get('/reports', { params }).then(res => res.data);
};

export const updateReportStatus = (reportId, data) => {
  return api.put(`/reports/${reportId}/status`, data).then(res => res.data);
};

export const deleteReport = (reportId) => {
  return api.delete(`/reports/${reportId}`).then(res => res.data);
};

export const getNotifications = (params = {}) => {
  return api.get('/notifications', { params }).then(res => res.data);
};

export const getUnreadNotificationCount = () => {
  return api.get('/notifications/unread-count').then(res => res.data);
};

export const markNotificationAsRead = (notificationId) => {
  return api.post(`/notifications/${notificationId}/read`).then(res => res.data);
};

export const markAllNotificationsAsRead = () => {
  return api.post('/notifications/read-all').then(res => res.data);
};

export const deleteNotification = (notificationId) => {
  return api.delete(`/notifications/${notificationId}`).then(res => res.data);
};

export const clearAllNotifications = () => {
  return api.delete('/notifications').then(res => res.data);
};

export const followUser = (nickname) => {
  return api.post(`/users/follow/${encodeURIComponent(nickname)}`).then(res => res.data);
};

export const unfollowUser = (nickname) => {
  return api.delete(`/users/follow/${encodeURIComponent(nickname)}`).then(res => res.data);
};

export const checkFollowStatus = (nickname) => {
  return api.get(`/users/follow/status/${encodeURIComponent(nickname)}`).then(res => res.data);
};

export const getFollowing = () => {
  return api.get('/users/following').then(res => res.data);
};

export const getFollowFeed = (params = {}) => {
  return api.get('/users/follow/feed', { params }).then(res => res.data);
};

export default api;
