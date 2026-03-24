@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo WeComProxy Docker Compose 启动脚本
echo =====================================
echo.

REM 检查Docker
docker version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker 未安装或未启动
    pause
    exit /b 1
)

REM 检查Docker Compose
docker compose version >nul 2>&1
if errorlevel 1 (
    docker-compose version >nul 2>&1
    if errorlevel 1 (
        echo ❌ Docker Compose 未安装
        pause
        exit /b 1
    )
    set COMPOSE_CMD=docker-compose
) else (
    set COMPOSE_CMD=docker compose
)

:menu
echo 请选择启动模式:
echo 1) 标准生产模式 (docker-compose.yml)
echo 2) 完整生产模式 (docker-compose.prod.yml)
echo 3) 开发模式 (docker-compose.dev.yml)
echo 4) 停止所有服务
echo 5) 查看服务状态
echo 6) 查看服务日志
echo 0) 退出
echo.

set /p choice="请输入选项 (0-6): "

if "%choice%"=="1" (
    call :start_service docker-compose.yml "标准生产模式"
    goto :end
)
if "%choice%"=="2" (
    call :start_service docker-compose.prod.yml "完整生产模式"
    goto :end
)
if "%choice%"=="3" (
    call :start_service docker-compose.dev.yml "开发模式"
    goto :end
)
if "%choice%"=="4" (
    call :stop_services
    goto :end
)
if "%choice%"=="5" (
    call :show_status
    echo.
    goto :menu
)
if "%choice%"=="6" (
    call :show_logs
    goto :end
)
if "%choice%"=="0" (
    echo 退出
    goto :end
)

echo ❌ 无效选项，请重新选择
echo.
goto :menu

:start_service
set compose_file=%1
set mode_name=%2

echo 📦 使用配置文件: %compose_file%
echo.

REM 创建数据目录
call :create_data_dirs

echo 🚀 启动 %mode_name% 服务...
%COMPOSE_CMD% -f %compose_file% up -d

if errorlevel 1 (
    echo ❌ 服务启动失败!
    pause
    exit /b 1
)

echo.
echo ✅ 服务启动成功!
echo.
echo === 服务信息 ===
echo 管理界面: http://localhost:3000/admin
echo API接口: http://localhost:3000/api/apps
echo 健康检查: http://localhost:3000/api/stats
echo.
echo === 管理命令 ===
echo 查看日志: docker logs -f wecom-proxy
echo 停止服务: %COMPOSE_CMD% -f %compose_file% down
echo 重启服务: %COMPOSE_CMD% -f %compose_file% restart
echo.
goto :eof

:stop_services
echo 🛑 停止所有 WeComProxy 服务...

REM 停止可能存在的服务
for %%f in (docker-compose.yml docker-compose.prod.yml docker-compose.dev.yml) do (
    if exist "%%f" (
        echo 停止 %%f...
        %COMPOSE_CMD% -f %%f down >nul 2>&1
    )
)

REM 强制停止容器
docker stop wecom-proxy wecom-proxy-dev >nul 2>&1
docker rm wecom-proxy wecom-proxy-dev >nul 2>&1

echo ✅ 服务已停止
echo.
goto :eof

:show_status
echo === WeComProxy 服务状态 ===
echo.

docker ps | findstr wecom-proxy >nul 2>&1
if errorlevel 1 (
    echo ❌ 服务未运行
) else (
    echo ✅ 服务正在运行:
    docker ps | findstr wecom-proxy
    echo.
    echo 健康检查:
    curl -s http://localhost:3000/api/stats 2>nul || echo 无法连接到服务
)
echo.
goto :eof

:show_logs
echo === WeComProxy 服务日志 ===
echo 按 Ctrl+C 退出日志查看
echo.

docker ps | findstr wecom-proxy >nul 2>&1
if errorlevel 1 (
    echo ❌ 服务未运行
    pause
    goto :eof
)

docker logs -f wecom-proxy 2>nul || docker logs -f wecom-proxy-dev 2>nul || (
    echo 找不到运行中的容器
    pause
)
goto :eof

:create_data_dirs
if not exist "data" mkdir data
if not exist "data\config" mkdir data\config
if not exist "data\cache" mkdir data\cache
if not exist "data\logs" mkdir data\logs
if not exist "data\config\backups" mkdir data\config\backups

REM 创建默认配置文件
if not exist "data\config\apps.json" (
    echo {}> data\config\apps.json
    echo ✅ 创建默认应用配置文件
)

if not exist "data\config\server.json" (
    (
        echo {
        echo   "port": 3000,
        echo   "host": "0.0.0.0",
        echo   "base_path": "",
        echo   "log_level": "info",
        echo   "backup_retention_days": 30
        echo }
    ) > data\config\server.json
    echo ✅ 创建默认服务器配置文件
)
goto :eof

:end
pause