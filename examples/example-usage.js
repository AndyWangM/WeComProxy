/**
 * WeComProxy 使用示例
 *
 * 这个文件展示了如何使用 WeComProxy 的各种功能
 */

import http from 'http';

class WeComProxyClient {
  constructor(baseUrl = 'http://localhost:3000', apiToken = 'your_api_token_here') {
    this.baseUrl = baseUrl;
    this.apiToken = apiToken;
  }

  /**
   * 发送HTTP请求的辅助方法
   */
  async request(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);

      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
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
        reject(error);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * 1. 管理应用配置
   */
  async manageApps() {
    console.log('=== 应用配置管理示例 ===\n');

    // 创建新应用
    const appConfig = {
      id: 'alert_app',
      name: '示例应用',
      corpid: 'ww1f0155f4099909a2',
      corpsecret: 'your_app_secret_here',
      agentid: 1000013,
      proxy_url: 'http://api.wangandi.com',
      target_users: '@all',
      target_parties: '',
      target_tags: '',
      message_format: '🚨 {sender}\\n📅 {time}\\n📝 {content}',
      enabled: true
    };

    try {
      console.log('📝 创建应用配置...');
      const createResult = await this.request('POST', '/api/apps', appConfig);
      console.log('✅ 应用创建成功:', createResult.message);
      console.log('');

      // 获取应用列表
      console.log('📋 获取应用列表...');
      const appsResult = await this.request('GET', '/api/apps');
      console.log('✅ 获取到', appsResult.data.length, '个应用:');
      appsResult.data.forEach(app => {
        console.log(`  - ${app.id}: ${app.name} (${app.enabled ? '启用' : '禁用'})`);
      });
      console.log('');

      // 更新应用配置
      console.log('✏️ 更新应用配置...');
      const updateResult = await this.request('PUT', '/api/apps/alert_app', {
        name: '更新后的示例应用',
        message_format: '发送人：{sender}\\n时间：{time}\\n内容：{content}'
      });
      console.log('✅ 应用更新成功:', updateResult.message);
      console.log('');

    } catch (error) {
      console.error('❌ 应用管理失败:', error.message);
    }
  }

  /**
   * 2. 发送各种类型的消息
   */
  async sendMessages() {
    console.log('=== 消息发送示例 ===\n');

    const appId = 'alert_app';

    // 发送告警消息
    await this.sendMessage(appId, {
      sender: '系统监控',
      time: new Date().toLocaleString('zh-CN'),
      content: '服务器CPU使用率过高(85%)，请及时处理！'
    }, '🚨 告警消息');

    // 发送通知消息
    await this.sendMessage(appId, {
      sender: '人事部门',
      time: new Date().toLocaleString('zh-CN'),
      content: '请各部门在本周五前提交月度总结报告。'
    }, '📢 通知消息');

    // 发送任务消息
    await this.sendMessage(appId, {
      sender: '项目经理',
      time: new Date().toLocaleString('zh-CN'),
      content: 'WeComProxy项目已完成开发，请进行测试验收。'
    }, '📋 任务消息');

    // 发送状态更新
    await this.sendMessage(appId, {
      sender: '自动化脚本',
      time: new Date().toLocaleString('zh-CN'),
      content: '数据备份已完成，备份文件大小：2.3GB'
    }, '🔄 状态更新');
  }

  /**
   * 发送单条消息的辅助方法
   */
  async sendMessage(appId, messageData, description) {
    try {
      console.log(`📤 发送${description}...`);
      const result = await this.request('POST', `/webhook/${appId}`, messageData);

      if (result.success) {
        console.log(`✅ ${description}发送成功`);
        if (result.data.message_id) {
          console.log(`   消息ID: ${result.data.message_id}`);
        }
      } else {
        console.log(`❌ ${description}发送失败: ${result.error}`);
      }
      console.log('');
    } catch (error) {
      console.error(`❌ ${description}发送异常:`, error.message);
      console.log('');
    }
  }

  /**
   * 3. 测试应用配置
   */
  async testApp() {
    console.log('=== 应用测试示例 ===\n');

    try {
      console.log('🧪 测试应用配置...');
      const result = await this.request('POST', '/api/test/alert_app');

      if (result.success) {
        console.log('✅ 测试消息发送成功');
        console.log('   应用配置正确，可以正常发送消息');
      } else {
        console.log('❌ 测试消息发送失败:', result.error);
        console.log('   请检查应用配置是否正确');
      }
      console.log('');
    } catch (error) {
      console.error('❌ 应用测试异常:', error.message);
      console.log('');
    }
  }

  /**
   * 4. 获取系统统计信息
   */
  async getStats() {
    console.log('=== 系统统计示例 ===\n');

    try {
      console.log('📊 获取系统统计...');
      const result = await this.request('GET', '/api/stats');

      if (result.success) {
        console.log('✅ 统计信息获取成功:');
        console.log(`   总应用数: ${result.data.total_apps}`);
        console.log(`   启用应用数: ${result.data.enabled_apps}`);
        console.log(`   有效Token应用数: ${result.data.apps_with_valid_tokens}`);
      }
      console.log('');
    } catch (error) {
      console.error('❌ 获取统计信息失败:', error.message);
      console.log('');
    }
  }

  /**
   * 5. 批量操作示例
   */
  async batchOperations() {
    console.log('=== 批量操作示例 ===\n');

    const messages = [
      {
        sender: '监控系统',
        time: new Date().toLocaleString('zh-CN'),
        content: '数据库连接池达到上限，请检查应用连接'
      },
      {
        sender: '监控系统',
        time: new Date().toLocaleString('zh-CN'),
        content: '磁盘空间不足，请清理日志文件'
      },
      {
        sender: '监控系统',
        time: new Date().toLocaleString('zh-CN'),
        content: '内存使用率过高，建议重启相关服务'
      }
    ];

    console.log(`📤 批量发送 ${messages.length} 条消息...`);

    for (let i = 0; i < messages.length; i++) {
      try {
        const result = await this.request('POST', '/webhook/alert_app', messages[i]);

        if (result.success) {
          console.log(`✅ 消息 ${i + 1} 发送成功`);
        } else {
          console.log(`❌ 消息 ${i + 1} 发送失败: ${result.error}`);
        }

        // 避免发送过于频繁
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ 消息 ${i + 1} 发送异常:`, error.message);
      }
    }
    console.log('');
  }
}

/**
 * cURL 命令示例
 */
function showCurlExamples() {
  console.log('=== cURL 命令示例 ===\n');

  console.log('📝 创建应用:');
  console.log(`curl -X POST http://localhost:3000/api/apps \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{`);
  console.log(`    "id": "my_app",`);
  console.log(`    "name": "我的应用",`);
  console.log(`    "corpid": "ww1f0155f4099909a2",`);
  console.log(`    "corpsecret": "your_secret",`);
  console.log(`    "agentid": 1000013,`);
  console.log(`    "target_users": "@all"`);
  console.log(`  }'`);
  console.log('');

  console.log('📤 发送消息:');
  console.log(`curl -X POST http://localhost:3000/webhook/my_app \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{`);
  console.log(`    "sender": "系统通知",`);
  console.log(`    "time": "2024-03-24 15:30:00",`);
  console.log(`    "content": "这是一条测试消息"`);
  console.log(`  }'`);
  console.log('');

  console.log('📊 获取统计:');
  console.log(`curl http://localhost:3000/api/stats`);
  console.log('');

  console.log('🧪 测试应用:');
  console.log(`curl -X POST http://localhost:3000/api/test/my_app`);
  console.log('');
}

/**
 * 主函数：运行所有示例
 */
async function main() {
  console.log('WeComProxy 使用示例\n');
  console.log('⚠️ 请确保 WeComProxy 服务运行在 http://localhost:3000\n');

  const client = new WeComProxyClient();

  try {
    // 检查服务器状态
    await client.request('GET', '/api/stats');
    console.log('✅ 服务器连接成功\n');

    // 运行示例
    await client.manageApps();
    await client.sendMessages();
    await client.testApp();
    await client.getStats();
    await client.batchOperations();

    // 显示cURL示例
    showCurlExamples();

    console.log('🎉 所有示例运行完成！');
    console.log('📖 查看更多信息: http://localhost:3000/admin');

  } catch (error) {
    console.error('❌ 服务器连接失败:', error.message);
    console.log('\n请先启动 WeComProxy 服务:');
    console.log('  npm start     # 生产模式');
    console.log('  npm run dev   # 开发模式');
    console.log('  docker-compose up -d  # Docker模式');
  }
}

// 如果直接运行此文件，则执行示例
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

// 导出客户端类供其他文件使用
export default WeComProxyClient;