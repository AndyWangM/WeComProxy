@echo off
chcp 65001 >nul
echo WeComProxy 启动脚本
echo ===================
echo.

:: 检查Node.js是否安装
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js 未安装，请先安装 Node.js 18 或更高版本
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js 已安装

:: 检查是否在正确目录
if not exist package.json (
    echo ❌ 请在项目根目录运行此脚本
    pause
    exit /b 1
)

:: 创建数据目录
if not exist data mkdir data
if not exist data\config mkdir data\config
if not exist data\cache mkdir data\cache
if not exist data\logs mkdir data\logs
if not exist data\config\backups mkdir data\config\backups

echo ✅ 数据目录已创建

:: 检查依赖
if not exist node_modules (
    echo 📦 安装依赖包...
    npm install
    if errorlevel 1 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
)

:: 启动服务
echo.
echo 🚀 启动 WeComProxy 服务 (开发模式)...
echo 管理界面: http://localhost:3000/admin
echo 按 Ctrl+C 停止服务
echo.

set NODE_ENV=development
set NODE_TLS_REJECT_UNAUTHORIZED=0
node --watch src/index.js