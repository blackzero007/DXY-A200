const express = require('express');
const { readDB, writeDB } = require('../db');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const { page = 1, limit = 10, sort = 'newest', category, keyword } = req.query;
  const db = readDB();
  
  let questions = [...db.questions];
  
  if (category && category !== '全部') {
    questions = questions.filter(q => q.category === category);
  }
  
  if (keyword && keyword.trim()) {
    const kw = keyword.trim().toLowerCase();
    questions = questions.filter(q => 
      q.title.toLowerCase().includes(kw) || 
      (q.description && q.description.toLowerCase().includes(kw))
    );
  }
  
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
    .sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes) || b.likes - a.likes || b.created_at - a.created_at);

  const reasonsB = db.reasons
    .filter(r => r.question_id === id && r.side === 'B')
    .sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes) || b.likes - a.likes || b.created_at - a.created_at);

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
    .sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes) || b.likes - a.likes || b.created_at - a.created_at)
    .slice(0, 3);

  const topB = db.reasons
    .filter(r => r.question_id === id && r.side === 'B')
    .sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes) || b.likes - a.likes || b.created_at - a.created_at)
    .slice(0, 3);

  res.json({ A: topA, B: topB });
});

router.get('/:id/statistics', (req, res) => {
  const { id } = req.params;
  const db = readDB();

  const question = db.questions.find(q => q.id === id);
  if (!question) {
    return res.status(404).json({ error: '问题不存在' });
  }

  const reasons = db.reasons.filter(r => r.question_id === id);
  const votesA = question.votes_a;
  const votesB = question.votes_b;
  const totalVotes = votesA + votesB;

  const uniqueVoters = new Set();
  reasons.forEach(r => {
    if (r.user_id) {
      uniqueVoters.add(r.user_id);
    } else {
      uniqueVoters.add(r.author_name);
    }
  });

  const dailyMap = {};
  const oneDay = 86400000;

  const startDate = new Date(question.created_at);
  startDate.setHours(0, 0, 0, 0);
  const startTime = startDate.getTime();

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const todayTime = todayDate.getTime();

  for (let t = startTime; t <= todayTime; t += oneDay) {
    const date = new Date(t);
    const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
    dailyMap[dateStr] = { date: dateStr, A: 0, B: 0 };
  }

  reasons.forEach(r => {
    const date = new Date(r.created_at);
    const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
    if (dailyMap[dateStr]) {
      dailyMap[dateStr][r.side] += 1;
    }
  });

  const dailyTrend = Object.values(dailyMap).sort((a, b) => {
    const [mA, dA] = a.date.split('/').map(Number);
    const [mB, dB] = b.date.split('/').map(Number);
    return (mA - mB) || (dA - dB);
  });

  res.json({
    dailyTrend,
    totalVoters: uniqueVoters.size,
    votesA,
    votesB,
    totalVotes,
    percentA: totalVotes > 0 ? (votesA / totalVotes) * 100 : 0,
    percentB: totalVotes > 0 ? (votesB / totalVotes) * 100 : 0,
    optionA: question.option_a,
    optionB: question.option_b
  });
});

const CATEGORIES = ['职场', '情感', '消费', '学业', '科技'];

router.post('/', authMiddleware, (req, res) => {
  const { title, option_a, option_b, description, author_name, category } = req.body;

  if (!title || !option_a || !option_b) {
    return res.status(400).json({ error: '标题和两个选项不能为空' });
  }

  if (option_a === option_b) {
    return res.status(400).json({ error: '两个选项不能相同' });
  }

  if (category && !CATEGORIES.includes(category)) {
    return res.status(400).json({ error: '无效的分类标签' });
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
    author_name: req.user.nickname,
    user_id: req.user.id,
    category: category || '职场',
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

router.post('/:id/vote', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { side, content } = req.body;

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
    author_name: req.user.nickname,
    user_id: req.user.id,
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
