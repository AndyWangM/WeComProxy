# WeComProxy - 企业微信消息推送代理服务

一个轻量级的企业微信消息推送代理服务，支持多应用配置、Web管理界面和Docker容器化部署。

## ✨ 特性

- 🚀 **轻量级**: 零依赖，基于Node.js原生HTTP模块
- 🔧 **多应用支持**: 一个服务支持多个企业微信应用
- 🌐 **Web管理界面**: 简单易用的配置管理界面
- 🔐 **API认证**: 基于Token的安全认证机制
- 📦 **容器化**: 完整的Docker支持，一键部署
- 🔒 **代理转发**: 支持固定IP代理，解决企业微信IP限制
- 💾 **配置备份**: 自动配置备份和版本管理
- 📊 **Token管理**: 自动获取和刷新access_token

## 🚦 快速开始

### 方式1: Docker部署 (推荐)

```bash
# 克隆项目
git clone <repository-url>
cd WeComProxy

# 一键部署
chmod +x scripts/*.sh
./scripts/deploy.sh
```

### 方式2: Docker Compose

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 方式3: 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 或启动生产服务器
npm start
```

## 📋 API接口

### Webhook接口 (对外)

#### 发送消息
```http
POST /webhook/{app_id}
Content-Type: application/json

{
  "sender": "系统监控",
  "time": "2024-03-24 14:30:00",
  "content": "服务器CPU使用率过高，请及时处理"
}
```

### 管理接口 (内部)

## 🔐 API认证

WeComProxy 使用 Bearer Token 进行API认证，保护所有接口的安全访问。

### 获取API Token

**首次启动时**，系统会自动生成API Token并在控制台显示：

```
🔑 生成默认API Token: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
⚠️ 请记录此Token，用于API访问认证
```

### 使用Token

所有API请求都需要在Header中包含Token：

```bash
Authorization: Bearer YOUR_API_TOKEN_HERE
```

### Token管理

- **Web界面管理**: 访问 `/admin` → `Token管理` 标签页
- **重新生成**: 在Token管理页面点击"重新生成Token"
- **安全提醒**: Token泄露后请立即重新生成

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin` | Web管理界面 |
| GET | `/api/apps` | 获取所有应用 |
| POST | `/api/apps` | 创建新应用 |
| GET | `/api/apps/{app_id}` | 获取应用详情 |
| PUT | `/api/apps/{app_id}` | 更新应用配置 |
| DELETE | `/api/apps/{app_id}` | 删除应用 |
| POST | `/api/test/{app_id}` | 测试应用 |
| GET | `/api/stats` | 获取统计信息 |
| GET | `/api/backups` | 获取备份列表 |

## ⚙️ 配置说明

### 配置文件管理

WeComProxy使用JSON文件存储配置，支持热更新和自动备份：

**配置文件位置：**
- 容器内路径：`/app/data/config/`
- 主配置文件：`apps.json` (应用配置)
- 服务配置文件：`server.json` (服务器设置)

### 应用配置详解

**配置文件：`data/config/apps.json`**

```json
{
  "alert_app": {
    "name": "告警通知应用",
    "corpid": "ww1234567890abcdef",
    "corpsecret": "your_app_secret_here_32_characters_long",
    "agentid": 1000001,
    "proxy_url": "http://your-proxy-server.com",
    "target_users": "user001|user002|user003",
    "target_parties": "1|2",
    "target_tags": "tag1|tag2",
    "message_format": "发送人：{sender}\\n时间：{time}\\n内容：{content}",
    "enabled": true
  }
}
```

**字段说明：**

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `name` | String | 应用显示名称 | `"告警通知应用"` |
| `corpid` | String | 企业ID | `"ww1234567890abcdef"` |
| `corpsecret` | String | 应用密钥 | `"your_app_secret"` |
| `agentid` | Number | 应用ID | `1000001` |
| `proxy_url` | String | 代理转发地址 (可选) | `"http://api.example.com"` |
| `target_users` | String | 接收用户 | `"user1\|user2"` 或 `"@all"` |
| `target_parties` | String | 接收部门 (可选) | `"1\|2"` |
| `target_tags` | String | 接收标签 (可选) | `"tag1\|tag2"` |
| `message_format` | String | 消息模板 | 支持 `{sender}`, `{time}`, `{content}` |
| `enabled` | Boolean | 是否启用 | `true`/`false` |

**接收者配置规则：**
- **发送给所有人**: `"target_users": "@all"`
- **发送给特定用户**: `"target_users": "zhangsan|lisi|wangwu"`
- **发送给部门**: `"target_parties": "1|2|3"`
- **发送给标签**: `"target_tags": "manager|developer"`
- **组合发送**: 可以同时配置用户、部门和标签

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | `3000` | 服务端口 |
| `HOST` | `0.0.0.0` | 监听地址 |
| `BASE_PATH` | `` | 二级路径 (如: `/wecom-proxy`) |
| `DATA_DIR` | `./data` | 数据目录 |
| `LOG_LEVEL` | `info` | 日志级别 |
| `BACKUP_RETENTION_DAYS` | `30` | 备份保留天数 |
| `NODE_ENV` | `production` | 环境模式 (`development`/`production`) |

### 开发环境代理配置

如果在公司内网需要使用HTTP代理访问外网，可以在 `data/config/server.dev.json` 中配置：

```json
{
  "global_proxy": "http://your-proxy-server:port"
}
```

开发模式会自动使用此配置文件。

## 🐳 Docker部署

[![Docker](https://github.com/AndyWangM/WeComProxy/actions/workflows/docker-build.yml/badge.svg)](https://github.com/AndyWangM/WeComProxy/actions/workflows/docker-build.yml)

### 使用预构建镜像 (推荐)

GitHub Actions自动构建多架构Docker镜像，支持 `linux/amd64` 和 `linux/arm64`。

```bash
# 创建配置目录
mkdir -p wecom-data/config

# 下载示例配置文件
curl -o wecom-data/config/apps.json \\
  https://raw.githubusercontent.com/AndyWangM/WeComProxy/main/examples/config/apps.json.example

curl -o wecom-data/config/server.json \\
  https://raw.githubusercontent.com/AndyWangM/WeComProxy/main/examples/config/server.json.example

# 编辑配置文件 (填入你的企业微信配置)
nano wecom-data/config/apps.json

# 启动服务
docker run -d \\
  --name wecom-proxy \\
  --restart unless-stopped \\
  -p 3000:3000 \\
  -v $(pwd)/wecom-data:/app/data \\
  ghcr.io/andywangm/wecomproxy:latest
```

**可用的镜像标签：**
- `ghcr.io/andywangm/wecomproxy:latest` - 最新稳定版本
- `ghcr.io/andywangm/wecomproxy:main` - 主分支构建 (开发版本)
- `ghcr.io/andywangm/wecomproxy:v1.0.0` - 具体版本标签
- `ghcr.io/andywangm/wecomproxy:1.0` - 主要版本标签
- `ghcr.io/andywangm/wecomproxy:1` - 大版本标签

**版本发布：**
每当推送版本标签 (如 `v1.0.1`) 时，GitHub Actions 会自动：
- 🏗️ 构建多架构 Docker 镜像
- 📦 推送到 GitHub Container Registry
- 📋 创建 GitHub Release
- 📝 生成详细的发布说明

### 单容器部署

```bash
docker run -d \\
  --name wecom-proxy \\
  --restart unless-stopped \\
  -p 3000:3000 \\
  -v ./data:/app/data \\
  -e BASE_PATH=/wecom-proxy \\
  wecom-proxy:latest
```

### 数据目录挂载说明

WeComProxy支持完整的数据目录外部挂载，包括配置、缓存和日志：

```bash
# 完整挂载 (推荐)
docker run -d \\
  --name wecom-proxy \\
  -p 3000:3000 \\
  -v /host/wecom-data:/app/data \\
  wecom-proxy:latest

# 分别挂载不同目录
docker run -d \\
  --name wecom-proxy \\
  -p 3000:3000 \\
  -v /host/wecom-config:/app/data/config \\
  -v /host/wecom-cache:/app/data/cache \\
  -v /host/wecom-logs:/app/data/logs \\
  wecom-proxy:latest
```

**挂载目录结构：**
```
/host/wecom-data/
├── config/
│   ├── apps.json           # 应用配置 (可编辑)
│   ├── server.json         # 服务器配置 (可编辑)
│   └── backups/           # 配置备份 (自动生成)
├── cache/                 # Token缓存 (自动生成)
│   └── {app_id}.json
└── logs/                  # 日志文件 (自动生成)
```

### 反向代理配置 (Nginx)

```nginx
location /wecom-proxy {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## 📝 使用示例

### 1. 添加应用配置

通过Web界面 `http://localhost:3000/admin` 或API：

```bash
curl -X POST http://localhost:3000/api/apps \\
  -H "Content-Type: application/json" \\
  -d '{
    "id": "alert_app",
    "name": "告警通知",
    "corpid": "ww1f0155f4099909a2",
    "corpsecret": "your_app_secret",
    "agentid": 1000013,
    "target_users": "@all"
  }'
```

### 2. 发送消息

```bash
curl -X POST http://localhost:3000/webhook/alert_app \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sender": "监控系统",
    "time": "2024-03-24 14:30:00",
    "content": "服务器CPU使用率过高，请及时处理"
  }'
```

### 3. 测试应用

```bash
curl -X POST http://localhost:3000/api/test/alert_app
```

## 🔧 开发指南

### 项目结构

```
WeComProxy/
├── src/
│   ├── index.js              # 主入口
│   ├── routes/
│   │   ├── webhook.js        # Webhook路由
│   │   └── admin.js          # 管理接口路由
│   ├── services/
│   │   ├── wecom-client.js   # 企业微信客户端
│   │   └── token-manager.js  # Token管理
│   └── utils/
│       └── config-manager.js # 配置管理
├── data/                     # 数据目录 (挂载)
│   ├── config/              # 配置文件
│   ├── cache/               # Token缓存
│   └── logs/                # 日志文件
├── scripts/                 # 构建脚本
├── docker-compose.yml       # Docker Compose配置
└── Dockerfile              # Docker镜像构建
```

### 本地开发

```bash
# 安装依赖
npm install

# 开发模式 (自动重启)
npm run dev

# 构建Docker镜像
./scripts/build.sh

# 运行服务
./scripts/run.sh
```

## 🏗️ 架构设计

### 服务架构图

```
┌─────────────────────────────────────────────────────┐
│                   外部系统                           │
└─────────────────┬───────────────────────────────────┘
                  │ HTTP POST /webhook/{app_id}
                  ▼
┌─────────────────────────────────────────────────────┐
│              WeComProxy 服务                         │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ Webhook API │  │ 配置管理      │  │ Web管理界面  │ │
│  └─────┬───────┘  └──────┬───────┘  └─────────────┘ │
│        │                 │                          │
│  ┌─────▼───────┐  ┌──────▼───────┐                  │
│  │ 消息处理     │  │ Token管理     │                  │
│  └─────┬───────┘  └──────────────┘                  │
└────────┼─────────────────────────────────────────────┘
         │ 通过代理转发 (可选)
         ▼
┌─────────────────────────────────────────────────────┐
│              企业微信API                             │
└─────────────────┬───────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────┐
│                企业微信用户                          │
└─────────────────────────────────────────────────────┘
```

### Docker配置外部挂载

**推荐挂载方式：**

```bash
# 方式1: 完整数据目录挂载 (推荐)
docker run -d \\
  --name wecom-proxy \\
  -p 3000:3000 \\
  -v /host/wecom-data:/app/data \\
  wecom-proxy:latest

# 方式2: 分目录挂载 (更灵活)
docker run -d \\
  --name wecom-proxy \\
  -p 3000:3000 \\
  -v /host/wecom-config:/app/data/config \\
  -v /host/wecom-cache:/app/data/cache \\
  -v /host/wecom-logs:/app/data/logs \\
  wecom-proxy:latest
```

**挂载目录说明：**

| 容器路径 | 宿主机路径示例 | 作用 | 是否必须 |
|----------|----------------|------|----------|
| `/app/data/config` | `/host/wecom-config` | 应用配置文件 | **强烈推荐** |
| `/app/data/cache` | `/host/wecom-cache` | Token缓存 | 推荐 |
| `/app/data/logs` | `/host/wecom-logs` | 应用日志 | 可选 |

**配置文件结构：**
```
/host/wecom-config/
├── apps.json              # 应用配置 (可手动编辑)
├── server.json            # 服务器配置 (可手动编辑)
└── backups/               # 自动备份目录
    ├── apps.2024-03-24-14-30-00.json
    └── apps.2024-03-24-13-45-00.json
```

**配置热更新特性：**
- ✅ 修改挂载的 `apps.json` 后立即生效
- ✅ 支持通过Web管理界面在线编辑
- ✅ 自动创建配置备份，防止误操作
- ✅ 重启容器不会丢失配置

### Docker Compose 完整示例

```yaml
version: '3.8'
services:
  wecom-proxy:
    image: wecom-proxy:latest
    container_name: wecom-proxy
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      # 推荐：完整目录挂载
      - ./wecom-data:/app/data

      # 或者分别挂载 (更灵活)
      # - ./config:/app/data/config
      # - ./cache:/app/data/cache
      # - ./logs:/app/data/logs
    environment:
      - NODE_ENV=production
      - PORT=3000
      # 如果需要二级路径部署
      # - BASE_PATH=/wecom-proxy
```

**启动步骤：**
```bash
# 1. 创建数据目录
mkdir -p wecom-data/{config,cache,logs}

# 2. 创建初始配置文件
echo '{}' > wecom-data/config/apps.json

# 3. 启动服务
docker-compose up -d

# 4. 访问管理界面添加应用配置
# http://localhost:3000/admin
```

## 🛠️ 故障排除

### 常见问题

1. **Token获取失败**
   - 检查corpid和corpsecret是否正确
   - 确认应用已启用并有消息发送权限

2. **消息发送失败**
   - 检查用户ID是否存在
   - 确认代理URL配置正确

3. **容器启动失败**
   - 检查端口是否被占用
   - 确认数据目录权限正确

### 查看日志

```bash
# Docker日志
docker logs -f wecom-proxy

# 本地日志
tail -f data/logs/app.log
```

## 📄 许可证

MIT License

## 🚀 版本发布

### 📋 完整发布指南

**🎯 首次发布？请查看详细指南**: [📖 发布指南](docs/RELEASE_GUIDE.md)

### 快速发布 (熟悉流程后)

**一键发布:**
```bash
# Windows
scripts\release.bat 1.0.1

# Linux/macOS
./scripts/release.sh 1.0.1
```

**手动发布流程:**
```bash
# 1. 更新版本并提交
git add .
git commit -m "feat: new feature implementation"
git push origin main

# 2. 创建版本标签
git tag -a v1.0.1 -m "Release version 1.0.1: Add new features"
git push origin v1.0.1
```

### 自动化流程

创建版本标签后，GitHub Actions 会自动：

1. **🏗️ 多架构构建**: 支持 `linux/amd64` 和 `linux/arm64`
2. **📦 镜像发布**: 推送到 GitHub Container Registry
3. **🏷️ 标签管理**: 创建语义化版本标签 (`v1.0.1`, `1.0`, `1`, `latest`)
4. **📋 Release创建**: 自动生成 GitHub Release 页面
5. **📝 发布说明**: 包含Docker使用说明和变更日志
6. **🔐 安全签名**: 镜像包含构建证明和签名

### 镜像版本控制

```bash
# 具体版本 (推荐用于生产环境)
docker pull ghcr.io/andywangm/wecomproxy:v1.0.1

# 最新稳定版
docker pull ghcr.io/andywangm/wecomproxy:latest

# 开发版本
docker pull ghcr.io/andywangm/wecomproxy:main
```

## 🤝 贡献

欢迎提交Issue和Pull Request!

### 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 开发规范

- **提交信息**: 使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式
- **代码风格**: 遵循项目现有代码风格
- **测试**: 添加相应的测试用例
- **文档**: 更新相关文档

---

**管理界面**: http://localhost:3000/admin
**API文档**: 访问管理界面查看完整API说明
**GitHub仓库**: https://github.com/AndyWangM/WeComProxy
**Docker镜像**: https://github.com/AndyWangM/WeComProxy/pkgs/container/wecomproxy