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
    role: 'user',
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
      avatar: newUser.avatar,
      role: newUser.role
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
      avatar: user.avatar,
      role: user.role
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

router.get('/favorites', authMiddleware, (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const db = readDB();
  const userId = req.user.id;

  const userFavorites = db.favorites
    .filter(f => f.user_id === userId)
    .sort((a, b) => b.created_at - a.created_at);

  const favoriteQuestions = userFavorites.map(fav => {
    const question = db.questions.find(q => q.id === fav.question_id);
    if (!question) return null;
    return {
      ...question,
      total_votes: question.votes_a + question.votes_b,
      favorited_at: fav.created_at
    };
  }).filter(Boolean);

  const start = (page - 1) * limit;
  const end = start + Number(limit);
  const paginated = favoriteQuestions.slice(start, end);

  res.json({
    list: paginated,
    total: favoriteQuestions.length,
    page: Number(page),
    limit: Number(limit)
  });
});

router.post('/favorites/:questionId', authMiddleware, (req, res) => {
  const { questionId } = req.params;
  const db = readDB();
  const userId = req.user.id;

  const question = db.questions.find(q => q.id === questionId);
  if (!question) {
    return res.status(404).json({ error: '问题不存在' });
  }

  const existingFavorite = db.favorites.find(
    f => f.user_id === userId && f.question_id === questionId
  );
  if (existingFavorite) {
    return res.status(400).json({ error: '已经收藏过这个问题了' });
  }

  const newFavorite = {
    id: uuidv4(),
    user_id: userId,
    question_id: questionId,
    created_at: Date.now()
  };

  db.favorites.push(newFavorite);
  writeDB(db);

  res.status(201).json({
    message: '收藏成功',
    favorite: newFavorite
  });
});

router.delete('/favorites/:questionId', authMiddleware, (req, res) => {
  const { questionId } = req.params;
  const db = readDB();
  const userId = req.user.id;

  const favoriteIndex = db.favorites.findIndex(
    f => f.user_id === userId && f.question_id === questionId
  );

  if (favoriteIndex === -1) {
    return res.status(404).json({ error: '未找到该收藏' });
  }

  db.favorites.splice(favoriteIndex, 1);
  writeDB(db);

  res.json({ message: '取消收藏成功' });
});

router.get('/favorites/check/:questionId', authMiddleware, (req, res) => {
  const { questionId } = req.params;
  const db = readDB();
  const userId = req.user.id;

  const isFavorited = db.favorites.some(
    f => f.user_id === userId && f.question_id === questionId
  );

  res.json({ is_favorited: isFavorited });
});

router.post('/follow/:nickname', authMiddleware, (req, res) => {
  const { nickname } = req.params;
  const db = readDB();
  const userId = req.user.id;
  const userNickname = req.user.nickname;

  if (nickname === userNickname) {
    return res.status(400).json({ error: '不能关注自己' });
  }

  const registeredUser = db.users.find(u => u.nickname === nickname);
  const userQuestions = db.questions.filter(q => q.author_name === nickname);
  const userReasons = db.reasons.filter(r => r.author_name === nickname);
  const userReplies = db.replies.filter(r => r.author_name === nickname);

  if (!registeredUser && userQuestions.length === 0 && userReasons.length === 0 && userReplies.length === 0) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const existingFollow = db.follows.find(
    f => f.follower_id === userId && f.following_nickname === nickname
  );
  if (existingFollow) {
    return res.status(400).json({ error: '已经关注了该用户' });
  }

  const newFollow = {
    id: uuidv4(),
    follower_id: userId,
    following_nickname: nickname,
    created_at: Date.now()
  };

  db.follows.push(newFollow);
  writeDB(db);

  res.status(201).json({
    message: '关注成功',
    follow: newFollow
  });
});

router.delete('/follow/:nickname', authMiddleware, (req, res) => {
  const { nickname } = req.params;
  const db = readDB();
  const userId = req.user.id;

  const followIndex = db.follows.findIndex(
    f => f.follower_id === userId && f.following_nickname === nickname
  );

  if (followIndex === -1) {
    return res.status(404).json({ error: '未关注该用户' });
  }

  db.follows.splice(followIndex, 1);
  writeDB(db);

  res.json({ message: '取消关注成功' });
});

router.get('/follow/status/:nickname', authMiddleware, (req, res) => {
  const { nickname } = req.params;
  const db = readDB();
  const userId = req.user.id;

  const isFollowing = db.follows.some(
    f => f.follower_id === userId && f.following_nickname === nickname
  );

  res.json({ is_following: isFollowing });
});

router.get('/following', authMiddleware, (req, res) => {
  const db = readDB();
  const userId = req.user.id;

  const followingList = db.follows
    .filter(f => f.follower_id === userId)
    .sort((a, b) => b.created_at - a.created_at)
    .map(f => {
      const followedUser = db.users.find(u => u.nickname === f.following_nickname);
      return {
        nickname: f.following_nickname,
        avatar: followedUser ? followedUser.avatar : generateAvatar(f.following_nickname),
        followed_at: f.created_at
      };
    });

  res.json({ list: followingList });
});

router.get('/follow/feed', authMiddleware, (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const db = readDB();
  const userId = req.user.id;

  const followingNicknames = db.follows
    .filter(f => f.follower_id === userId)
    .map(f => f.following_nickname);

  if (followingNicknames.length === 0) {
    return res.json({ list: [], total: 0, page: Number(page), limit: Number(limit) });
  }

  const activities = [];

  const questions = db.questions
    .filter(q => followingNicknames.includes(q.author_name))
    .map(q => ({
      type: 'question',
      id: q.id,
      title: q.title,
      description: q.description,
      option_a: q.option_a,
      option_b: q.option_b,
      votes_a: q.votes_a,
      votes_b: q.votes_b,
      total_votes: q.votes_a + q.votes_b,
      category: q.category,
      author_name: q.author_name,
      created_at: q.created_at
    }));
  activities.push(...questions);

  const reasons = db.reasons
    .filter(r => followingNicknames.includes(r.author_name))
    .map(r => {
      const question = db.questions.find(q => q.id === r.question_id);
      return {
        type: 'vote',
        id: r.id,
        question_id: r.question_id,
        question_title: question ? question.title : null,
        side: r.side,
        content: r.content,
        option_label: question ? (r.side === 'A' ? question.option_a : question.option_b) : null,
        likes: r.likes,
        reply_count: r.reply_count,
        author_name: r.author_name,
        created_at: r.created_at
      };
    });
  activities.push(...reasons);

  activities.sort((a, b) => b.created_at - a.created_at);

  const start = (page - 1) * limit;
  const end = start + Number(limit);
  const paginated = activities.slice(start, end);

  res.json({
    list: paginated,
    total: activities.length,
    page: Number(page),
    limit: Number(limit)
  });
});

module.exports = router;
