const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { readDB, writeDB } = require('../db');
const { authMiddleware, generateToken } = require('../middleware/auth');

const router = express.Router();

function generateAvatar(nickname) {
  const colors = [
    '#667eea', '#764ba2', '#f093fb', '#f5576c',
    '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
    '#fa709a', '#fee140', '#30cfd0', '#330867'
  ];
  const index = nickname.charCodeAt(0) % colors.length;
  const bgColor = colors[index];
  const initial = nickname.charAt(0).toUpperCase();
  return { bgColor, initial };
}

router.post('/register', async (req, res) => {
  const { email, password, nickname } = req.body;

  if (!email || !password || !nickname) {
    return res.status(400).json({ error: '邮箱、密码和昵称不能为空' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: '请输入有效的邮箱地址' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: '密码至少需要6个字符' });
  }

  if (nickname.length < 2 || nickname.length > 20) {
    return res.status(400).json({ error: '昵称长度需要在2-20个字符之间' });
  }

  const db = readDB();

  const existingUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: '该邮箱已被注册' });
  }

  const existingNickname = db.users.find(u => u.nickname === nickname);
  if (existingNickname) {
    return res.status(400).json({ error: '该昵称已被使用' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const avatar = generateAvatar(nickname);

  const newUser = {
    id: uuidv4(),
    email: email.toLowerCase(),
    password: hashedPassword,
    nickname,
    avatar,
    created_at: Date.now()
  };

  db.users.push(newUser);
  writeDB(db);

  const token = generateToken(newUser.id);

  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      nickname: newUser.nickname,
      avatar: newUser.avatar
    }
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: '邮箱和密码不能为空' });
  }

  const db = readDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }

  const token = generateToken(user.id);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar
    }
  });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

router.post('/logout', authMiddleware, (req, res) => {
  res.json({ message: '退出登录成功' });
});

function extractNickname(req, suffix) {
  const fullPath = decodeURIComponent(req.path);
  let path = fullPath.substring('/profile'.length);
  if (path.startsWith('/')) path = path.substring(1);
  if (suffix && path.endsWith(suffix)) {
    path = path.substring(0, path.length - suffix.length);
    if (path.endsWith('/')) path = path.substring(0, path.length - 1);
  }
  return path;
}

router.get(/^\/profile\/((?!.*\/questions$)(?!.*\/reasons$)(?!.*\/replies$).+)$/, (req, res) => {
  let nickname = extractNickname(req);
  const db = readDB();

  const registeredUser = db.users.find(u => u.nickname === nickname);
  const userQuestions = db.questions.filter(q => q.author_name === nickname);
  const userReasons = db.reasons.filter(r => r.author_name === nickname);
  const userReplies = db.replies.filter(r => r.author_name === nickname);

  if (!registeredUser && userQuestions.length === 0 && userReasons.length === 0 && userReplies.length === 0) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const totalLikes = userReasons.reduce((sum, r) => sum + r.likes, 0) +
                     userReplies.reduce((sum, r) => sum + r.likes, 0);

  let earliestDate = null;
  const allDates = [
    ...userQuestions.map(q => q.created_at),
    ...userReasons.map(r => r.created_at),
    ...userReplies.map(r => r.created_at)
  ];
  if (allDates.length > 0) {
    earliestDate = Math.min(...allDates);
  }

  const userInfo = registeredUser ? {
    id: registeredUser.id,
    nickname: registeredUser.nickname,
    avatar: registeredUser.avatar,
    created_at: registeredUser.created_at,
    is_registered: true
  } : {
    id: null,
    nickname,
    avatar: null,
    created_at: earliestDate,
    is_registered: false
  };

  res.json({
    user: userInfo,
    stats: {
      question_count: userQuestions.length,
      reason_count: userReasons.length,
      reply_count: userReplies.length,
      total_likes: totalLikes
    }
  });
});

router.get(/^\/profile\/.+\/questions$/, (req, res) => {
  let nickname = extractNickname(req, 'questions');
  const { page = 1, limit = 10 } = req.query;
  const db = readDB();

  let questions = db.questions
    .filter(q => q.author_name === nickname)
    .sort((a, b) => b.created_at - a.created_at)
    .map(q => ({
      ...q,
      total_votes: q.votes_a + q.votes_b
    }));

  const start = (page - 1) * limit;
  const end = start + Number(limit);
  const paginated = questions.slice(start, end);

  res.json({
    list: paginated,
    total: questions.length,
    page: Number(page),
    limit: Number(limit)
  });
});

router.get(/^\/profile\/.+\/reasons$/, (req, res) => {
  let nickname = extractNickname(req, 'reasons');
  const { page = 1, limit = 10 } = req.query;
  const db = readDB();

  let reasons = db.reasons
    .filter(r => r.author_name === nickname)
    .sort((a, b) => b.created_at - a.created_at);

  reasons = reasons.map(reason => {
    const question = db.questions.find(q => q.id === reason.question_id);
    return {
      ...reason,
      question_title: question ? question.title : null,
      question_option: question ? (reason.side === 'A' ? question.option_a : question.option_b) : null
    };
  });

  const start = (page - 1) * limit;
  const end = start + Number(limit);
  const paginated = reasons.slice(start, end);

  res.json({
    list: paginated,
    total: reasons.length,
    page: Number(page),
    limit: Number(limit)
  });
});

router.get(/^\/profile\/.+\/replies$/, (req, res) => {
  let nickname = extractNickname(req, 'replies');
  const { page = 1, limit = 10 } = req.query;
  const db = readDB();

  let replies = db.replies
    .filter(r => r.author_name === nickname)
    .sort((a, b) => b.created_at - a.created_at);

  replies = replies.map(reply => {
    const question = db.questions.find(q => q.id === reply.question_id);
    const reason = db.reasons.find(r => r.id === reply.reason_id);
    return {
      ...reply,
      question_title: question ? question.title : null,
      reason_content: reason ? reason.content : null
    };
  });

  const start = (page - 1) * limit;
  const end = start + Number(limit);
  const paginated = replies.slice(start, end);

  res.json({
    list: paginated,
    total: replies.length,
    page: Number(page),
    limit: Number(limit)
  });
});

module.exports = router;
