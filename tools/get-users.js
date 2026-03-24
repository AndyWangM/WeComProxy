/**
 * 获取企业微信用户ID工具
 * 使用企业微信API获取部门下的所有用户信息
 */

import ConfigManager from '../src/utils/config-manager.js';
import TokenManager from '../src/services/token-manager.js';

class UserInfoTool {
  constructor() {
    this.configManager = new ConfigManager();
    this.tokenManager = new TokenManager(this.configManager);
  }

  async getUserList(appId, departmentId = 1) {
    try {
      console.log(`📋 获取部门 ${departmentId} 的用户列表...`);

      // 获取access token
      const accessToken = await this.tokenManager.getAccessToken(appId);

      // 调用获取部门成员API
      const url = `https://qyapi.weixin.qq.com/cgi-bin/user/list?access_token=${accessToken}&department_id=${departmentId}&fetch_child=1`;

      // 获取全局代理配置
      const serverConfig = this.configManager.loadServerConfig();
      const fetchOptions = {};

      // 如果配置了全局代理，使用代理
      if (serverConfig.global_proxy) {
        const { ProxyAgent } = await import('undici');
        const proxyOptions = {
          uri: serverConfig.global_proxy
        };

        // 在开发环境中忽略SSL错误
        if (serverConfig.ignore_ssl_errors) {
          proxyOptions.requestTls = {
            rejectUnauthorized: false
          };
        }

        fetchOptions.dispatcher = new ProxyAgent(proxyOptions);
      }

      const response = await fetch(url, fetchOptions);
      const result = await response.json();

      if (result.errcode !== 0) {
        throw new Error(`企业微信API错误: ${result.errmsg} (code: ${result.errcode})`);
      }

      return result.userlist || [];
    } catch (error) {
      console.error('获取用户列表失败:', error.message);
      throw error;
    }
  }

  async getDepartmentList(appId) {
    try {
      console.log('🏢 获取部门列表...');

      // 获取access token
      const accessToken = await this.tokenManager.getAccessToken(appId);

      // 调用获取部门列表API
      const url = `https://qyapi.weixin.qq.com/cgi-bin/department/list?access_token=${accessToken}`;

      // 获取全局代理配置
      const serverConfig = this.configManager.loadServerConfig();
      const fetchOptions = {};

      // 如果配置了全局代理，使用代理
      if (serverConfig.global_proxy) {
        const { ProxyAgent } = await import('undici');
        const proxyOptions = {
          uri: serverConfig.global_proxy
        };

        // 在开发环境中忽略SSL错误
        if (serverConfig.ignore_ssl_errors) {
          proxyOptions.requestTls = {
            rejectUnauthorized: false
          };
        }

        fetchOptions.dispatcher = new ProxyAgent(proxyOptions);
      }

      const response = await fetch(url, fetchOptions);
      const result = await response.json();

      if (result.errcode !== 0) {
        throw new Error(`企业微信API错误: ${result.errmsg} (code: ${result.errcode})`);
      }

      return result.department || [];
    } catch (error) {
      console.error('获取部门列表失败:', error.message);
      throw error;
    }
  }

  displayUsers(users) {
    console.log('\\n👥 用户列表:');
    console.log('====================================');

    if (users.length === 0) {
      console.log('❌ 没有找到用户');
      return;
    }

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   用户ID: ${user.userid}`);
      console.log(`   手机号: ${user.mobile || '未设置'}`);
      console.log(`   邮箱: ${user.email || '未设置'}`);
      console.log(`   部门: ${user.department ? user.department.join(', ') : '未设置'}`);
      console.log(`   状态: ${user.status === 1 ? '已激活' : '未激活'}`);
      console.log('   ---');
    });
  }

  displayDepartments(departments) {
    console.log('\\n🏢 部门列表:');
    console.log('====================================');

    if (departments.length === 0) {
      console.log('❌ 没有找到部门');
      return;
    }

    departments.forEach((dept, index) => {
      console.log(`${index + 1}. ${dept.name}`);
      console.log(`   部门ID: ${dept.id}`);
      console.log(`   父部门ID: ${dept.parentid}`);
      console.log(`   排序: ${dept.order}`);
      console.log('   ---');
    });
  }
}

async function main() {
  console.log('企业微信用户ID获取工具\\n');

  const tool = new UserInfoTool();

  try {
    // 获取所有应用
    const apps = tool.configManager.getAllApps();
    const appIds = Object.keys(apps);

    if (appIds.length === 0) {
      console.error('❌ 没有配置的应用，请先在管理界面添加应用配置');
      return;
    }

    console.log('📱 可用的应用:');
    appIds.forEach((appId, index) => {
      console.log(`${index + 1}. ${appId}: ${apps[appId].name}`);
    });

    // 使用第一个应用
    const appId = appIds[0];
    console.log(`\\n🚀 使用应用: ${appId} (${apps[appId].name})\\n`);

    // 获取部门列表
    const departments = await tool.getDepartmentList(appId);
    tool.displayDepartments(departments);

    // 获取所有部门的用户
    console.log('\\n📋 获取所有部门的用户信息...');

    for (const dept of departments) {
      console.log(`\\n📁 部门: ${dept.name} (ID: ${dept.id})`);

      try {
        const users = await tool.getUserList(appId, dept.id);
        if (users.length > 0) {
          tool.displayUsers(users);
        } else {
          console.log('   该部门无用户');
        }
      } catch (error) {
        console.log(`   获取部门用户失败: ${error.message}`);
      }
    }

    console.log('\\n💡 使用提示:');
    console.log('1. 复制上面的 "用户ID" 到配置文件的 target_users 字段');
    console.log('2. 多个用户用 | 分隔，如: "user1|user2|user3"');
    console.log('3. 使用 "@all" 发送给所有人');
    console.log('4. 部门ID可以用在 target_parties 字段');

  } catch (error) {
    console.error('❌ 工具执行失败:', error.message);
  }
}

// 如果直接运行此文件，则执行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default UserInfoTool;