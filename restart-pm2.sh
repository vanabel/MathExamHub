#!/bin/bash
# PM2 重启脚本
# 此脚本会删除现有的 PM2 进程并重新启动

echo "🔄 正在重启 PM2 服务..."

# 删除所有 mathexam 相关的 PM2 进程
pm2 delete mathexam-backend mathexam-frontend 2>/dev/null || true

# 等待一下确保进程完全停止
sleep 2

# 使用 ecosystem.config.js 重新启动
echo "🚀 启动服务..."
pm2 start ecosystem.config.js

# 保存 PM2 进程列表
pm2 save

# 显示状态
echo ""
echo "✅ PM2 服务已重启"
echo ""
pm2 status
