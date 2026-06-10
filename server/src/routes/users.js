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

module.exports = router;
