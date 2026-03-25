# Changelog 
 
## [1.0.1] -  
 
### Added 
- New features and enhancements 
 
### Changed 
- Updates and improvements 
 
### Fixed 
- Bug fixes 
 
--- 
 

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- 图片消息支持
- 文件消息支持
- Webhook回调验证
- 更多消息类型支持

---

## Initial Development

### Added
- 🚀 **核心功能**
  - 企业微信消息推送代理服务
  - 多应用配置支持
  - Web管理界面
  - API Token认证机制

- 🐳 **Docker支持**
  - 完整的容器化部署
  - 多架构支持 (linux/amd64, linux/arm64)
  - Docker Compose配置
  - GitHub Container Registry集成

- 🔧 **开发体验**
  - 自动化CI/CD流程
  - 版本发布脚本
  - 完整的文档体系
  - 故障排除指南

- 📊 **管理功能**
  - 配置文件热更新
  - 自动配置备份
  - Token缓存管理
  - 访问日志记录

- 🔒 **安全特性**
  - Bearer Token认证
  - 代理服务器支持
  - SSL错误忽略选项
  - 权限控制机制

### Technical Implementation
- **Backend**: Node.js + 原生HTTP模块
- **Frontend**: 纯HTML + CSS + JavaScript
- **Storage**: JSON文件 + 自动备份
- **Deployment**: Docker + GitHub Actions
- **Architecture**: 轻量级, 零依赖设计

---

**格式说明:**
- `Added` - 新功能
- `Changed` - 现有功能的更改
- `Deprecated` - 即将移除的功能
- `Removed` - 已移除的功能
- `Fixed` - Bug修复
- `Security` - 安全相关的修复
