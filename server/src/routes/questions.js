const express = require('express');
const { readDB, writeDB } = require('../db');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.get('/', (req, res) => {
  const { page = 1, limit = 10, sort = 'newest' } = req.query;
  const db = readDB();
  
  let questions = [...db.questions];
  
  if (sort === 'hot') {
    questions.sort((a, b) => (b.votes_a + b.votes_b) - (a.votes_a + a.votes_b) || b.created_at - a.created_at);
  } else {
    questions.sort((a, b) => b.created_at - a.created_at);
  }

  const start = (page - 1) * limit;
  const end = start + Number(limit);
  const paginated = questions.slice(start, end);

  res.json({
    list: paginated.map(q => ({
      ...q,
      total_votes: q.votes_a + q.votes_b
    })),
    total: questions.length,
    page: Number(page),
    limit: Number(limit)
  });
});

router.get('/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  
  const question = db.questions.find(q => q.id === id);
  
  if (!question) {
    return res.status(404).json({ error: '问题不存在' });
  }

  const reasonsA = db.reasons
    .filter(r => r.question_id === id && r.side === 'A')
    .sort((a, b) => b.likes - a.likes || b.created_at - a.created_at);

  const reasonsB = db.reasons
    .filter(r => r.question_id === id && r.side === 'B')
    .sort((a, b) => b.likes - a.likes || b.created_at - a.created_at);

  res.json({
    ...question,
    total_votes: question.votes_a + question.votes_b,
    reasons: {
      A: reasonsA,
      B: reasonsB
    }
  });
});

router.get('/:id/top-reasons', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  
  const topA = db.reasons
    .filter(r => r.question_id === id && r.side === 'A')
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 3);

  const topB = db.reasons
    .filter(r => r.question_id === id && r.side === 'B')
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 3);

  res.json({ A: topA, B: topB });
});

router.post('/', (req, res) => {
  const { title, option_a, option_b, description, author_name } = req.body;

  if (!title || !option_a || !option_b) {
    return res.status(400).json({ error: '标题和两个选项不能为空' });
  }

  if (option_a === option_b) {
    return res.status(400).json({ error: '两个选项不能相同' });
  }

  const db = readDB();
  const id = uuidv4();
  const now = Date.now();

  const newQuestion = {
    id,
    title,
    option_a,
    option_b,
    description: description || null,
    author_name: author_name || '匿名用户',
    created_at: now,
    votes_a: 0,
    votes_b: 0
  };

  db.questions.unshift(newQuestion);
  writeDB(db);
  
  res.status(201).json({
    ...newQuestion,
    total_votes: 0,
    reasons: { A: [], B: [] }
  });
});

router.post('/:id/vote', (req, res) => {
  const { id } = req.params;
  const { side, content, author_name } = req.body;

  if (!side || !['A', 'B'].includes(side)) {
    return res.status(400).json({ error: '请选择支持哪一边' });
  }

  if (!content || content.trim().length < 5) {
    return res.status(400).json({ error: '理由至少写5个字吧' });
  }

  const db = readDB();
  const question = db.questions.find(q => q.id === id);
  
  if (!question) {
    return res.status(404).json({ error: '问题不存在' });
  }

  const reasonId = uuidv4();
  const now = Date.now();

  const newReason = {
    id: reasonId,
    question_id: id,
    side,
    content: content.trim(),
    author_name: author_name || '匿名用户',
    created_at: now,
    likes: 0,
    dislikes: 0,
    reply_count: 0
  };

  db.reasons.unshift(newReason);

  if (side === 'A') {
    question.votes_a += 1;
  } else {
    question.votes_b += 1;
  }

  writeDB(db);

  res.status(201).json({
    reason: newReason,
    question: {
      ...question,
      total_votes: question.votes_a + question.votes_b
    }
  });
});

module.exports = router;
