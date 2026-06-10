const { initDatabase, db } = require('./index');
const { v4: uuidv4 } = require('uuid');

initDatabase();

const now = Date.now();

const questions = [
  {
    id: uuidv4(),
    title: '留在大城市打拼还是回老家发展？',
    option_a: '留在大城市',
    option_b: '回老家发展',
    description: '28岁，在一线城市工作5年，年薪25万，房价高压力大。老家省会有房，父母在身边，但机会少工资低。该怎么选？',
    author_name: '迷茫的年轻人',
    category: '职场',
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
    category: '科技',
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
    category: '学业',
    created_at: now - 86400000,
    votes_a: 120,
    votes_b: 145
  }
];

const insertQuestion = db.prepare(`
  INSERT INTO questions (id, title, option_a, option_b, description, author_name, created_at, votes_a, votes_b)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertReason = db.prepare(`
  INSERT INTO reasons (id, question_id, side, content, author_name, created_at, likes, dislikes, reply_count)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertReply = db.prepare(`
  INSERT INTO reason_replies (id, reason_id, question_id, parent_id, content, author_name, created_at, likes, dislikes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const reasonsData = [
  {
    questionIdx: 0,
    side: 'A',
    content: '大城市机会多，年轻时不拼一把以后会后悔。虽然压力大，但成长速度也是老家比不了的。',
    author_name: '北漂老司机',
    likes: 89,
    dislikes: 12,
    replies: [
      { content: '同意！35岁之前在大城市积累经验和人脉，以后回老家也有资本。', author_name: '奋斗青年', likes: 23, dislikes: 3 },
      { content: '但一直漂着也不是办法啊，买房成家怎么办？', author_name: '现实派', likes: 15, dislikes: 8 }
    ]
  },
  {
    questionIdx: 0,
    side: 'A',
    content: '资源和眼界不一样。在大厂工作3年，比老家小公司混10年学到的都多。',
    author_name: '产品经理老王',
    likes: 67,
    dislikes: 8,
    replies: []
  },
  {
    questionIdx: 0,
    side: 'A',
    content: '大城市更公平，靠能力吃饭，回老家可能全靠关系。',
    author_name: '理想主义者',
    likes: 54,
    dislikes: 15,
    replies: [
      { content: '太真实了，小地方人情社会太严重。', author_name: '过来人', likes: 18, dislikes: 2 }
    ]
  },
  {
    questionIdx: 0,
    side: 'B',
    content: '生活质量最重要。老家有房有车，陪伴父母，幸福感比大城市高太多了。',
    author_name: '回乡青年',
    likes: 72,
    dislikes: 20,
    replies: [
      { content: '但孩子的教育资源呢？小城市的教育和大城市差很多。', author_name: '纠结的爸爸', likes: 25, dislikes: 5 }
    ]
  },
  {
    questionIdx: 0,
    side: 'B',
    content: '身体健康最重要。大城市996透支生命，钱挣了但人废了，得不偿失。',
    author_name: '养生达人',
    likes: 45,
    dislikes: 18,
    replies: []
  },
  {
    questionIdx: 0,
    side: 'B',
    content: '父母一天天老了，子欲养而亲不待。钱什么时候都能挣，陪伴是有限的。',
    author_name: '孝顺的孩子',
    likes: 61,
    dislikes: 10,
    replies: []
  },
  {
    questionIdx: 1,
    side: 'A',
    content: 'Mac的Unix终端太舒服了，开发体验完爆Windows。而且电池续航强，出差方便。',
    author_name: '全栈开发者',
    likes: 112,
    dislikes: 15,
    replies: [
      { content: 'M系列芯片的Mac确实香，编译速度快太多了。', author_name: 'Apple粉丝', likes: 34, dislikes: 5 }
    ]
  },
  {
    questionIdx: 1,
    side: 'A',
    content: '系统稳定不折腾，不用天天杀毒清理垃圾。把时间花在写代码上，不是折腾系统。',
    author_name: '效率至上',
    likes: 78,
    dislikes: 22,
    replies: []
  },
  {
    questionIdx: 1,
    side: 'A',
    content: '如果是前端开发，Mac是行业标配，面试的时候人都有你没有怪怪的。',
    author_name: 'HR小姐姐',
    likes: 45,
    dislikes: 30,
    replies: [
      { content: '不会吧，我们公司全是Windows也没怎么样。', author_name: '微软党', likes: 12, dislikes: 8 }
    ]
  },
  {
    questionIdx: 1,
    side: 'B',
    content: '游戏党表示不能没有Windows，1万5可以配个配置爆炸的游戏本了。',
    author_name: '游戏玩家',
    likes: 95,
    dislikes: 18,
    replies: []
  },
  {
    questionIdx: 1,
    side: 'B',
    content: '软件兼容性更好，很多专业软件只有Windows版。而且文件管理更灵活。',
    author_name: '实用主义',
    likes: 67,
    dislikes: 25,
    replies: []
  },
  {
    questionIdx: 1,
    side: 'B',
    content: '同样的价格，Windows配置高很多，性价比更高。',
    author_name: '性价比党',
    likes: 56,
    dislikes: 33,
    replies: [
      { content: '但Mac用个五六年不卡，Windows两三年就慢了，长期来看差不多。', author_name: '老Mac用户', likes: 28, dislikes: 10 }
    ]
  },
  {
    questionIdx: 2,
    side: 'A',
    content: '现在好公司门槛越来越高，研究生学历是基本盘。本科学历以后升职加薪都受限。',
    author_name: '985硕士',
    likes: 78,
    dislikes: 20,
    replies: []
  },
  {
    questionIdx: 2,
    side: 'A',
    content: '研究生期间可以好好做项目、实习，起点比本科高很多。',
    author_name: '考研上岸',
    likes: 56,
    dislikes: 15,
    replies: [
      { content: '但三年工作经验也很重要啊，特别是互联网行业。', author_name: '职场老鸟', likes: 19, dislikes: 6 }
    ]
  },
  {
    questionIdx: 2,
    side: 'A',
    content: '如果想进大厂或者国企，研究生学历真的很重要。很多岗位直接卡学历。',
    author_name: '面试官',
    likes: 63,
    dislikes: 12,
    replies: []
  },
  {
    questionIdx: 2,
    side: 'B',
    content: '互联网行业变化太快，三年工作经验比读研值钱多了。能力比学历重要。',
    author_name: '技术总监',
    likes: 89,
    dislikes: 25,
    replies: [
      { content: '但大公司简历筛选的时候，学历不够直接被刷，能力都没机会展示。', author_name: '求职者', likes: 22, dislikes: 8 }
    ]
  },
  {
    questionIdx: 2,
    side: 'B',
    content: '早点经济独立，不花家里钱，这种感觉真的很好。',
    author_name: '独立青年',
    likes: 45,
    dislikes: 18,
    replies: []
  },
  {
    questionIdx: 2,
    side: 'B',
    content: '三年时间，你可能已经从小白成长为高级开发了。而研究生毕业可能还在找工作。',
    author_name: '三年老兵',
    likes: 52,
    dislikes: 30,
    replies: []
  }
];

const insertMany = db.transaction(() => {
  questions.forEach(q => {
    insertQuestion.run(q.id, q.title, q.option_a, q.option_b, q.description, q.author_name, q.created_at, q.votes_a, q.votes_b);
  });

  reasonsData.forEach(r => {
    const questionId = questions[r.questionIdx].id;
    const reasonId = uuidv4();
    insertReason.run(reasonId, questionId, r.side, r.content, r.author_name, now - Math.random() * 86400000, r.likes, r.dislikes, r.replies.length);

    r.replies.forEach(reply => {
      const replyId = uuidv4();
      insertReply.run(replyId, reasonId, questionId, null, reply.content, reply.author_name, now - Math.random() * 43200000, reply.likes, reply.dislikes);
    });
  });
});

insertMany();
console.log('示例数据插入完成');
console.log(`插入了 ${questions.length} 个问题`);
console.log(`插入了 ${reasonsData.length} 条理由`);
