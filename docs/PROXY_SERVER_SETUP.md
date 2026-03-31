# 代理服务器配置指南

WeComProxy 支持通过一台中间代理服务器转发企业微信 API 请求，使企业微信只看到代理服务器的固定 IP，从而满足 IP 白名单要求。

## 工作原理

```
WeComProxy 服务器                    代理服务器                    企业微信 API
       │                                 │                              │
       │  POST /cgi-bin/xxx?token=yyy    │                              │
       │ ──────────────────────────────► │                              │
       │                                 │  POST /cgi-bin/xxx?token=yyy │
       │                                 │ ────────────────────────────►│
       │                                 │         { errcode: 0 }       │
       │         { errcode: 0 }          │ ◄────────────────────────────│
       │ ◄────────────────────────────── │                              │
```

- WeComProxy 将原始 API 地址 `https://qyapi.weixin.qq.com/cgi-bin/...` 的**路径部分**拼接到代理服务器地址后发出
- 代理服务器上的 nginx 负责将该路径转发到 `qyapi.weixin.qq.com`
- 企业微信只看到代理服务器的 IP，无需在白名单中添加 WeComProxy 的 IP

---

## 代理服务器 nginx 配置

### 基础配置（HTTP）

```nginx
server {
    listen 80;
    server_name proxy.your.com;  # 替换为代理服务器的域名或 IP

    # 安全：只允许 WeComProxy 所在服务器访问，拒绝其他来源
    allow 1.2.3.4;   # 替换为 WeComProxy 服务器的 IP
    deny  all;

    location /cgi-bin/ {
        proxy_pass          https://qyapi.weixin.qq.com;
        proxy_set_header    Host              qyapi.weixin.qq.com;
        proxy_ssl_server_name on;

        proxy_connect_timeout  10s;
        proxy_send_timeout     30s;
        proxy_read_timeout     30s;
    }
}
```

### 生产配置（HTTPS + 日志）

```nginx
server {
    listen 443 ssl;
    server_name proxy.your.com;  # 替换为代理服务器域名

    ssl_certificate     /etc/nginx/ssl/proxy.your.com.pem;
    ssl_certificate_key /etc/nginx/ssl/proxy.your.com.key;

    # 安全：只允许 WeComProxy 所在服务器访问
    allow 1.2.3.4;   # 替换为 WeComProxy 服务器的 IP
    deny  all;

    access_log  /var/log/nginx/wecom-forward.access.log;
    error_log   /var/log/nginx/wecom-forward.error.log;

    location /cgi-bin/ {
        proxy_pass          https://qyapi.weixin.qq.com;
        proxy_set_header    Host              qyapi.weixin.qq.com;
        proxy_ssl_server_name on;

        proxy_connect_timeout  10s;
        proxy_send_timeout     30s;
        proxy_read_timeout     30s;
    }
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name proxy.your.com;
    return 301 https://$host$request_uri;
}
```

---

## WeComProxy 应用配置

在 `data/config/apps.json` 中，为需要走代理的应用设置 `proxy_url`：

```json
{
  "alert_app": {
    "name": "告警通知",
    "corpid": "ww1234567890abcdef",
    "corpsecret": "your_app_secret",
    "agentid": 1000001,
    "proxy_url": "http://proxy.your.com",
    "target_users": "@all",
    "enabled": true
  }
}
```

| `proxy_url` 值 | 行为 |
|---|---|
| 不填 / 空字符串 | 直接请求企业微信 API |
| `skip` | 强制直连，跳过代理 |
| `http://proxy.your.com` | 通过代理服务器转发 |

> **注意**：`proxy_url` 只影响**发送消息**的请求。获取 `access_token` 的请求走 `server.json` 中的 `global_proxy` 配置（标准 HTTP 代理协议）。如果 token 请求也需要走同一台代理服务器，还需在 `server.json` 中配置：
>
> ```json
> {
>   "global_proxy": "http://proxy.your.com:8080"
> }
> ```
> 这要求代理服务器同时支持标准 HTTP CONNECT 代理（如 Squid）。

---

## 请求转发示例

WeComProxy 发出的实际请求：

```
POST http://proxy.your.com/cgi-bin/message/send?access_token=xxxxxxxx
Content-Type: application/json

{
  "msgtype": "text",
  "agentid": 1000001,
  "touser": "@all",
  "text": { "content": "消息内容" }
}
```

nginx 收到后，转发到：

```
POST https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=xxxxxxxx
Host: qyapi.weixin.qq.com
Content-Type: application/json

{ ...同上... }
```

---

## 验证配置

```bash
# 1. 检查 nginx 配置语法
nginx -t

# 2. 重载 nginx
nginx -s reload

# 3. 在 WeComProxy 服务器上测试代理是否连通
curl -X POST "http://proxy.your.com/cgi-bin/gettoken?corpid=xxx&corpsecret=yyy"

# 4. 通过 WeComProxy 管理界面发送测试消息
# 访问 http://your-wecom-proxy/admin → 选择应用 → 发送测试
```
