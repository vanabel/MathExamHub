#!/bin/bash

# MathExamHub 部署脚本
# 用于快速部署到 NAS 或服务器

set -e

echo "🚀 开始部署 MathExamHub..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Docker 和 Docker Compose
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装，请先安装 Docker${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose 未安装，请先安装 Docker Compose${NC}"
    exit 1
fi

# 使用 docker compose 或 docker-compose
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# 检查 .env 文件
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  未找到 .env 文件${NC}"
    if [ -f .env.docker.example ]; then
        echo "📝 正在从 .env.docker.example 创建 .env 文件..."
        cp .env.docker.example .env
        echo -e "${YELLOW}⚠️  请编辑 .env 文件并填入你的配置，然后重新运行此脚本${NC}"
        exit 1
    else
        echo -e "${RED}❌ 未找到 .env.docker.example 文件${NC}"
        exit 1
    fi
fi

# 停止旧容器（如果存在）
echo "🛑 停止现有容器..."
$DOCKER_COMPOSE down || true

# 构建镜像
echo "🔨 构建 Docker 镜像..."
$DOCKER_COMPOSE build

# 启动服务
echo "🚀 启动服务..."
$DOCKER_COMPOSE up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 5

# 检查服务状态
echo "📊 检查服务状态..."
$DOCKER_COMPOSE ps

# 显示日志
echo ""
echo -e "${GREEN}✅ 部署完成！${NC}"
echo ""
echo "📝 服务地址："
echo "  - 前端: http://localhost:8080"
echo "  - 后端: http://localhost:3000"
echo ""
echo "💡 常用命令："
echo "  查看日志: $DOCKER_COMPOSE logs -f"
echo "  停止服务: $DOCKER_COMPOSE stop"
echo "  启动服务: $DOCKER_COMPOSE start"
echo "  重启服务: $DOCKER_COMPOSE restart"
echo "  删除服务: $DOCKER_COMPOSE down"
echo ""
echo "📖 更多信息请查看 DEPLOYMENT.md"
