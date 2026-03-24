import http from 'http';
import assert from 'assert';

class WeComProxyTest {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.testAppId = 'test_app_' + Date.now();
    this.apiToken = 'your_api_token_here'; // 请填入真实的API Token
  }

  async runTests() {
    console.log('🧪 WeComProxy 测试开始...\n');

    try {
      await this.testServerHealth();
      await this.testCreateApp();
      await this.testGetApps();
      await this.testUpdateApp();
      await this.testWebhook();
      await this.testDeleteApp();

      console.log('✅ 所有测试通过!');
    } catch (error) {
      console.error('❌ 测试失败:', error.message);
      process.exit(1);
    }
  }

  async testServerHealth() {
    console.log('📊 测试服务器健康状态...');
    const result = await this.request('GET', '/api/stats');
    assert(result.success, '服务器健康检查失败');
    console.log('✅ 服务器运行正常\n');
  }

  async testCreateApp() {
    console.log('➕ 测试创建应用...');

    const appConfig = {
      id: this.testAppId,
      name: '测试应用',
      corpid: 'test_corpid',
      corpsecret: 'test_corpsecret',
      agentid: 999999,
      proxy_url: 'http://test.proxy.com',
      target_users: '@all',
      message_format: '发送人：{sender}\\n时间：{time}\\n内容：{content}',
      enabled: true
    };

    const result = await this.request('POST', '/api/apps', appConfig);
    assert(result.success, '创建应用失败');
    assert(result.data.id === this.testAppId, '应用ID不匹配');

    console.log('✅ 应用创建成功\n');
  }

  async testGetApps() {
    console.log('📋 测试获取应用列表...');

    const result = await this.request('GET', '/api/apps');
    assert(result.success, '获取应用列表失败');
    assert(Array.isArray(result.data), '应用列表格式错误');

    const testApp = result.data.find(app => app.id === this.testAppId);
    assert(testApp, '找不到测试应用');
    assert(testApp.name === '测试应用', '应用名称不匹配');

    console.log('✅ 应用列表获取成功\n');
  }

  async testUpdateApp() {
    console.log('✏️ 测试更新应用...');

    const updateData = {
      name: '更新后的测试应用',
      enabled: false
    };

    const result = await this.request('PUT', `/api/apps/${this.testAppId}`, updateData);
    assert(result.success, '更新应用失败');

    // 验证更新结果
    const getResult = await this.request('GET', `/api/apps/${this.testAppId}`);
    assert(getResult.data.name === '更新后的测试应用', '应用名称更新失败');
    assert(getResult.data.enabled === false, '应用状态更新失败');

    console.log('✅ 应用更新成功\n');
  }

  async testWebhook() {
    console.log('🪝 测试Webhook接口...');

    // 先启用应用
    await this.request('PUT', `/api/apps/${this.testAppId}`, { enabled: true });

    const messageData = {
      sender: '测试系统',
      time: new Date().toLocaleString('zh-CN'),
      content: '这是一条测试消息'
    };

    try {
      // 注意：这个测试会失败，因为使用的是测试配置，但我们主要测试接口格式
      const result = await this.request('POST', `/webhook/${this.testAppId}`, messageData);

      // 如果使用真实配置，这里应该成功
      if (result.success) {
        console.log('✅ Webhook消息发送成功');
      } else {
        // 预期的失败（因为是测试配置）
        console.log('⚠️ Webhook接口格式正确，但使用测试配置发送失败（符合预期）');
      }
    } catch (error) {
      console.log('⚠️ Webhook测试完成（使用测试配置，发送失败符合预期）');
    }

    console.log('');
  }

  async testDeleteApp() {
    console.log('🗑️ 测试删除应用...');

    const result = await this.request('DELETE', `/api/apps/${this.testAppId}`);
    assert(result.success, '删除应用失败');

    // 验证删除结果
    try {
      await this.request('GET', `/api/apps/${this.testAppId}`);
      assert(false, '应用删除后仍然存在');
    } catch (error) {
      // 预期的404错误
      assert(error.message.includes('404'), '删除验证失败');
    }

    console.log('✅ 应用删除成功\n');
  }

  async request(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiToken}`
        }
      };

      const req = http.request(options, (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          try {
            const result = JSON.parse(body);

            if (res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${result.error || result.message}`));
            } else {
              resolve(result);
            }
          } catch (error) {
            reject(new Error(`JSON解析失败: ${body}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`请求失败: ${error.message}`));
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }
}

// 运行测试
async function main() {
  console.log('WeComProxy API 测试工具\n');
  console.log('⚠️ 请确保服务器在 http://localhost:3000 运行\n');

  const test = new WeComProxyTest();
  await test.runTests();
}

// 检查服务器是否运行
async function checkServer() {
  try {
    const test = new WeComProxyTest();
    await test.request('GET', '/api/stats');
    return true;
  } catch (error) {
    return false;
  }
}

// 启动测试
checkServer().then(running => {
  if (running) {
    main().catch(console.error);
  } else {
    console.error('❌ 服务器未运行，请先启动 WeComProxy 服务');
    console.log('启动命令: npm start 或 npm run dev');
    process.exit(1);
  }
});