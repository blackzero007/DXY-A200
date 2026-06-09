const express = require('express');
const { readDB, writeDB } = require('../db');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.post('/:id/like', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  
  const reason = db.reasons.find(r => r.id === id);
  if (!reason) {
    return res.status(404).json({ error: '理由不存在' });
  }

  reason.likes += 1;
  writeDB(db);
  
  res.json(reason);
});

router.post('/:id/dislike', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  
  const reason = db.reasons.find(r => r.id === id);
  if (!reason) {
    return res.status(404).json({ error: '理由不存在' });
  }

  reason.dislikes += 1;
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

router.post('/:id/reply', (req, res) => {
  const { id } = req.params;
  const { content, author_name, parent_id, question_id } = req.body;

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

  const newReply = {
    id: replyId,
    reason_id: id,
    question_id: qId,
    parent_id: parent_id || null,
    content: content.trim(),
    author_name: author_name || '匿名用户',
    created_at: now,
    likes: 0,
    dislikes: 0
  };

  db.replies.push(newReply);
  
  reason.reply_count += 1;

  writeDB(db);

  res.status(201).json({ ...newReply, replies: [] });
});

router.post('/replies/:replyId/like', (req, res) => {
  const { replyId } = req.params;
  const db = readDB();
  
  const reply = db.replies.find(r => r.id === replyId);
  if (!reply) {
    return res.status(404).json({ error: '回复不存在' });
  }

  reply.likes += 1;
  writeDB(db);
  
  res.json(reply);
});

router.post('/replies/:replyId/dislike', (req, res) => {
  const { replyId } = req.params;
  const db = readDB();
  
  const reply = db.replies.find(r => r.id === replyId);
  if (!reply) {
    return res.status(404).json({ error: '回复不存在' });
  }

  reply.dislikes += 1;
  writeDB(db);
  
  res.json(reply);
});

module.exports = router;
