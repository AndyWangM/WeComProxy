#!/bin/bash

# WeComProxy Docker Compose 启动脚本

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== WeComProxy Docker Compose 启动 ===${NC}"
echo

# 检查Docker和Docker Compose
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装${NC}"
    exit 1
fi

if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}错误: Docker Compose 未安装${NC}"
    exit 1
fi

# 创建数据目录
create_data_dirs() {
    echo -e "${YELLOW}创建数据目录...${NC}"
    mkdir -p data/{config,cache,logs,config/backups}

    # 创建默认配置文件（如果不存在）
    if [ ! -f "data/config/apps.json" ]; then
        echo '{}' > data/config/apps.json
        echo -e "${GREEN}创建默认应用配置文件${NC}"
    fi

    if [ ! -f "data/config/server.json" ]; then
        cat > data/config/server.json << EOF
{
  "port": 3000,
  "host": "0.0.0.0",
  "base_path": "",
  "log_level": "info",
  "backup_retention_days": 30
}
EOF
        echo -e "${GREEN}创建默认服务器配置文件${NC}"
    fi
}

# 显示菜单
show_menu() {
    echo "请选择启动模式:"
    echo "1) 生产模式 (docker-compose.yml)"
    echo "2) 生产模式 - 完整配置 (docker-compose.prod.yml)"
    echo "3) 开发模式 (docker-compose.dev.yml)"
    echo "4) 停止所有服务"
    echo "5) 查看服务状态"
    echo "6) 查看服务日志"
    echo "0) 退出"
    echo
}

# 启动服务
start_service() {
    local compose_file=$1
    local mode_name=$2

    echo -e "${YELLOW}使用配置文件: ${compose_file}${NC}"

    create_data_dirs

    echo -e "${GREEN}启动 ${mode_name} 服务...${NC}"

    if docker compose version &> /dev/null; then
        docker compose -f "${compose_file}" up -d
    else
        docker-compose -f "${compose_file}" up -d
    fi

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 服务启动成功!${NC}"
        echo
        echo -e "${BLUE}=== 服务信息 ===${NC}"
        echo -e "${YELLOW}管理界面:${NC} http://localhost:3000/admin"
        echo -e "${YELLOW}API接口:${NC} http://localhost:3000/api/apps"
        echo -e "${YELLOW}健康检查:${NC} http://localhost:3000/api/stats"
        echo
        echo -e "${BLUE}=== 管理命令 ===${NC}"
        echo -e "${YELLOW}查看日志:${NC} docker logs -f wecom-proxy"
        echo -e "${YELLOW}停止服务:${NC} docker compose -f ${compose_file} down"
        echo -e "${YELLOW}重启服务:${NC} docker compose -f ${compose_file} restart"
    else
        echo -e "${RED}❌ 服务启动失败!${NC}"
        exit 1
    fi
}

# 停止服务
stop_services() {
    echo -e "${YELLOW}停止所有 WeComProxy 服务...${NC}"

    # 尝试停止所有可能的compose文件
    for compose_file in "docker-compose.yml" "docker-compose.prod.yml" "docker-compose.dev.yml"; do
        if [ -f "${compose_file}" ]; then
            echo "停止 ${compose_file}..."
            if docker compose version &> /dev/null; then
                docker compose -f "${compose_file}" down 2>/dev/null || true
            else
                docker-compose -f "${compose_file}" down 2>/dev/null || true
            fi
        fi
    done

    # 强制停止容器
    docker stop wecom-proxy wecom-proxy-dev 2>/dev/null || true
    docker rm wecom-proxy wecom-proxy-dev 2>/dev/null || true

    echo -e "${GREEN}✅ 服务已停止${NC}"
}

# 查看状态
show_status() {
    echo -e "${BLUE}=== WeComProxy 服务状态 ===${NC}"
    echo

    # 检查容器状态
    if docker ps | grep -E "wecom-proxy"; then
        echo -e "${GREEN}✅ 服务正在运行:${NC}"
        docker ps | grep -E "wecom-proxy" | while read line; do
            echo "  $line"
        done
        echo

        # 尝试获取健康状态
        echo -e "${BLUE}健康检查:${NC}"
        curl -s http://localhost:3000/api/stats | jq . 2>/dev/null || echo "无法连接到服务"
    else
        echo -e "${RED}❌ 服务未运行${NC}"
    fi
    echo
}

# 查看日志
show_logs() {
    echo -e "${BLUE}=== WeComProxy 服务日志 ===${NC}"
    echo "按 Ctrl+C 退出日志查看"
    echo

    if docker ps | grep -q wecom-proxy; then
        docker logs -f wecom-proxy 2>/dev/null || docker logs -f wecom-proxy-dev 2>/dev/null || echo "找不到运行中的容器"
    else
        echo -e "${RED}❌ 服务未运行${NC}"
    fi
}

# 主循环
main() {
    while true; do
        show_menu
        read -p "请输入选项 (0-6): " choice

        case $choice in
            1)
                start_service "docker-compose.yml" "标准生产模式"
                break
                ;;
            2)
                start_service "docker-compose.prod.yml" "完整生产模式"
                break
                ;;
            3)
                start_service "docker-compose.dev.yml" "开发模式"
                break
                ;;
            4)
                stop_services
                break
                ;;
            5)
                show_status
                echo
                ;;
            6)
                show_logs
                break
                ;;
            0)
                echo "退出"
                exit 0
                ;;
            *)
                echo -e "${RED}无效选项，请重新选择${NC}"
                echo
                ;;
        esac
    done
}

# 运行主函数
main