#!/bin/bash

# WeComProxy 运行脚本
# 支持本地开发和Docker部署

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== WeComProxy 运行脚本 ===${NC}"

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 创建必要的目录
create_directories() {
    echo -e "${YELLOW}创建必要的目录...${NC}"
    mkdir -p data/config data/cache data/logs data/config/backups
}

# 本地开发运行
run_local() {
    echo -e "${BLUE}本地开发模式${NC}"

    create_directories

    # 检查Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}错误: Node.js 未安装${NC}"
        exit 1
    fi

    # 检查依赖
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}安装依赖...${NC}"
        npm install
    fi

    echo -e "${GREEN}启动WeComProxy服务 (开发模式)...${NC}"
    npm run dev
}

# Docker运行
run_docker() {
    echo -e "${BLUE}Docker模式${NC}"

    # 检查Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}错误: Docker 未安装${NC}"
        exit 1
    fi

    create_directories

    # 检查镜像是否存在
    if ! docker images wecom-proxy:latest -q | grep -q .; then
        echo -e "${YELLOW}镜像不存在，开始构建...${NC}"
        ./scripts/build.sh
    fi

    echo -e "${GREEN}启动WeComProxy Docker容器...${NC}"

    # 停止现有容器
    docker stop wecom-proxy 2>/dev/null || true
    docker rm wecom-proxy 2>/dev/null || true

    # 启动新容器
    docker run -d \
        --name wecom-proxy \
        --restart unless-stopped \
        -p 3000:3000 \
        -v "$(pwd)/data:/app/data" \
        -e NODE_ENV=production \
        -e LOG_LEVEL=info \
        wecom-proxy:latest

    echo -e "${GREEN}容器启动成功!${NC}"
    echo
    echo -e "${BLUE}查看日志:${NC} docker logs -f wecom-proxy"
    echo -e "${BLUE}停止服务:${NC} docker stop wecom-proxy"
    echo -e "${BLUE}管理界面:${NC} http://localhost:3000/admin"
}

# Docker Compose运行
run_compose() {
    echo -e "${BLUE}Docker Compose模式${NC}"

    # 检查docker-compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo -e "${RED}错误: docker-compose 未安装${NC}"
        exit 1
    fi

    create_directories

    echo -e "${GREEN}使用Docker Compose启动服务...${NC}"

    # 使用新版docker compose或旧版docker-compose
    if docker compose version &> /dev/null; then
        docker compose up -d
    else
        docker-compose up -d
    fi

    echo -e "${GREEN}服务启动成功!${NC}"
    echo
    echo -e "${BLUE}查看状态:${NC} docker compose ps"
    echo -e "${BLUE}查看日志:${NC} docker compose logs -f"
    echo -e "${BLUE}停止服务:${NC} docker compose down"
    echo -e "${BLUE}管理界面:${NC} http://localhost:3000/admin"
}

# 显示服务信息
show_service_info() {
    echo
    echo -e "${BLUE}=== 服务信息 ===${NC}"
    echo -e "${YELLOW}管理界面:${NC} http://localhost:3000/admin"
    echo -e "${YELLOW}Webhook接口:${NC} http://localhost:3000/webhook/{app_id}"
    echo -e "${YELLOW}API文档:${NC} http://localhost:3000/admin (页面底部)"
    echo
    echo -e "${BLUE}=== 示例应用配置 ===${NC}"
    if [ -f "data/config/apps.json" ]; then
        echo -e "${GREEN}配置文件已存在:${NC} data/config/apps.json"
    else
        echo -e "${YELLOW}首次运行，请通过管理界面添加应用配置${NC}"
    fi
}

# 主菜单
echo "请选择运行方式:"
echo "1) 本地开发 (npm run dev)"
echo "2) Docker 容器"
echo "3) Docker Compose"
echo "4) 仅显示服务信息"
read -p "请输入选项 (1-4): " choice

case $choice in
    1)
        run_local
        ;;
    2)
        run_docker
        show_service_info
        ;;
    3)
        run_compose
        show_service_info
        ;;
    4)
        show_service_info
        ;;
    *)
        echo -e "${RED}无效选项${NC}"
        exit 1
        ;;
esac