#!/bin/bash

set -e

echo "🚀 开始部署 MathExamHub (PM2 模式)..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装，请先安装 Node.js${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js 已安装: $(node --version)${NC}"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm 未安装${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm 已安装: $(npm --version)${NC}"

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📦 PM2 未安装，正在安装...${NC}"
    npm install -g pm2
fi
echo -e "${GREEN}✓ PM2 已安装: $(pm2 --version)${NC}"

# 检查 MongoDB
if ! pgrep -x mongod > /dev/null && ! docker ps | grep -q mongodb; then
    echo -e "${YELLOW}⚠️  MongoDB 未运行${NC}"
    echo -e "${YELLOW}请选择以下方式之一启动 MongoDB:${NC}"
    echo "  1. 系统服务: brew services start mongodb-community"
    echo "  2. Docker: docker run -d --name mongodb -p 27017:27017 mongo:7"
    echo ""
    read -p "是否继续部署？(y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✓ MongoDB 正在运行${NC}"
fi

# 检查环境变量文件
if [ ! -f backend/.env ]; then
    echo -e "${YELLOW}⚠️  未找到 backend/.env 文件${NC}"
    if [ -f backend/.env.example ]; then
        echo "📝 正在从 .env.example 创建 .env 文件..."
        cp backend/.env.example backend/.env
        echo -e "${YELLOW}请编辑 backend/.env 文件并填入你的配置${NC}"
        read -p "编辑完成后按回车继续..."
    else
        echo -e "${RED}❌ 未找到 .env.example 文件${NC}"
        exit 1
    fi
fi

# 安装后端依赖
echo ""
echo "📦 安装后端依赖..."
cd backend
npm install --production
cd ..
echo -e "${GREEN}✓ 后端依赖安装完成${NC}"

# 构建前端
echo ""
echo "🔨 构建前端..."
cd frontend
npm install
npm run build
cd ..
echo -e "${GREEN}✓ 前端构建完成${NC}"

# 创建日志目录
mkdir -p logs
echo -e "${GREEN}✓ 日志目录已创建${NC}"

# 停止旧的 PM2 进程（如果存在）
echo ""
echo "🛑 停止旧的进程..."
pm2 delete mathexam-backend 2>/dev/null || true

# 启动后端
echo ""
echo "🚀 启动后端服务..."
pm2 start ecosystem.config.js

# 显示状态
echo ""
pm2 status

# 保存 PM2 配置
pm2 save

echo ""
echo -e "${GREEN}✅ 部署完成！${NC}"
echo ""
echo "📝 服务信息："
echo "  - 后端 API: http://localhost:3000"
echo "  - 前端文件: ./frontend/dist"
echo ""
echo "💡 下一步："
echo "  1. 配置 Nginx 或使用 serve 启动前端:"
echo "     npm install -g serve"
echo "     pm2 start serve --name mathexam-frontend -- -s frontend/dist -l 8080"
echo ""
echo "  2. 访问应用: http://localhost:8080"
echo ""
echo "🔧 常用命令："
echo "  pm2 status           - 查看状态"
echo "  pm2 logs             - 查看日志"
echo "  pm2 monit            - 实时监控"
echo "  pm2 restart all      - 重启所有服务"
echo "  pm2 stop all         - 停止所有服务"
echo ""
echo "📖 完整文档: docs/DEPLOYMENT_PM2.md"
