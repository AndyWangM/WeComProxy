import http from 'http';
import url from 'url';
import ConfigManager from './utils/config-manager.js';
import AuthManager from './utils/auth-manager.js';
import TokenManager from './services/token-manager.js';
import WeComClient from './services/wecom-client.js';
import WebhookRouter from './routes/webhook.js';
import AdminRouter from './routes/admin.js';

class WeComProxyServer {
  constructor() {
    this.configManager = new ConfigManager();
    this.authManager = new AuthManager(this.configManager);
    this.tokenManager = new TokenManager(this.configManager);
    this.wecomClient = new WeComClient(this.tokenManager);
    this.webhookRouter = new WebhookRouter(this.wecomClient, this.authManager);
    this.adminRouter = new AdminRouter(this.configManager, this.tokenManager, this.wecomClient, this.authManager);

    this.serverConfig = this.configManager.loadServerConfig();
  }

  async start() {
    try {
      // 清理过期的token
      this.tokenManager.cleanExpiredTokens();

      // 创建HTTP服务器
      this.server = http.createServer(async (req, res) => {
        await this.handleRequest(req, res);
      });

      // 启动服务器
      const port = process.env.PORT || this.serverConfig.port || 3000;
      const host = process.env.HOST || this.serverConfig.host || '0.0.0.0';

      this.server.listen(port, host, () => {
        console.log(`WeComProxy server started at http://${host}:${port}`);
        console.log(`Management interface: http://${host}:${port}${this.getBasePath()}/admin`);
        console.log(`Webhook endpoint: http://${host}:${port}${this.getBasePath()}/webhook/{app_id}`);

        // 显示已配置的应用
        const apps = this.configManager.getAllApps();
        const appIds = Object.keys(apps);
        if (appIds.length > 0) {
          console.log(`\\nConfigured apps: ${appIds.join(', ')}`);
        } else {
          console.log('\\nNo apps configured yet. Please use the management interface to add apps.');
        }
      });

      // 设置定时清理过期token
      setInterval(() => {
        this.tokenManager.cleanExpiredTokens();
      }, 60 * 60 * 1000); // 每小时清理一次

      // 优雅关闭
      process.on('SIGINT', () => this.shutdown());
      process.on('SIGTERM', () => this.shutdown());

    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  async handleRequest(req, res) {
    try {
      // 设置CORS头
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      // 处理OPTIONS请求
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // 解析URL
      const parsedUrl = url.parse(req.url, true);
      let pathname = parsedUrl.pathname;

      // 移除base_path
      const basePath = this.getBasePath();
      if (basePath && pathname.startsWith(basePath)) {
        pathname = pathname.substring(basePath.length);
      }

      // 路由分发
      if (pathname.startsWith('/webhook/')) {
        // Webhook请求
        req.url = pathname + (parsedUrl.search || '');
        await this.webhookRouter.handleRequest(req, res);
      } else if (pathname.startsWith('/admin') || pathname.startsWith('/api/') || pathname.startsWith('/static/')) {
        // 管理接口和静态资源请求
        req.url = pathname + (parsedUrl.search || '');
        await this.adminRouter.handleRequest(req, res);
      } else if (pathname === '/' || pathname === '') {
        // 根路径重定向到管理界面
        res.writeHead(302, { 'Location': `${basePath}/admin` });
        res.end();
      } else {
        // 404
        this.sendNotFound(res);
      }
    } catch (error) {
      console.error('Request handling error:', error);
      this.sendError(res, 500, 'Internal Server Error', error.message);
    }
  }

  getBasePath() {
    const basePath = process.env.BASE_PATH || this.serverConfig.base_path || '';
    return basePath ? (basePath.startsWith('/') ? basePath : `/${basePath}`) : '';
  }

  sendNotFound(res) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: 'Not Found',
      message: 'The requested endpoint was not found',
      available_endpoints: {
        webhook: '/webhook/{app_id}',
        admin: '/admin',
        api: '/api/apps'
      }
    }));
  }

  sendError(res, status, error, message) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: error,
      message: message,
      timestamp: new Date().toISOString()
    }));
  }

  shutdown() {
    console.log('\\nShutting down WeComProxy server...');

    if (this.server) {
      this.server.close(() => {
        console.log('Server closed.');
        process.exit(0);
      });

      // 强制关闭超时
      setTimeout(() => {
        console.log('Force closing server.');
        process.exit(1);
      }, 5000);
    } else {
      process.exit(0);
    }
  }
}

// 启动服务器
const server = new WeComProxyServer();
server.start().catch(error => {
  console.error('Server startup failed:', error);
  process.exit(1);
});