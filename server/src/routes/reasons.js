const express = require('express');
const { readDB, writeDB } = require('../db');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const { createNotification } = require('./notifications');

const router = express.Router();

function findUserByNickname(db, nickname) {
  return db.users.find(u => u.nickname === nickname);
}

function truncateContent(content, maxLength = 50) {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
}

router.post('/:id/like', authMiddleware, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  
  const reason = db.reasons.find(r => r.id === id);
  if (!reason) {
    return res.status(404).json({ error: '理由不存在' });
  }

  reason.likes += 1;

  const reasonAuthor = findUserByNickname(db, reason.author_name);
  if (reasonAuthor && reasonAuthor.id !== req.user.id) {
    const question = db.questions.find(q => q.id === reason.question_id);
    createNotification(db, {
      user_id: reasonAuthor.id,
      type: 'like',
      title: '你的理由收到了点赞',
      content: `${req.user.nickname} 点赞了你的理由："${truncateContent(reason.content)}"`,
      reason_id: reason.id,
      question_id: reason.question_id,
      actor_name: req.user.nickname
    });
  }

  writeDB(db);
  
  res.json(reason);
});

router.post('/:id/dislike', authMiddleware, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  
  const reason = db.reasons.find(r => r.id === id);
  if (!reason) {
    return res.status(404).json({ error: '理由不存在' });
  }

  reason.dislikes += 1;

  const reasonAuthor = findUserByNickname(db, reason.author_name);
  if (reasonAuthor && reasonAuthor.id !== req.user.id) {
    const question = db.questions.find(q => q.id === reason.question_id);
    createNotification(db, {
      user_id: reasonAuthor.id,
      type: 'dislike',
      title: '你的理由收到了点踩',
      content: `${req.user.nickname} 点踩了你的理由："${truncateContent(reason.content)}"`,
      reason_id: reason.id,
      question_id: reason.question_id,
      actor_name: req.user.nickname
    });
  }

  writeDB(db);
  
  res.json(reason);
});

router.get('/:id/replies', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  
  const reason = db.reasons.find(r => r.id === id);
  if (!reason) {
    return res.status(404).json({ error: '理由不存在' });
  }

  const allReplies = db.replies.filter(r => r.reason_id === id);

  const replyMap = new Map();
  const rootReplies = [];

  allReplies.forEach(reply => {
    replyMap.set(reply.id, { ...reply, replies: [] });
  });

  allReplies.forEach(reply => {
    const replyNode = replyMap.get(reply.id);
    if (reply.parent_id && replyMap.has(reply.parent_id)) {
      replyMap.get(reply.parent_id).replies.push(replyNode);
    } else {
      rootReplies.push(replyNode);
    }
  });

  rootReplies.sort((a, b) => a.created_at - b.created_at);

  res.json(rootReplies);
});

router.post('/:id/reply', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { content, parent_id, question_id } = req.body;

  if (!content || content.trim().length < 2) {
    return res.status(400).json({ error: '回复内容至少2个字' });
  }

  const db = readDB();
  
  const reason = db.reasons.find(r => r.id === id);
  if (!reason) {
    return res.status(404).json({ error: '理由不存在' });
  }

  if (parent_id) {
    const parentReply = db.replies.find(r => r.id === parent_id);
    if (!parentReply) {
      return res.status(400).json({ error: '回复的评论不存在' });
    }
  }

  const replyId = uuidv4();
  const now = Date.now();
  const qId = question_id || reason.question_id;
  const authorName = req.user.nickname;

  const newReply = {
    id: replyId,
    reason_id: id,
    question_id: qId,
    parent_id: parent_id || null,
    content: content.trim(),
    author_name: authorName,
    created_at: now,
    likes: 0,
    dislikes: 0
  };

  db.replies.push(newReply);
  
  reason.reply_count += 1;

  const reasonAuthor = findUserByNickname(db, reason.author_name);
  if (reasonAuthor && reasonAuthor.id !== req.user.id) {
    const question = db.questions.find(q => q.id === qId);
    createNotification(db, {
      user_id: reasonAuthor.id,
      type: 'reply',
      title: '你的理由收到了新回复',
      content: `${req.user.nickname} 回复了你的理由："${truncateContent(content.trim())}"`,
      reason_id: reason.id,
      reply_id: replyId,
      question_id: qId,
      actor_name: req.user.nickname
    });
  }

  if (parent_id) {
    const parentReply = db.replies.find(r => r.id === parent_id);
    if (parentReply) {
      const parentAuthor = findUserByNickname(db, parentReply.author_name);
      if (parentAuthor && parentAuthor.id !== req.user.id && (!reasonAuthor || parentAuthor.id !== reasonAuthor.id)) {
        createNotification(db, {
          user_id: parentAuthor.id,
          type: 'reply',
          title: '你的回复收到了新回复',
          content: `${req.user.nickname} 回复了你："${truncateContent(content.trim())}"`,
          reason_id: reason.id,
          reply_id: replyId,
          question_id: qId,
          actor_name: req.user.nickname
        });
      }
    }
  }

  writeDB(db);

  res.status(201).json({ ...newReply, replies: [] });
});

router.post('/replies/:replyId/like', authMiddleware, (req, res) => {
  const { replyId } = req.params;
  const db = readDB();
  
  const reply = db.replies.find(r => r.id === replyId);
  if (!reply) {
    return res.status(404).json({ error: '回复不存在' });
  }

  reply.likes += 1;

  const replyAuthor = findUserByNickname(db, reply.author_name);
  if (replyAuthor && replyAuthor.id !== req.user.id) {
    createNotification(db, {
      user_id: replyAuthor.id,
      type: 'like',
      title: '你的回复收到了点赞',
      content: `${req.user.nickname} 点赞了你的回复："${truncateContent(reply.content)}"`,
      reply_id: reply.id,
      reason_id: reply.reason_id,
      question_id: reply.question_id,
      actor_name: req.user.nickname
    });
  }

  writeDB(db);
  
  res.json(reply);
});

router.post('/replies/:replyId/dislike', authMiddleware, (req, res) => {
  const { replyId } = req.params;
  const db = readDB();
  
  const reply = db.replies.find(r => r.id === replyId);
  if (!reply) {
    return res.status(404).json({ error: '回复不存在' });
  }

  reply.dislikes += 1;

  const replyAuthor = findUserByNickname(db, reply.author_name);
  if (replyAuthor && replyAuthor.id !== req.user.id) {
    createNotification(db, {
      user_id: replyAuthor.id,
      type: 'dislike',
      title: '你的回复收到了点踩',
      content: `${req.user.nickname} 点踩了你的回复："${truncateContent(reply.content)}"`,
      reply_id: reply.id,
      reason_id: reply.reason_id,
      question_id: reply.question_id,
      actor_name: req.user.nickname
    });
  }

  writeDB(db);
  
  res.json(reply);
});

module.exports = { router };
