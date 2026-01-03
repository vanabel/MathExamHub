# PM2 部署指南（推荐用于 NAS 和轻量级部署）

## 🎯 为什么选择 PM2？

相比 Docker 方案，PM2 部署有以下优势：

✅ **更简单** - 无需理解 Docker 概念  
✅ **更轻量** - 无容器开销，性能更好  
✅ **更直接** - 直接在系统上运行，易于调试  
✅ **更灵活** - 可以直接修改代码，立即生效  
✅ **资源占用少** - 适合 NAS 等资源受限环境  

**推荐场景**：
- 个人 NAS 使用
- 小团队内部部署
- 资源受限环境
- 需要频繁修改代码

---

## 📋 前置要求

### 1. Node.js（必需）

**macOS**:
```bash
brew install node
```

**群晖 NAS**:
```bash
# 安装 Entware
# 参考: https://github.com/Entware/Entware/wiki/Install-on-Synology-NAS

# 安装 Node.js
opkg update
opkg install node node-npm
```

**威联通 NAS**:
在 App Center 安装 Node.js 或使用 Entware。

**Ubuntu/Debian**:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. MongoDB（必需）

**macOS**:
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**群晖/威联通 NAS**:
推荐使用 Docker 安装 MongoDB：
```bash
docker run -d \
  --name mongodb \
  --restart=unless-stopped \
  -p 27017:27017 \
  -v /volume1/docker/mongodb/data:/data/db \
  mongo:7
```

**Ubuntu/Debian**:
```bash
# 安装 MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 3. PM2（必需）

```bash
npm install -g pm2
```

---

## 🚀 快速部署步骤

### Step 1: 克隆项目

```bash
# 选择一个合适的目录
cd /volume1/web  # 群晖示例，根据你的 NAS 调整
# 或
cd ~/apps  # 一般服务器

# 克隆项目
git clone https://github.com/vanabel/MathExamHub.git
cd MathExamHub
```

### Step 2: 安装后端依赖

```bash
cd backend
npm install --production
cd ..
```

### Step 3: 构建前端

```bash
cd frontend
npm install
npm run build
cd ..
```

### Step 4: 配置环境变量

```bash
# 创建后端环境变量文件
cp backend/.env.example backend/.env
vi backend/.env
```

填入配置：
```env
# LLM API 配置
LLM_API_PROVIDER=openai
OPENAI_API_KEY=your_api_key_here

# Session 密钥
SESSION_SECRET=your_random_secret_here

# MongoDB 连接（如果不是默认的 localhost）
# MONGODB_URI=mongodb://localhost:27017/mathexam
```

### Step 5: 创建日志目录

```bash
mkdir -p logs
```

### Step 6: 使用 PM2 启动后端

```bash
pm2 start ecosystem.config.js
```

### Step 7: 配置前端 Web 服务器

#### 选项 A: 使用 Nginx（推荐）

**安装 Nginx**:

macOS:
```bash
brew install nginx
```

群晖: 在套件中心安装 "Web Station"

Ubuntu:
```bash
sudo apt-get install nginx
```

**配置 Nginx**:

创建配置文件 `/etc/nginx/sites-available/mathexam`（或群晖的相应位置）:

```nginx
server {
    listen 8080;
    server_name _;
    
    # 前端静态文件
    root /volume1/web/MathExamHub/frontend/dist;
    index index.html;
    
    # 前端路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API 代理到后端
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

启用配置：
```bash
# Ubuntu
sudo ln -s /etc/nginx/sites-available/mathexam /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# macOS
sudo nginx -t
sudo nginx -s reload
```

#### 选项 B: 使用 serve（简单但功能有限）

```bash
npm install -g serve
pm2 start serve --name mathexam-frontend -- -s frontend/dist -l 8080
```

### Step 8: 保存 PM2 配置

```bash
pm2 save
pm2 startup
# 根据提示执行命令来设置开机自启
```

### Step 9: 验证部署

```bash
# 查看 PM2 进程状态
pm2 status

# 查看日志
pm2 logs mathexam-backend

# 访问应用
# 浏览器打开: http://你的服务器IP:8080
```

---

## 🔧 常用管理命令

### PM2 基本命令

```bash
# 查看所有进程
pm2 list

# 查看详细信息
pm2 show mathexam-backend

# 查看实时日志
pm2 logs mathexam-backend

# 查看实时监控
pm2 monit

# 重启应用
pm2 restart mathexam-backend

# 停止应用
pm2 stop mathexam-backend

# 删除应用
pm2 delete mathexam-backend

# 重载配置
pm2 reload mathexam-backend

# 清空日志
pm2 flush
```

### 更新代码

```bash
cd /volume1/web/MathExamHub

# 拉取最新代码
git pull

# 更新后端依赖（如果 package.json 有变化）
cd backend
npm install --production

# 重新构建前端
cd ../frontend
npm install
npm run build

# 重启后端
pm2 restart mathexam-backend

# 如果使用 serve，也重启前端
pm2 restart mathexam-frontend
```

### 数据库管理

```bash
# 连接到 MongoDB
mongosh

# 使用数据库
use mathexam

# 查看集合
show collections

# 查询用户
db.users.find()

# 查询题目
db.questions.find()

# 备份数据库
mongodump --db mathexam --out /backup/mongodb/$(date +%Y%m%d)

# 恢复数据库
mongorestore --db mathexam /backup/mongodb/20240101/mathexam
```

---

## 📊 性能优化

### 1. 启用集群模式（多核 CPU）

修改 `ecosystem.config.js`:

```javascript
{
  "apps": [{
    "name": "mathexam-backend",
    "script": "server.js",
    "cwd": "./backend",
    "instances": "max",  // 使用所有 CPU 核心
    "exec_mode": "cluster",  // 集群模式
    // ... 其他配置
  }]
}
```

然后重启：
```bash
pm2 reload ecosystem.config.js
```

### 2. 启用日志轮转

```bash
pm2 install pm2-logrotate

# 配置日志轮转
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### 3. MongoDB 索引优化

```bash
mongosh mathexam

# 创建索引
db.questions.createIndex({ subject: 1, type: 1 })
db.questions.createIndex({ createdBy: 1 })
db.questions.createIndex({ tags: 1 })
db.users.createIndex({ username: 1 }, { unique: true })
db.users.createIndex({ email: 1 }, { unique: true })
```

---

## 🔄 自动备份脚本

创建备份脚本 `backup.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/volume1/backup/mathexam"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
APP_DIR="/volume1/web/MathExamHub"

mkdir -p $BACKUP_DIR

# 备份 MongoDB
mongodump --db mathexam --archive=$BACKUP_DIR/mongodb_$TIMESTAMP.archive --gzip

# 备份上传文件
tar -czf $BACKUP_DIR/uploads_$TIMESTAMP.tar.gz -C $APP_DIR/backend uploads

# 备份环境变量（不含敏感信息的版本）
cp $APP_DIR/backend/.env $BACKUP_DIR/env_$TIMESTAMP.backup

# 删除 30 天前的备份
find $BACKUP_DIR -name "*.archive" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "备份完成: $TIMESTAMP"
```

设置定时任务：
```bash
chmod +x backup.sh

# 添加到 crontab（每天凌晨 2 点）
crontab -e
# 添加以下行：
0 2 * * * /volume1/web/MathExamHub/backup.sh
```

---

## 🔒 安全建议

### 1. 配置防火墙

```bash
# Ubuntu (ufw)
sudo ufw allow 8080/tcp
sudo ufw allow 3000/tcp  # 如果需要直接访问后端
sudo ufw enable

# 或使用 iptables
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
```

### 2. 使用环境变量

不要在代码中硬编码敏感信息，使用 `.env` 文件。

### 3. 定期更新

```bash
# 更新 Node.js 依赖
cd backend
npm audit fix

cd ../frontend
npm audit fix
```

### 4. 限制 MongoDB 访问

编辑 `/etc/mongod.conf`:
```yaml
net:
  bindIp: 127.0.0.1  # 只允许本地访问
```

---

## 🆚 PM2 vs Docker 对比

| 特性 | PM2 | Docker |
|------|-----|--------|
| 部署难度 | ⭐⭐ 简单 | ⭐⭐⭐ 中等 |
| 性能开销 | ⭐⭐⭐⭐⭐ 极低 | ⭐⭐⭐ 中等 |
| 资源占用 | ⭐⭐⭐⭐⭐ 极低 | ⭐⭐⭐ 中等 |
| 环境隔离 | ⭐⭐ 低 | ⭐⭐⭐⭐⭐ 完全隔离 |
| 可移植性 | ⭐⭐ 依赖系统 | ⭐⭐⭐⭐⭐ 跨平台 |
| 调试便利 | ⭐⭐⭐⭐⭐ 非常方便 | ⭐⭐⭐ 一般 |
| 更新速度 | ⭐⭐⭐⭐⭐ 快速 | ⭐⭐⭐ 需重建 |
| 适用场景 | 个人/小团队 | 生产/多环境 |

**建议**：
- **个人 NAS、小团队**: 使用 PM2 ✅
- **多人协作、多环境、云部署**: 使用 Docker
- **资源受限**: 使用 PM2
- **需要完全隔离**: 使用 Docker

---

## 🚨 故障排查

### 问题 1: PM2 进程启动失败

```bash
# 查看详细错误日志
pm2 logs mathexam-backend --lines 100

# 检查端口占用
netstat -tulpn | grep 3000

# 手动测试启动
cd backend
node server.js
```

### 问题 2: MongoDB 连接失败

```bash
# 检查 MongoDB 状态
sudo systemctl status mongod
# 或
ps aux | grep mongod

# 测试连接
mongosh --eval "db.adminCommand('ping')"
```

### 问题 3: 内存不足

```bash
# 查看内存使用
pm2 monit

# 限制内存使用（在 ecosystem.config.js 中）
{
  "max_memory_restart": "500M"
}
```

---

## 📖 完整部署脚本

创建 `deploy-pm2.sh`:

```bash
#!/bin/bash

set -e

echo "🚀 开始部署 MathExamHub (PM2 模式)..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装 PM2..."
    npm install -g pm2
fi

# 检查 MongoDB
if ! pgrep -x mongod > /dev/null; then
    echo "⚠️  MongoDB 未运行，请先启动 MongoDB"
    exit 1
fi

# 安装后端依赖
echo "📦 安装后端依赖..."
cd backend
npm install --production
cd ..

# 构建前端
echo "🔨 构建前端..."
cd frontend
npm install
npm run build
cd ..

# 创建日志目录
mkdir -p logs

# 启动后端
echo "🚀 启动后端服务..."
pm2 start ecosystem.config.js

# 保存 PM2 配置
pm2 save

echo ""
echo "✅ 部署完成！"
echo ""
echo "📝 后端服务: http://localhost:3000"
echo "📝 前端文件: ./frontend/dist"
echo ""
echo "💡 下一步："
echo "  1. 配置 Nginx 或使用 serve 启动前端"
echo "  2. 访问应用"
echo ""
echo "🔧 管理命令："
echo "  pm2 status          - 查看状态"
echo "  pm2 logs            - 查看日志"
echo "  pm2 restart all     - 重启服务"
```

---

## 🎉 总结

PM2 部署方案更适合：
- ✅ 个人使用或小团队
- ✅ NAS 等资源受限环境
- ✅ 需要简单直接的部署
- ✅ 需要频繁调试和修改

如果你的场景符合以上特点，**PM2 是更好的选择**！

需要帮助？查看 [GitHub Issues](https://github.com/vanabel/MathExamHub/issues)

