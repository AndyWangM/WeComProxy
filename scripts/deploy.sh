#!/bin/bash

# WeComProxy 一键部署脚本
# 适用于生产环境快速部署

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 默认配置
DEFAULT_PORT=3000
DEFAULT_BASE_PATH=""
DEFAULT_DATA_DIR="./wecom-proxy-data"

echo -e "${BLUE}=== WeComProxy 一键部署脚本 ===${NC}"
echo

# 获取部署配置
get_deploy_config() {
    echo -e "${YELLOW}配置部署参数:${NC}"

    read -p "服务端口 (默认: ${DEFAULT_PORT}): " PORT
    PORT=${PORT:-$DEFAULT_PORT}

    read -p "二级路径 (例如: /wecom-proxy，留空表示根路径): " BASE_PATH
    BASE_PATH=${BASE_PATH:-$DEFAULT_BASE_PATH}

    read -p "数据目录 (默认: ${DEFAULT_DATA_DIR}): " DATA_DIR
    DATA_DIR=${DATA_DIR:-$DEFAULT_DATA_DIR}

    echo
    echo -e "${BLUE}部署配置:${NC}"
    echo -e "端口: ${YELLOW}${PORT}${NC}"
    echo -e "路径: ${YELLOW}${BASE_PATH:-"/""}${NC}"
    echo -e "数据目录: ${YELLOW}${DATA_DIR}${NC}"
    echo

    read -p "确认部署? (y/N): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        echo "取消部署"
        exit 0
    fi
}

# 检查系统依赖
check_dependencies() {
    echo -e "${YELLOW}检查系统依赖...${NC}"

    # 检查Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}错误: Docker 未安装${NC}"
        echo "请先安装Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi

    # 检查docker-compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo -e "${YELLOW}警告: docker-compose 未安装，将使用单容器部署${NC}"
        USE_COMPOSE=false
    else
        USE_COMPOSE=true
    fi

    echo -e "${GREEN}依赖检查完成${NC}"
}

# 创建部署目录和文件
prepare_deployment() {
    echo -e "${YELLOW}准备部署环境...${NC}"

    # 创建数据目录
    mkdir -p "${DATA_DIR}/config" "${DATA_DIR}/cache" "${DATA_DIR}/logs" "${DATA_DIR}/config/backups"

    # 创建示例配置文件
    if [ ! -f "${DATA_DIR}/config/apps.json" ]; then
        cat > "${DATA_DIR}/config/apps.json" << EOF
{
  "example_app": {
    "name": "示例应用",
    "corpid": "请替换为您的企业ID",
    "corpsecret": "请替换为您的应用密钥",
    "agentid": 1000000,
    "proxy_url": "http://api.wangandi.com",
    "target_users": "@all",
    "target_parties": "",
    "target_tags": "",
    "message_format": "发送人：{sender}\\n时间：{time}\\n内容：{content}",
    "enabled": false
  }
}
EOF
        echo -e "${GREEN}创建示例配置: ${DATA_DIR}/config/apps.json${NC}"
    fi

    # 创建服务器配置
    cat > "${DATA_DIR}/config/server.json" << EOF
{
  "port": ${PORT},
  "host": "0.0.0.0",
  "base_path": "${BASE_PATH}",
  "log_level": "info",
  "backup_retention_days": 30
}
EOF

    echo -e "${GREEN}部署环境准备完成${NC}"
}

# Docker Compose部署
deploy_with_compose() {
    echo -e "${YELLOW}使用Docker Compose部署...${NC}"

    # 创建docker-compose.yml
    cat > docker-compose.yml << EOF
version: '3.8'

services:
  wecom-proxy:
    image: wecom-proxy:latest
    container_name: wecom-proxy
    restart: unless-stopped
    ports:
      - "${PORT}:3000"
    volumes:
      - ${DATA_DIR}:/app/data
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOST=0.0.0.0
      - BASE_PATH=${BASE_PATH}
      - DATA_DIR=/app/data
      - LOG_LEVEL=info
      - BACKUP_RETENTION_DAYS=30
    healthcheck:
      test: ["CMD", "node", "-e", "const http=require('http');const options={host:'localhost',port:3000,path:'/api/stats',timeout:2000};const req=http.request(options,res=>{process.exit(res.statusCode===200?0:1)});req.on('error',()=>process.exit(1));req.end();"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.1'
          memory: 64M

networks:
  default:
    name: wecom-proxy-network
EOF

    # 构建镜像（如果不存在）
    if ! docker images wecom-proxy:latest -q | grep -q .; then
        echo -e "${YELLOW}构建镜像...${NC}"
        if [ -f "Dockerfile" ]; then
            docker build -t wecom-proxy:latest .
        else
            echo -e "${RED}错误: 找不到Dockerfile${NC}"
            exit 1
        fi
    fi

    # 启动服务
    if docker compose version &> /dev/null; then
        docker compose up -d
    else
        docker-compose up -d
    fi

    echo -e "${GREEN}Docker Compose部署完成${NC}"
}

# 单容器部署
deploy_with_docker() {
    echo -e "${YELLOW}使用Docker单容器部署...${NC}"

    # 构建镜像（如果不存在）
    if ! docker images wecom-proxy:latest -q | grep -q .; then
        echo -e "${YELLOW}构建镜像...${NC}"
        if [ -f "Dockerfile" ]; then
            docker build -t wecom-proxy:latest .
        else
            echo -e "${RED}错误: 找不到Dockerfile${NC}"
            exit 1
        fi
    fi

    # 停止现有容器
    docker stop wecom-proxy 2>/dev/null || true
    docker rm wecom-proxy 2>/dev/null || true

    # 启动新容器
    docker run -d \
        --name wecom-proxy \
        --restart unless-stopped \
        -p "${PORT}:3000" \
        -v "$(pwd)/${DATA_DIR}:/app/data" \
        -e NODE_ENV=production \
        -e PORT=3000 \
        -e HOST=0.0.0.0 \
        -e BASE_PATH="${BASE_PATH}" \
        -e DATA_DIR=/app/data \
        -e LOG_LEVEL=info \
        -e BACKUP_RETENTION_DAYS=30 \
        wecom-proxy:latest

    echo -e "${GREEN}Docker单容器部署完成${NC}"
}

# 创建管理脚本
create_management_scripts() {
    echo -e "${YELLOW}创建管理脚本...${NC}"

    # 创建启动脚本
    cat > start.sh << 'EOF'
#!/bin/bash
if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    if docker compose version &> /dev/null; then
        docker compose up -d
    else
        docker-compose up -d
    fi
else
    docker start wecom-proxy
fi
echo "WeComProxy started"
EOF

    # 创建停止脚本
    cat > stop.sh << 'EOF'
#!/bin/bash
if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    if docker compose version &> /dev/null; then
        docker compose down
    else
        docker-compose down
    fi
else
    docker stop wecom-proxy
fi
echo "WeComProxy stopped"
EOF

    # 创建状态检查脚本
    cat > status.sh << 'EOF'
#!/bin/bash
echo "=== WeComProxy Status ==="
if docker ps | grep wecom-proxy; then
    echo "✅ Service is running"
    echo
    echo "Logs:"
    docker logs --tail 10 wecom-proxy
else
    echo "❌ Service is not running"
fi
EOF

    chmod +x start.sh stop.sh status.sh
    echo -e "${GREEN}管理脚本创建完成${NC}"
}

# 显示部署结果
show_deployment_result() {
    echo
    echo -e "${GREEN}🎉 部署成功!${NC}"
    echo
    echo -e "${BLUE}=== 服务信息 ===${NC}"
    echo -e "${YELLOW}服务地址:${NC} http://localhost:${PORT}${BASE_PATH}"
    echo -e "${YELLOW}管理界面:${NC} http://localhost:${PORT}${BASE_PATH}/admin"
    echo -e "${YELLOW}Webhook接口:${NC} http://localhost:${PORT}${BASE_PATH}/webhook/{app_id}"
    echo
    echo -e "${BLUE}=== 管理命令 ===${NC}"
    echo -e "${YELLOW}启动服务:${NC} ./start.sh"
    echo -e "${YELLOW}停止服务:${NC} ./stop.sh"
    echo -e "${YELLOW}查看状态:${NC} ./status.sh"
    echo -e "${YELLOW}查看日志:${NC} docker logs -f wecom-proxy"
    echo
    echo -e "${BLUE}=== 配置文件 ===${NC}"
    echo -e "${YELLOW}应用配置:${NC} ${DATA_DIR}/config/apps.json"
    echo -e "${YELLOW}服务配置:${NC} ${DATA_DIR}/config/server.json"
    echo
    echo -e "${YELLOW}⚠️ 请记得修改 ${DATA_DIR}/config/apps.json 中的企业微信配置！${NC}"
}

# 主流程
main() {
    get_deploy_config
    check_dependencies
    prepare_deployment

    if [ "$USE_COMPOSE" = true ]; then
        deploy_with_compose
    else
        deploy_with_docker
    fi

    create_management_scripts
    show_deployment_result
}

# 运行部署
main