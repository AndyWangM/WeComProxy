import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AuthManager {
  constructor(configManager) {
    this.configManager = configManager;
    this.dataDir = process.env.DATA_DIR || path.join(__dirname, '../../data');
    this.authConfigPath = path.join(this.dataDir, 'config', 'auth.json');

    this.ensureAuthConfig();
  }

  ensureAuthConfig() {
    try {
      if (!fs.existsSync(this.authConfigPath)) {
        // 生成默认token
        const defaultToken = this.generateToken();
        const authConfig = {
          api_token: defaultToken,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          description: "API访问令牌 - 请妥善保管"
        };

        fs.writeFileSync(this.authConfigPath, JSON.stringify(authConfig, null, 2), 'utf8');
        console.log(`🔑 生成默认API Token: ${defaultToken}`);
        console.log('⚠️ 请记录此Token，用于API访问认证');
      }
    } catch (error) {
      console.error('Error ensuring auth config:', error);
    }
  }

  loadAuthConfig() {
    try {
      if (!fs.existsSync(this.authConfigPath)) {
        this.ensureAuthConfig();
      }

      const content = fs.readFileSync(this.authConfigPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error loading auth config:', error);
      return null;
    }
  }

  validateToken(token) {
    if (!token) {
      return false;
    }

    const authConfig = this.loadAuthConfig();
    if (!authConfig) {
      return false;
    }

    return authConfig.api_token === token;
  }

  extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      return null;
    }

    // 支持 "Bearer token" 格式
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) {
      return match[1];
    }

    // 也支持直接传token
    return authHeader;
  }

  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  updateToken(newToken = null) {
    try {
      const token = newToken || this.generateToken();
      const authConfig = this.loadAuthConfig() || {};

      authConfig.api_token = token;
      authConfig.updated_at = new Date().toISOString();

      fs.writeFileSync(this.authConfigPath, JSON.stringify(authConfig, null, 2), 'utf8');

      console.log(`🔑 API Token已更新: ${token}`);
      return token;
    } catch (error) {
      console.error('Error updating token:', error);
      return null;
    }
  }

  getTokenInfo() {
    const authConfig = this.loadAuthConfig();
    if (!authConfig) {
      return null;
    }

    return {
      token: authConfig.api_token,
      created_at: authConfig.created_at,
      updated_at: authConfig.updated_at,
      description: authConfig.description
    };
  }

  // 中间件：验证API请求
  requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = this.extractTokenFromHeader(authHeader);

    if (!this.validateToken(token)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or missing API token',
        code: 'AUTH_REQUIRED'
      }));
      return;
    }

    next();
  }

  // 中间件：验证管理界面访问
  requireAuthForAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = this.extractTokenFromHeader(authHeader);

    if (!this.validateToken(token)) {
      // 返回登录页面
      this.serveLoginPage(res);
      return;
    }

    next();
  }

  serveLoginPage(res) {
    const loginHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WeComProxy 登录</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .login-container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            width: 100%;
            max-width: 400px;
        }
        .logo {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo h1 {
            color: #333;
            font-size: 2em;
            margin-bottom: 10px;
        }
        .logo p {
            color: #666;
            font-size: 1.1em;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 8px;
            color: #333;
            font-weight: 500;
        }
        .form-group input {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s ease;
        }
        .form-group input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
        }
        .btn {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: transform 0.2s ease;
        }
        .btn:hover {
            transform: translateY(-2px);
        }
        .error {
            color: #dc3545;
            font-size: 14px;
            margin-top: 10px;
            text-align: center;
        }
        .help {
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            font-size: 14px;
            color: #666;
        }
        .help strong {
            color: #333;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">
            <h1>🚀 WeComProxy</h1>
            <p>请输入API Token进行身份验证</p>
        </div>

        <form id="loginForm">
            <div class="form-group">
                <label for="token">API Token:</label>
                <input type="password" id="token" name="token" placeholder="请输入您的API Token" required>
            </div>

            <button type="submit" class="btn">登录</button>

            <div id="error" class="error" style="display: none;"></div>
        </form>

        <div class="help">
            <strong>💡 提示:</strong><br>
            • Token在服务启动时会显示在控制台日志中<br>
            • 如需重新生成Token，请联系管理员<br>
            • Token用于保护API和管理界面的安全访问
        </div>
    </div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();

            const token = document.getElementById('token').value;
            const errorDiv = document.getElementById('error');

            if (!token) {
                showError('请输入Token');
                return;
            }

            try {
                // 验证token
                const response = await fetch('/api/auth/verify', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    // 保存token到sessionStorage和Cookie
                    sessionStorage.setItem('wecom_token', token);
                    document.cookie = 'wecom_token=' + token + '; path=/; max-age=86400'; // 1天有效
                    // 重定向到管理界面
                    window.location.href = '/admin';
                } else {
                    showError('Token无效，请检查后重试');
                }
            } catch (error) {
                showError('验证失败：' + error.message);
            }
        });

        function showError(message) {
            const errorDiv = document.getElementById('error');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';

            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }

        // 检查是否已有token
        window.addEventListener('load', () => {
            const token = sessionStorage.getItem('wecom_token');
            if (token) {
                document.getElementById('token').value = token;
            }
        });
    </script>
</body>
</html>`;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(loginHtml);
  }
}

export default AuthManager;