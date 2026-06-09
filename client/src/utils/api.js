import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

export const getQuestions = (params = {}) => {
  return api.get('/questions', { params }).then(res => res.data);
};

export const getQuestion = (id) => {
  return api.get(`/questions/${id}`).then(res => res.data);
};

export const getTopReasons = (id) => {
  return api.get(`/questions/${id}/top-reasons`).then(res => res.data);
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

export default api;
