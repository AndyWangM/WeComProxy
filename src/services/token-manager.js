import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TokenManager {
  constructor(configManager) {
    this.configManager = configManager;
    this.dataDir = process.env.DATA_DIR || path.join(__dirname, '../../data');
    this.cacheDir = path.join(this.dataDir, 'cache');

    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  async getAccessToken(appId) {
    try {
      // 获取应用配置
      const appConfig = this.configManager.getApp(appId);
      if (!appConfig || !appConfig.enabled) {
        throw new Error(`App ${appId} not found or disabled`);
      }

      // 检查缓存的token
      const cachedToken = this.getCachedToken(appId);
      if (cachedToken && !this.isTokenExpired(cachedToken)) {
        return cachedToken.access_token;
      }

      // 从企业微信获取新token
      const newToken = await this.fetchTokenFromWecom(appConfig);

      // 缓存token
      this.cacheToken(appId, newToken);

      return newToken.access_token;
    } catch (error) {
      console.error(`Error getting access token for ${appId}:`, error);
      throw error;
    }
  }

  getCachedToken(appId) {
    try {
      const tokenPath = path.join(this.cacheDir, `${appId}.json`);
      if (!fs.existsSync(tokenPath)) {
        return null;
      }

      const content = fs.readFileSync(tokenPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error reading cached token for ${appId}:`, error);
      return null;
    }
  }

  isTokenExpired(tokenData) {
    if (!tokenData.expire_time) {
      return true;
    }

    // 提前30秒刷新，避免边界情况
    const now = Math.floor(Date.now() / 1000);
    return now >= (tokenData.expire_time - 30);
  }

  async fetchTokenFromWecom(appConfig) {
    const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${appConfig.corpid}&corpsecret=${appConfig.corpsecret}`;

    try {
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
          console.log(`Using global proxy with SSL bypass: ${serverConfig.global_proxy}`);
        } else {
          console.log(`Using global proxy: ${serverConfig.global_proxy}`);
        }

        fetchOptions.dispatcher = new ProxyAgent(proxyOptions);
      }

      const response = await fetch(url, fetchOptions);
      const result = await response.json();

      if (result.errcode !== 0) {
        throw new Error(`WeChat API error: ${result.errmsg} (code: ${result.errcode})`);
      }

      if (!result.access_token) {
        throw new Error('No access_token in response');
      }

      // 企业微信token有效期是7200秒，我们设置7000秒
      const expireTime = Math.floor(Date.now() / 1000) + 7000;

      return {
        access_token: result.access_token,
        expire_time: expireTime,
        expires_in: result.expires_in
      };
    } catch (error) {
      console.error('Error fetching token from WeChat:', error);
      throw error;
    }
  }

  cacheToken(appId, tokenData) {
    try {
      const tokenPath = path.join(this.cacheDir, `${appId}.json`);
      fs.writeFileSync(tokenPath, JSON.stringify(tokenData, null, 2), 'utf8');
      console.log(`Token cached for ${appId}, expires at ${new Date(tokenData.expire_time * 1000).toISOString()}`);
    } catch (error) {
      console.error(`Error caching token for ${appId}:`, error);
    }
  }

  // 清理过期的token缓存
  cleanExpiredTokens() {
    try {
      const files = fs.readdirSync(this.cacheDir);

      files.forEach(file => {
        if (file.endsWith('.json')) {
          const appId = file.replace('.json', '');
          const cachedToken = this.getCachedToken(appId);

          if (cachedToken && this.isTokenExpired(cachedToken)) {
            const tokenPath = path.join(this.cacheDir, file);
            fs.unlinkSync(tokenPath);
            console.log(`Cleaned expired token for ${appId}`);
          }
        }
      });
    } catch (error) {
      console.error('Error cleaning expired tokens:', error);
    }
  }

  // 获取所有应用的token状态
  getAllTokenStatus() {
    try {
      const apps = this.configManager.getAllApps();
      const status = {};

      Object.keys(apps).forEach(appId => {
        const cachedToken = this.getCachedToken(appId);
        status[appId] = {
          has_token: !!cachedToken,
          expired: cachedToken ? this.isTokenExpired(cachedToken) : true,
          expire_time: cachedToken ? cachedToken.expire_time : null
        };
      });

      return status;
    } catch (error) {
      console.error('Error getting token status:', error);
      return {};
    }
  }
}

export default TokenManager;