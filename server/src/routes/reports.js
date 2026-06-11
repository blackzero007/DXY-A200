const express = require('express');
const { readDB, writeDB } = require('../db');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const REPORT_REASONS = [
  { value: 'advertisement', label: '广告/推广' },
  { value: 'abuse', label: '辱骂/人身攻击' },
  { value: 'irrelevant', label: '无关内容' },
  { value: 'spam', label: '垃圾信息/重复内容' },
  { value: 'violence', label: '暴力/色情内容' },
  { value: 'other', label: '其他' }
];

const REPORT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  RESOLVED: 'resolved',
  REJECTED: 'rejected'
};

function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
}

router.get('/reasons', (req, res) => {
  res.json(REPORT_REASONS);
});

router.post('/', authMiddleware, (req, res) => {
  const { target_type, target_id, reason, description } = req.body;

  if (!target_type || !target_id || !reason) {
    return res.status(400).json({ error: '举报类型、目标ID和原因不能为空' });
  }

  if (!['reason', 'reply'].includes(target_type)) {
    return res.status(400).json({ error: '无效的举报类型' });
  }

  if (!REPORT_REASONS.some(r => r.value === reason)) {
    return res.status(400).json({ error: '无效的举报原因' });
  }

  const db = readDB();

  let target = null;
  let targetAuthor = null;

  if (target_type === 'reason') {
    target = db.reasons.find(r => r.id === target_id);
    if (!target) {
      return res.status(404).json({ error: '举报的理由不存在' });
    }
    targetAuthor = target.author_name;
  } else {
    target = db.replies.find(r => r.id === target_id);
    if (!target) {
      return res.status(404).json({ error: '举报的回复不存在' });
    }
    targetAuthor = target.author_name;
  }

  const existingReport = db.reports.find(
    r => r.target_type === target_type && 
         r.target_id === target_id && 
         r.reporter_id === req.user.id
  );

  if (existingReport) {
    return res.status(400).json({ error: '您已经举报过该内容' });
  }

  const newReport = {
    id: uuidv4(),
    target_type,
    target_id,
    target_content: target.content,
    target_author: targetAuthor,
    reason,
    description: description || '',
    reporter_id: req.user.id,
    reporter_name: req.user.nickname,
    status: REPORT_STATUS.PENDING,
    created_at: Date.now(),
    processed_at: null,
    processed_by: null,
    processing_note: null
  };

  db.reports.push(newReport);
  writeDB(db);

  res.status(201).json({
    message: '举报提交成功',
    report: newReport
  });
});

router.get('/', authMiddleware, adminMiddleware, (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    status = REPORT_STATUS.PENDING,
    target_type,
    reason 
  } = req.query;

  const db = readDB();
  let reports = [...db.reports];

  if (status !== 'all') {
    reports = reports.filter(r => r.status === status);
  }

  if (target_type) {
    reports = reports.filter(r => r.target_type === target_type);
  }

  if (reason) {
    reports = reports.filter(r => r.reason === reason);
  }

  reports.sort((a, b) => b.created_at - a.created_at);

  const start = (page - 1) * limit;
  const end = start + Number(limit);
  const paginated = reports.slice(start, end);

  const result = paginated.map(report => {
    const questionId = report.target_type === 'reason' 
      ? (db.reasons.find(r => r.id === report.target_id)?.question_id)
      : (db.replies.find(r => r.id === report.target_id)?.question_id);
    
    const question = db.questions.find(q => q.id === questionId);
    
    return {
      ...report,
      question_title: question?.title || null,
      question_id: questionId || null
    };
  });

  const statusCounts = {
    all: db.reports.length,
    pending: db.reports.filter(r => r.status === REPORT_STATUS.PENDING).length,
    processing: db.reports.filter(r => r.status === REPORT_STATUS.PROCESSING).length,
    resolved: db.reports.filter(r => r.status === REPORT_STATUS.RESOLVED).length,
    rejected: db.reports.filter(r => r.status === REPORT_STATUS.REJECTED).length
  };

  res.json({
    list: result,
    total: reports.length,
    page: Number(page),
    limit: Number(limit),
    status_counts: statusCounts
  });
});

router.put('/:id/status', authMiddleware, adminMiddleware, (req, res) => {
  const { id } = req.params;
  const { status, processing_note } = req.body;

  if (!Object.values(REPORT_STATUS).includes(status)) {
    return res.status(400).json({ error: '无效的状态' });
  }

  const db = readDB();
  const report = db.reports.find(r => r.id === id);

  if (!report) {
    return res.status(404).json({ error: '举报不存在' });
  }

  report.status = status;
  report.processed_at = Date.now();
  report.processed_by = req.user.nickname;
  report.processing_note = processing_note || null;

  if (status === REPORT_STATUS.RESOLVED) {
    if (report.target_type === 'reason') {
      const reasonIndex = db.reasons.findIndex(r => r.id === report.target_id);
      if (reasonIndex !== -1) {
        db.reasons.splice(reasonIndex, 1);
        
        db.replies = db.replies.filter(r => r.reason_id !== report.target_id);
      }
    } else {
      const replyIndex = db.replies.findIndex(r => r.id === report.target_id);
      if (replyIndex !== -1) {
        const reply = db.replies[replyIndex];
        db.replies.splice(replyIndex, 1);
        
        const reason = db.reasons.find(r => r.id === reply.reason_id);
        if (reason) {
          reason.reply_count = Math.max(0, reason.reply_count - 1);
        }
        
        const deleteNestedReplies = (parentId) => {
          const nested = db.replies.filter(r => r.parent_id === parentId);
          nested.forEach(n => {
            const idx = db.replies.findIndex(r => r.id === n.id);
            if (idx !== -1) {
              db.replies.splice(idx, 1);
              if (reason) {
                reason.reply_count = Math.max(0, reason.reply_count - 1);
              }
              deleteNestedReplies(n.id);
            }
          });
        };
        deleteNestedReplies(reply.id);
      }
    }
  }

  writeDB(db);

  res.json({
    message: '举报处理成功',
    report
  });
});

router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { id } = req.params;
  const db = readDB();

  const reportIndex = db.reports.findIndex(r => r.id === id);
  if (reportIndex === -1) {
    return res.status(404).json({ error: '举报不存在' });
  }

  db.reports.splice(reportIndex, 1);
  writeDB(db);

  res.json({ message: '举报记录已删除' });
});

module.exports = router;
