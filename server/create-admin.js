const { readDB, writeDB } = require('./src/db');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  const db = readDB();

  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';
  const adminNickname = '管理员';

  const existingAdmin = db.users.find(u => u.email.toLowerCase() === adminEmail.toLowerCase());
  if (existingAdmin) {
    console.log('管理员账号已存在');
    console.log(`邮箱: ${adminEmail}`);
    console.log(`密码: ${adminPassword}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const newAdmin = {
    id: uuidv4(),
    email: adminEmail,
    password: hashedPassword,
    nickname: adminNickname,
    avatar: { bgColor: '#667eea', initial: '管' },
    role: 'admin',
    created_at: Date.now()
  };

  db.users.push(newAdmin);
  writeDB(db);

  console.log('管理员账号创建成功！');
  console.log(`邮箱: ${adminEmail}`);
  console.log(`密码: ${adminPassword}`);
  console.log(`昵称: ${adminNickname}`);
  console.log('请妥善保管以上信息');
}

createAdmin().catch(err => {
  console.error('创建管理员失败:', err);
});
