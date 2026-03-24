import url from 'url';

class WebhookRouter {
  constructor(wecomClient, authManager) {
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
        basePath = basePath.replace(/^\/+|\/+$/g, ''); // 清理前后的斜杠
        if (pathParts.length > 0 && pathParts[0] === basePath) {
          pathParts.shift();
        }
      }

      // 检查是否为webhook路径: /webhook/{app_id}
      if (pathParts.length !== 2 || pathParts[0] !== 'webhook') {
        return this.sendError(res, 404, 'Not Found', 'Webhook path should be /webhook/{app_id}');
      }

      const appId = pathParts[1];

      // 验证API Token
      const authHeader = req.headers.authorization;
      const token = this.authManager.extractTokenFromHeader(authHeader);

      if (!this.authManager.validateToken(token)) {
        return this.sendError(res, 401, 'Unauthorized', 'Invalid or missing API token');
      }

      if (req.method === 'POST') {
        await this.handleWebhookPost(req, res, appId);
      } else {
        return this.sendError(res, 405, 'Method Not Allowed', 'Only POST method is supported for webhooks');
      }
    } catch (error) {
      console.error('Webhook handler error:', error);
      return this.sendError(res, 500, 'Internal Server Error', error.message);
    }
  }

  async handleWebhookPost(req, res, appId) {
    try {
      // 读取请求体
      const body = await this.readRequestBody(req);

      if (!body) {
        return this.sendError(res, 400, 'Bad Request', 'Request body is required');
      }

      let messageData;
      try {
        messageData = JSON.parse(body);
      } catch (error) {
        return this.sendError(res, 400, 'Bad Request', 'Invalid JSON format');
      }

      // 发送消息
      const result = await this.wecomClient.sendMessage(appId, messageData);

      if (result.success) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Message sent successfully',
          data: {
            app_id: appId,
            message_id: result.message_id,
            invaliduser: result.invaliduser,
            invalidparty: result.invalidparty,
            invalidtag: result.invalidtag,
            timestamp: new Date().toISOString()
          }
        }));
      } else {
        return this.sendError(res, 400, 'Message Send Failed', result.error);
      }
    } catch (error) {
      console.error(`Error handling webhook POST for ${appId}:`, error);
      return this.sendError(res, 500, 'Internal Server Error', error.message);
    }
  }

  async readRequestBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';

      req.on('data', chunk => {
        body += chunk.toString();

        // 防止请求体过大
        if (body.length > 1024 * 1024) { // 1MB limit
          reject(new Error('Request body too large'));
        }
      });

      req.on('end', () => {
        resolve(body);
      });

      req.on('error', error => {
        reject(error);
      });
    });
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
}

export default WebhookRouter;