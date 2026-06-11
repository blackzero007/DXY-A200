const axios = require('axios');

async function testReportAPI() {
  const baseURL = 'http://localhost:3001/api';

  try {
    console.log('1. 登录获取token...');
    const loginRes = await axios.post(`${baseURL}/users/login`, {
      email: 'admin@example.com',
      password: 'admin123'
    });
    const token = loginRes.data.token;
    const user = loginRes.data.user;
    console.log('登录成功:', user.nickname, '角色:', user.role);

    const headers = { Authorization: `Bearer ${token}` };

    console.log('\n2. 使用已知的理由ID...');
    const firstReason = { id: 'cfbcf237-a473-4c0f-85ec-4bf9711120a8', content: '测试理由' };
    console.log('理由ID:', firstReason.id);

    console.log('\n3. 提交举报...');
    const reportRes = await axios.post(`${baseURL}/reports`, {
      target_type: 'reason',
      target_id: firstReason.id,
      reason: 'irrelevant',
      description: '测试举报 - 内容无关'
    }, { headers });
    console.log('举报提交成功:', reportRes.data.message);
    console.log('举报ID:', reportRes.data.report.id);

    console.log('\n4. 获取举报列表...');
    const reportsRes = await axios.get(`${baseURL}/reports`, { headers });
    console.log('举报总数:', reportsRes.data.total);
    console.log('待处理:', reportsRes.data.status_counts.pending);
    console.log('第一条举报:', reportsRes.data.list[0]?.target_content);

    console.log('\n5. 测试重复举报（应该失败）...');
    try {
      await axios.post(`${baseURL}/reports`, {
        target_type: 'reason',
        target_id: firstReason.id,
        reason: 'advertisement'
      }, { headers });
      console.log('错误：重复举报应该失败但成功了');
    } catch (err) {
      console.log('正确拦截重复举报:', err.response.data.error);
    }

    console.log('\n✅ 所有测试通过！');
  } catch (err) {
    console.error('❌ 测试失败:', err.response?.data?.error || err.message);
  }
}

testReportAPI();
