const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readDB, writeDB } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

function createNotification(db, notification) {
  const newNotification = {
    id: uuidv4(),
    user_id: notification.user_id,
    type: notification.type,
    title: notification.title,
    content: notification.content,
    reason_id: notification.reason_id || null,
    reply_id: notification.reply_id || null,
    question_id: notification.question_id || null,
    actor_name: notification.actor_name || '匿名用户',
    is_read: false,
    created_at: Date.now()
  };
  db.notifications.push(newNotification);
  return newNotification;
}

router.get('/', authMiddleware, (req, res) => {
  const { page = 1, limit = 20, unread_only = false } = req.query;
  const db = readDB();
  const userId = req.user.id;

  let notifications = db.notifications
    .filter(n => n.user_id === userId)
    .sort((a, b) => b.created_at - a.created_at);

  if (unread_only === 'true') {
    notifications = notifications.filter(n => !n.is_read);
  }

  notifications = notifications.map(n => {
    let questionTitle = null;
    if (n.question_id) {
      const question = db.questions.find(q => q.id === n.question_id);
      questionTitle = question ? question.title : null;
    }
    return { ...n, question_title: questionTitle };
  });

  const start = (page - 1) * limit;
  const end = start + Number(limit);
  const paginated = notifications.slice(start, end);

  const unreadCount = db.notifications.filter(n => n.user_id === userId && !n.is_read).length;

  res.json({
    list: paginated,
    total: notifications.length,
    unread_count: unreadCount,
    page: Number(page),
    limit: Number(limit)
  });
});

router.get('/unread-count', authMiddleware, (req, res) => {
  const db = readDB();
  const userId = req.user.id;

  const unreadCount = db.notifications.filter(n => n.user_id === userId && !n.is_read).length;

  res.json({ unread_count: unreadCount });
});

router.post('/:id/read', authMiddleware, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const userId = req.user.id;

  const notification = db.notifications.find(n => n.id === id && n.user_id === userId);
  if (!notification) {
    return res.status(404).json({ error: '通知不存在' });
  }

  notification.is_read = true;
  writeDB(db);

  const unreadCount = db.notifications.filter(n => n.user_id === userId && !n.is_read).length;

  res.json({ notification, unread_count: unreadCount });
});

router.post('/read-all', authMiddleware, (req, res) => {
  const db = readDB();
  const userId = req.user.id;

  db.notifications.forEach(n => {
    if (n.user_id === userId && !n.is_read) {
      n.is_read = true;
    }
  });

  writeDB(db);

  res.json({ message: '已全部标记为已读', unread_count: 0 });
});

router.delete('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const userId = req.user.id;

  const index = db.notifications.findIndex(n => n.id === id && n.user_id === userId);
  if (index === -1) {
    return res.status(404).json({ error: '通知不存在' });
  }

  db.notifications.splice(index, 1);
  writeDB(db);

  const unreadCount = db.notifications.filter(n => n.user_id === userId && !n.is_read).length;

  res.json({ message: '删除成功', unread_count: unreadCount });
});

router.delete('/', authMiddleware, (req, res) => {
  const db = readDB();
  const userId = req.user.id;

  db.notifications = db.notifications.filter(n => n.user_id !== userId);
  writeDB(db);

  res.json({ message: '已清空所有通知', unread_count: 0 });
});

module.exports = { router, createNotification };
