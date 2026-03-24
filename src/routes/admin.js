import url from 'url';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AdminRouter {
  constructor(configManager, tokenManager, wecomClient, authManager) {
    this.configManager = configManager;
    this.tokenManager = tokenManager;
    this.wecomClient = wecomClient;
    this.authManager = authManager;
  }

  async handleRequest(req, res) {
    try {
      const parsedUrl = url.parse(req.url, true);
      const pathParts = parsedUrl.pathname.split('/').filter(part => part);

      // 移除base_path（如果有）
      let basePath = process.env.BASE_PATH || '';
      if (basePath) {
        basePath = basePath.replace(/^\/+|\/+$/g, '');
        if (pathParts.length > 0 && pathParts[0] === basePath) {
          pathParts.shift();
        }
      }

      const route = pathParts[0];
      const subRoute = pathParts[1];
      const appId = pathParts[2];

      if (route === 'admin') {
        // 检查认证，但简化逻辑
        const authHeader = req.headers.authorization;
        const token = this.authManager.extractTokenFromHeader(authHeader);
        const cookieToken = this.extractTokenFromCookie(req);

        // 检查Header中的Token或Cookie中的Token
        if (!this.authManager.validateToken(token) && !this.authManager.validateToken(cookieToken)) {
          return this.authManager.serveLoginPage(res);
        }

        // 返回管理界面HTML
        await this.serveAdminPage(req, res);
      } else if (route === 'static') {
        // 静态资源不需要认证
        await this.serveStaticFile(req, res, subRoute);
      } else if (route === 'api') {
        // API请求需要认证
        const authHeader = req.headers.authorization;
        const token = this.authManager.extractTokenFromHeader(authHeader);

        if (!this.authManager.validateToken(token)) {
          return this.sendError(res, 401, 'Unauthorized', 'Invalid or missing API token');
        }

        await this.handleApiRequest(req, res, subRoute, appId, parsedUrl.query);
      } else {
        return this.sendError(res, 404, 'Not Found');
      }
    } catch (error) {
      console.error('Admin handler error:', error);
      return this.sendError(res, 500, 'Internal Server Error', error.message);
    }
  }

  async handleApiRequest(req, res, subRoute, appId, query) {
    if (subRoute === 'auth') {
      // 认证相关API
      if (appId === 'verify' && req.method === 'POST') {
        await this.verifyToken(req, res);
      } else if (appId === 'info' && req.method === 'GET') {
        await this.getTokenInfo(req, res);
      } else if (appId === 'regenerate' && req.method === 'POST') {
        await this.regenerateToken(req, res);
      } else {
        return this.sendError(res, 404, 'Auth API endpoint not found');
      }
    } else if (subRoute === 'apps') {
      if (req.method === 'GET') {
        if (appId) {
          // GET /api/apps/{app_id}
          await this.getApp(req, res, appId);
        } else {
          // GET /api/apps
          await this.getAllApps(req, res);
        }
      } else if (req.method === 'POST') {
        // POST /api/apps
        await this.createApp(req, res);
      } else if (req.method === 'PUT') {
        // PUT /api/apps/{app_id}
        await this.updateApp(req, res, appId);
      } else if (req.method === 'DELETE') {
        // DELETE /api/apps/{app_id}
        await this.deleteApp(req, res, appId);
      } else {
        return this.sendError(res, 405, 'Method Not Allowed');
      }
    } else if (subRoute === 'test' && appId) {
      if (req.method === 'POST') {
        // POST /api/test/{app_id}
        await this.testApp(req, res, appId);
      } else {
        return this.sendError(res, 405, 'Method Not Allowed');
      }
    } else if (subRoute === 'stats') {
      if (req.method === 'GET') {
        // GET /api/stats
        await this.getStats(req, res);
      } else {
        return this.sendError(res, 405, 'Method Not Allowed');
      }
    } else if (subRoute === 'backups') {
      if (req.method === 'GET') {
        // GET /api/backups
        await this.getBackups(req, res);
      } else {
        return this.sendError(res, 405, 'Method Not Allowed');
      }
    } else {
      return this.sendError(res, 404, 'API endpoint not found');
    }
  }

  async serveAdminPage(req, res) {
    try {
      const webDir = path.join(__dirname, '../../web');
      const indexPath = path.join(webDir, 'index.html');

      if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      } else {
        // 临时返回简单的管理页面
        const simpleHtml = this.getSimpleAdminHtml();
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(simpleHtml);
      }
    } catch (error) {
      console.error('Error serving admin page:', error);
      return this.sendError(res, 500, 'Error loading admin page');
    }
  }

  async serveStaticFile(req, res, filename) {
    try {
      const webDir = path.join(__dirname, '../../web');
      const filePath = path.join(webDir, filename);

      // 安全检查，防止目录遍历
      if (!filePath.startsWith(webDir)) {
        return this.sendError(res, 403, 'Forbidden');
      }

      if (!fs.existsSync(filePath)) {
        return this.sendError(res, 404, 'File not found');
      }

      // 获取文件类型
      const ext = path.extname(filename).toLowerCase();
      const contentTypes = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
      };

      const contentType = contentTypes[ext] || 'text/plain';
      const content = fs.readFileSync(filePath);

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600'
      });
      res.end(content);
    } catch (error) {
      console.error('Error serving static file:', error);
      return this.sendError(res, 500, 'Error loading file');
    }
  }

  async getAllApps(req, res) {
    try {
      const apps = this.configManager.getAllApps();
      const tokenStatus = this.tokenManager.getAllTokenStatus();

      const appsWithStatus = Object.keys(apps).map(appId => ({
        id: appId,
        ...apps[appId],
        token_status: tokenStatus[appId] || { has_token: false, expired: true }
      }));

      this.sendJson(res, 200, {
        success: true,
        data: appsWithStatus
      });
    } catch (error) {
      return this.sendError(res, 500, 'Error getting apps', error.message);
    }
  }

  async getApp(req, res, appId) {
    try {
      const app = this.configManager.getApp(appId);
      if (!app) {
        return this.sendError(res, 404, 'App not found');
      }

      const tokenStatus = this.tokenManager.getAllTokenStatus();

      this.sendJson(res, 200, {
        success: true,
        data: {
          id: appId,
          ...app,
          token_status: tokenStatus[appId] || { has_token: false, expired: true }
        }
      });
    } catch (error) {
      return this.sendError(res, 500, 'Error getting app', error.message);
    }
  }

  async createApp(req, res) {
    try {
      const body = await this.readRequestBody(req);
      const data = JSON.parse(body);

      if (!data.id || !data.name || !data.corpid || !data.corpsecret || !data.agentid) {
        return this.sendError(res, 400, 'Missing required fields: id, name, corpid, corpsecret, agentid');
      }

      // 检查应用ID是否已存在
      if (this.configManager.getApp(data.id)) {
        return this.sendError(res, 409, 'App ID already exists');
      }

      const appConfig = {
        name: data.name,
        corpid: data.corpid,
        corpsecret: data.corpsecret,
        agentid: parseInt(data.agentid),
        proxy_url: data.proxy_url || '',
        target_users: data.target_users || '@all',
        target_parties: data.target_parties || '',
        target_tags: data.target_tags || '',
        message_format: data.message_format || '发送人：{sender}\\n时间：{time}\\n内容：{content}',
        enabled: data.enabled !== false
      };

      const success = this.configManager.addApp(data.id, appConfig);
      if (success) {
        this.sendJson(res, 201, {
          success: true,
          message: 'App created successfully',
          data: { id: data.id, ...appConfig }
        });
      } else {
        return this.sendError(res, 500, 'Failed to create app');
      }
    } catch (error) {
      return this.sendError(res, 500, 'Error creating app', error.message);
    }
  }

  async updateApp(req, res, appId) {
    try {
      if (!appId) {
        return this.sendError(res, 400, 'App ID is required');
      }

      const body = await this.readRequestBody(req);
      const data = JSON.parse(body);

      const success = this.configManager.updateApp(appId, data);
      if (success) {
        this.sendJson(res, 200, {
          success: true,
          message: 'App updated successfully'
        });
      } else {
        return this.sendError(res, 404, 'App not found');
      }
    } catch (error) {
      return this.sendError(res, 500, 'Error updating app', error.message);
    }
  }

  async deleteApp(req, res, appId) {
    try {
      if (!appId) {
        return this.sendError(res, 400, 'App ID is required');
      }

      const success = this.configManager.deleteApp(appId);
      if (success) {
        this.sendJson(res, 200, {
          success: true,
          message: 'App deleted successfully'
        });
      } else {
        return this.sendError(res, 404, 'App not found');
      }
    } catch (error) {
      return this.sendError(res, 500, 'Error deleting app', error.message);
    }
  }

  async testApp(req, res, appId) {
    try {
      const result = await this.wecomClient.testMessage(appId);
      this.sendJson(res, 200, result);
    } catch (error) {
      return this.sendError(res, 500, 'Error testing app', error.message);
    }
  }

  async getStats(req, res) {
    try {
      const apps = this.configManager.getAllApps();
      const tokenStatus = this.tokenManager.getAllTokenStatus();

      const stats = {
        total_apps: Object.keys(apps).length,
        enabled_apps: Object.values(apps).filter(app => app.enabled).length,
        apps_with_valid_tokens: Object.values(tokenStatus).filter(status => status.has_token && !status.expired).length
      };

      this.sendJson(res, 200, {
        success: true,
        data: stats
      });
    } catch (error) {
      return this.sendError(res, 500, 'Error getting stats', error.message);
    }
  }

  async getBackups(req, res) {
    try {
      const backups = this.configManager.getBackupList();
      this.sendJson(res, 200, {
        success: true,
        data: backups
      });
    } catch (error) {
      return this.sendError(res, 500, 'Error getting backups', error.message);
    }
  }

  // 认证相关方法
  async verifyToken(req, res) {
    // Token已经在路由层验证过了，能到这里说明token有效
    this.sendJson(res, 200, {
      success: true,
      message: 'Token is valid'
    });
  }

  async getTokenInfo(req, res) {
    try {
      const tokenInfo = this.authManager.getTokenInfo();

      if (!tokenInfo) {
        return this.sendError(res, 500, 'Error getting token info');
      }

      // 隐藏完整token，只显示前后几位
      const maskedToken = this.maskToken(tokenInfo.token);

      this.sendJson(res, 200, {
        success: true,
        data: {
          token: maskedToken,
          created_at: tokenInfo.created_at,
          updated_at: tokenInfo.updated_at,
          description: tokenInfo.description
        }
      });
    } catch (error) {
      return this.sendError(res, 500, 'Error getting token info', error.message);
    }
  }

  async regenerateToken(req, res) {
    try {
      const newToken = this.authManager.updateToken();

      if (!newToken) {
        return this.sendError(res, 500, 'Error regenerating token');
      }

      this.sendJson(res, 200, {
        success: true,
        message: 'Token regenerated successfully',
        data: {
          token: newToken,
          warning: 'Please update all API clients with the new token'
        }
      });
    } catch (error) {
      return this.sendError(res, 500, 'Error regenerating token', error.message);
    }
  }

  maskToken(token) {
    if (!token || token.length < 8) {
      return '****';
    }
    const start = token.substring(0, 4);
    const end = token.substring(token.length - 4);
    return `${start}${'*'.repeat(token.length - 8)}${end}`;
  }

  async readRequestBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
        if (body.length > 1024 * 1024) {
          reject(new Error('Request body too large'));
        }
      });
      req.on('end', () => resolve(body));
      req.on('error', error => reject(error));
    });
  }

  sendJson(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data, null, 2));
  }

  sendError(res, status, error, message = null) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: false,
      error: error,
      message: message,
      timestamp: new Date().toISOString()
    }));
  }

  // 从Cookie中提取Token
  extractTokenFromCookie(req) {
    const cookies = req.headers.cookie;
    if (!cookies) return null;

    const tokenMatch = cookies.match(/wecom_token=([^;]+)/);
    return tokenMatch ? tokenMatch[1] : null;
  }

  // 工具方法
  sendJson(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  }

  sendError(res, statusCode, error, details = null) {
    this.sendJson(res, statusCode, {
      success: false,
      error: error,
      message: details || error
    });
  }

  getSimpleAdminHtml() {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WeComProxy 管理界面</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .api-section { background: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .endpoint { background: #f8f9fa; padding: 10px; border-radius: 4px; margin: 10px 0; font-family: monospace; }
        .method { color: #28a745; font-weight: bold; }
        .method.post { color: #007bff; }
        .method.put { color: #ffc107; }
        .method.delete { color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>WeComProxy 管理界面</h1>
            <p>企业微信消息推送代理服务</p>
        </div>

        <div class="api-section">
            <h3>🔗 Webhook 接口</h3>
            <div class="endpoint">
                <span class="method post">POST</span> /webhook/{app_id}
                <br>发送消息到企业微信
            </div>
        </div>

        <div class="api-section">
            <h3>⚙️ 管理 API</h3>
            <div class="endpoint"><span class="method">GET</span> /api/apps - 获取所有应用</div>
            <div class="endpoint"><span class="method">GET</span> /api/apps/{app_id} - 获取应用详情</div>
            <div class="endpoint"><span class="method post">POST</span> /api/apps - 创建新应用</div>
            <div class="endpoint"><span class="method put">PUT</span> /api/apps/{app_id} - 更新应用</div>
            <div class="endpoint"><span class="method delete">DELETE</span> /api/apps/{app_id} - 删除应用</div>
            <div class="endpoint"><span class="method post">POST</span> /api/test/{app_id} - 测试应用</div>
            <div class="endpoint"><span class="method">GET</span> /api/stats - 获取统计信息</div>
            <div class="endpoint"><span class="method">GET</span> /api/backups - 获取备份列表</div>
        </div>

        <div class="api-section">
            <h3>📝 消息格式示例</h3>
            <pre>{
  "sender": "系统监控",
  "time": "2024-03-24 14:30:00",
  "content": "服务器CPU使用率过高，请及时处理"
}</pre>
        </div>
    </div>
</body>
</html>`;
  }
}

export default AdminRouter;