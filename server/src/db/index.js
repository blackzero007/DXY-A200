const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dataDir = path.join(__dirname, '..', '..', 'data');
const dbPath = path.join(dataDir, 'dilemma.json');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readDB() {
  ensureDataDir();
  if (!fs.existsSync(dbPath)) {
    return { questions: [], reasons: [], replies: [], users: [], sessions: [] };
  }
  try {
    const data = fs.readFileSync(dbPath, 'utf-8');
    const db = JSON.parse(data);
    if (!db.users) db.users = [];
    if (!db.sessions) db.sessions = [];
    return db;
  } catch (err) {
    console.error('读取数据库失败:', err);
    return { questions: [], reasons: [], replies: [], users: [], sessions: [] };
  }
}

function writeDB(db) {
  ensureDataDir();
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
}

function initDatabase() {
  ensureDataDir();
  
  if (fs.existsSync(dbPath)) {
    console.log('数据库已存在，跳过初始化');
    return;
  }

  const now = Date.now();

  const questions = [
    {
      id: uuidv4(),
      title: '留在大城市打拼还是回老家发展？',
      option_a: '留在大城市',
      option_b: '回老家发展',
      description: '28岁，在一线城市工作5年，年薪25万，房价高压力大。老家省会有房，父母在身边，但机会少工资低。该怎么选？',
      author_name: '迷茫的年轻人',
      created_at: now - 86400000 * 3,
      votes_a: 156,
      votes_b: 98
    },
    {
      id: uuidv4(),
      title: '买MacBook还是Windows笔记本？',
      option_a: 'MacBook Pro',
      option_b: 'Windows笔记本',
      description: '程序员，主要写前端和Node.js，偶尔玩游戏。预算1万5左右，纠结Mac的生态还是Windows的兼容性。',
      author_name: '码农小张',
      created_at: now - 86400000 * 2,
      votes_a: 203,
      votes_b: 178
    },
    {
      id: uuidv4(),
      title: '考研还是直接工作？',
      option_a: '考研深造',
      option_b: '直接工作',
      description: '大三计算机专业，成绩中等。读研怕浪费三年时间，工作又怕学历不够以后发展受限。',
      author_name: '大三学生',
      created_at: now - 86400000,
      votes_a: 120,
      votes_b: 145
    }
  ];

  const reasons = [];
  const replies = [];

  const reasonsData = [
    {
      qIdx: 0,
      side: 'A',
      content: '大城市机会多，年轻时不拼一把以后会后悔。虽然压力大，但成长速度也是老家比不了的。',
      author: '北漂老司机',
      likes: 89,
      dislikes: 12,
      replies: [
        { content: '同意！35岁之前在大城市积累经验和人脉，以后回老家也有资本。', author: '奋斗青年', likes: 23, dislikes: 3 },
        { content: '但一直漂着也不是办法啊，买房成家怎么办？', author: '现实派', likes: 15, dislikes: 8 }
      ]
    },
    {
      qIdx: 0,
      side: 'A',
      content: '资源和眼界不一样。在大厂工作3年，比老家小公司混10年学到的都多。',
      author: '产品经理老王',
      likes: 67,
      dislikes: 8,
      replies: []
    },
    {
      qIdx: 0,
      side: 'A',
      content: '大城市更公平，靠能力吃饭，回老家可能全靠关系。',
      author: '理想主义者',
      likes: 54,
      dislikes: 15,
      replies: [
        { content: '太真实了，小地方人情社会太严重。', author: '过来人', likes: 18, dislikes: 2 }
      ]
    },
    {
      qIdx: 0,
      side: 'B',
      content: '生活质量最重要。老家有房有车，陪伴父母，幸福感比大城市高太多了。',
      author: '回乡青年',
      likes: 72,
      dislikes: 20,
      replies: [
        { content: '但孩子的教育资源呢？小城市的教育和大城市差很多。', author: '纠结的爸爸', likes: 25, dislikes: 5 }
      ]
    },
    {
      qIdx: 0,
      side: 'B',
      content: '身体健康最重要。大城市996透支生命，钱挣了但人废了，得不偿失。',
      author: '养生达人',
      likes: 45,
      dislikes: 18,
      replies: []
    },
    {
      qIdx: 0,
      side: 'B',
      content: '父母一天天老了，子欲养而亲不待。钱什么时候都能挣，陪伴是有限的。',
      author: '孝顺的孩子',
      likes: 61,
      dislikes: 10,
      replies: []
    },
    {
      qIdx: 1,
      side: 'A',
      content: 'Mac的Unix终端太舒服了，开发体验完爆Windows。而且电池续航强，出差方便。',
      author: '全栈开发者',
      likes: 112,
      dislikes: 15,
      replies: [
        { content: 'M系列芯片的Mac确实香，编译速度快太多了。', author: 'Apple粉丝', likes: 34, dislikes: 5 }
      ]
    },
    {
      qIdx: 1,
      side: 'A',
      content: '系统稳定不折腾，不用天天杀毒清理垃圾。把时间花在写代码上，不是折腾系统。',
      author: '效率至上',
      likes: 78,
      dislikes: 22,
      replies: []
    },
    {
      qIdx: 1,
      side: 'A',
      content: '如果是前端开发，Mac是行业标配，面试的时候人都有你没有怪怪的。',
      author: 'HR小姐姐',
      likes: 45,
      dislikes: 30,
      replies: [
        { content: '不会吧，我们公司全是Windows也没怎么样。', author: '微软党', likes: 12, dislikes: 8 }
      ]
    },
    {
      qIdx: 1,
      side: 'B',
      content: '游戏党表示不能没有Windows，1万5可以配个配置爆炸的游戏本了。',
      author: '游戏玩家',
      likes: 95,
      dislikes: 18,
      replies: []
    },
    {
      qIdx: 1,
      side: 'B',
      content: '软件兼容性更好，很多专业软件只有Windows版。而且文件管理更灵活。',
      author: '实用主义',
      likes: 67,
      dislikes: 25,
      replies: []
    },
    {
      qIdx: 1,
      side: 'B',
      content: '同样的价格，Windows配置高很多，性价比更高。',
      author: '性价比党',
      likes: 56,
      dislikes: 33,
      replies: [
        { content: '但Mac用个五六年不卡，Windows两三年就慢了，长期来看差不多。', author: '老Mac用户', likes: 28, dislikes: 10 }
      ]
    },
    {
      qIdx: 2,
      side: 'A',
      content: '现在好公司门槛越来越高，研究生学历是基本盘。本科学历以后升职加薪都受限。',
      author: '985硕士',
      likes: 78,
      dislikes: 20,
      replies: []
    },
    {
      qIdx: 2,
      side: 'A',
      content: '研究生期间可以好好做项目、实习，起点比本科高很多。',
      author: '考研上岸',
      likes: 56,
      dislikes: 15,
      replies: [
        { content: '但三年工作经验也很重要啊，特别是互联网行业。', author: '职场老鸟', likes: 19, dislikes: 6 }
      ]
    },
    {
      qIdx: 2,
      side: 'A',
      content: '如果想进大厂或者国企，研究生学历真的很重要。很多岗位直接卡学历。',
      author: '面试官',
      likes: 63,
      dislikes: 12,
      replies: []
    },
    {
      qIdx: 2,
      side: 'B',
      content: '互联网行业变化太快，三年工作经验比读研值钱多了。能力比学历重要。',
      author: '技术总监',
      likes: 89,
      dislikes: 25,
      replies: [
        { content: '但大公司简历筛选的时候，学历不够直接被刷，能力都没机会展示。', author: '求职者', likes: 22, dislikes: 8 }
      ]
    },
    {
      qIdx: 2,
      side: 'B',
      content: '早点经济独立，不花家里钱，这种感觉真的很好。',
      author: '独立青年',
      likes: 45,
      dislikes: 18,
      replies: []
    },
    {
      qIdx: 2,
      side: 'B',
      content: '三年时间，你可能已经从小白成长为高级开发了。而研究生毕业可能还在找工作。',
      author: '三年老兵',
      likes: 52,
      dislikes: 30,
      replies: []
    }
  ];

  reasonsData.forEach(r => {
    const qId = questions[r.qIdx].id;
    const reasonId = uuidv4();
    const reason = {
      id: reasonId,
      question_id: qId,
      side: r.side,
      content: r.content,
      author_name: r.author,
      created_at: now - Math.floor(Math.random() * 86400000),
      likes: r.likes,
      dislikes: r.dislikes,
      reply_count: r.replies.length
    };
    reasons.push(reason);

    r.replies.forEach(reply => {
      replies.push({
        id: uuidv4(),
        reason_id: reasonId,
        question_id: qId,
        parent_id: null,
        content: reply.content,
        author_name: reply.author,
        created_at: now - Math.floor(Math.random() * 43200000),
        likes: reply.likes,
        dislikes: reply.dislikes
      });
    });
  });

  const db = { questions, reasons, replies };
  writeDB(db);
  console.log('数据库初始化完成');
  console.log(`插入了 ${questions.length} 个问题`);
  console.log(`插入了 ${reasons.length} 条理由`);
  console.log(`插入了 ${replies.length} 条回复`);
}

module.exports = { readDB, writeDB, initDatabase };
