#!/bin/bash

# WeComProxy Docker 构建脚本
# 支持多架构构建

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
IMAGE_NAME="wecom-proxy"
VERSION=${1:-"latest"}
BUILD_PLATFORMS="linux/amd64,linux/arm64"

echo -e "${BLUE}=== WeComProxy Docker 构建脚本 ===${NC}"
echo -e "${YELLOW}镜像名称: ${IMAGE_NAME}${NC}"
echo -e "${YELLOW}版本标签: ${VERSION}${NC}"
echo -e "${YELLOW}构建平台: ${BUILD_PLATFORMS}${NC}"
echo

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装或不在PATH中${NC}"
    exit 1
fi

# 检查是否在项目根目录
if [ ! -f "package.json" ] || [ ! -f "Dockerfile" ]; then
    echo -e "${RED}错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 创建数据目录（如果不存在）
if [ ! -d "data" ]; then
    echo -e "${YELLOW}创建数据目录...${NC}"
    mkdir -p data/config data/cache data/logs
fi

# 构建函数
build_image() {
    local build_type=$1

    echo -e "${BLUE}开始构建Docker镜像...${NC}"

    if [ "$build_type" == "multi-arch" ]; then
        # 多架构构建
        echo -e "${YELLOW}构建多架构镜像 (${BUILD_PLATFORMS})...${NC}"

        # 创建和使用buildx构建器
        docker buildx create --name wecom-builder --use 2>/dev/null || docker buildx use wecom-builder

        # 构建并推送多架构镜像
        docker buildx build \
            --platform ${BUILD_PLATFORMS} \
            --tag ${IMAGE_NAME}:${VERSION} \
            --tag ${IMAGE_NAME}:latest \
            --push \
            .
    else
        # 单架构构建（本地）
        echo -e "${YELLOW}构建本地镜像...${NC}"
        docker build \
            --tag ${IMAGE_NAME}:${VERSION} \
            --tag ${IMAGE_NAME}:latest \
            .
    fi
}

# 主菜单
echo "请选择构建类型:"
echo "1) 本地构建 (当前架构)"
echo "2) 多架构构建 (需要推送到镜像仓库)"
echo "3) 仅构建，不打标签"
read -p "请输入选项 (1-3): " choice

case $choice in
    1)
        build_image "local"
        ;;
    2)
        read -p "请输入Docker Hub用户名 (回车跳过): " dockerhub_user
        if [ -n "$dockerhub_user" ]; then
            IMAGE_NAME="${dockerhub_user}/${IMAGE_NAME}"
        fi
        build_image "multi-arch"
        ;;
    3)
        echo -e "${YELLOW}构建临时镜像...${NC}"
        docker build --tag temp-wecom-proxy .
        ;;
    *)
        echo -e "${RED}无效选项${NC}"
        exit 1
        ;;
esac

# 构建完成
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 构建成功!${NC}"
    echo
    echo -e "${BLUE}镜像信息:${NC}"
    docker images ${IMAGE_NAME} 2>/dev/null || docker images temp-wecom-proxy
    echo
    echo -e "${BLUE}快速启动命令:${NC}"
    echo -e "${YELLOW}docker run -d --name wecom-proxy -p 3000:3000 -v ./data:/app/data ${IMAGE_NAME}:${VERSION}${NC}"
    echo
    echo -e "${BLUE}使用docker-compose启动:${NC}"
    echo -e "${YELLOW}docker-compose up -d${NC}"
else
    echo -e "${RED}❌ 构建失败!${NC}"
    exit 1
fi