# MathExamHub NAS 部署指南

本文档提供了在 NAS（群晖、威联通等）上部署 MathExamHub 的详细步骤。

## 部署方式概览

### 方式 1: Docker Compose 部署（推荐）✅

**优点**：
- 环境隔离，易于管理和维护
- 一键部署，配置简单
- 支持自动重启
- 数据持久化

**适用于**：支持 Docker 的 NAS（群晖 DSM 7.0+、威联通等）

### 方式 2: 直接安装部署

**优点**：
- 性能略好（无容器开销）
- 更灵活的配置

**缺点**：
- 需要手动安装 Node.js 和 MongoDB
- 环境配置较复杂

---

## 方式 1: Docker Compose 部署（推荐）

### 前置要求

1. **NAS 已安装 Docker 和 Docker Compose**
   - 群晖：在套件中心安装 "Container Manager"（原 Docker）
   - 威联通：在 App Center 安装 "Container Station"

2. **SSH 访问权限**
   - 群晖：控制面板 → 终端机和 SNMP → 启用 SSH 服务
   - 威联通：控制台 → 网络与文件服务 → Telnet / SSH

### 部署步骤

#### 1. 连接到 NAS

```bash
# 替换为你的 NAS IP 地址和用户名
ssh your_username@your_nas_ip
```

#### 2. 创建项目目录

```bash
# 创建应用目录（根据你的 NAS 调整路径）
# 群晖示例
sudo mkdir -p /volume1/docker/mathexam
cd /volume1/docker/mathexam

# 威联通示例
# sudo mkdir -p /share/Container/mathexam
# cd /share/Container/mathexam
```

#### 3. 上传项目文件

有几种方式可以上传：

**方法 A：使用 Git（推荐）**

```bash
# 在 NAS 上克隆项目
git clone https://github.com/vanabel/MathExamHub.git
cd MathExamHub
```

**方法 B：使用 SCP/SFTP**

在本地电脑上执行：
```bash
# 压缩项目（排除不必要的文件）
cd /Users/vanabel/development/MathExam
tar --exclude='node_modules' --exclude='.git' --exclude='frontend/dist' -czf mathexam.tar.gz .

# 上传到 NAS
scp mathexam.tar.gz your_username@your_nas_ip:/volume1/docker/mathexam/

# 然后在 NAS 上解压
ssh your_username@your_nas_ip
cd /volume1/docker/mathexam
tar -xzf mathexam.tar.gz
rm mathexam.tar.gz
```

**方法 C：使用 NAS 文件管理器**
- 通过 Web 界面上传文件到共享文件夹
- 然后通过 SSH 移动到正确位置

#### 4. 配置环境变量

```bash
# 复制环境变量模板
cp .env.docker .env

# 编辑环境变量（使用 vi 或 nano）
vi .env
# 或
nano .env
```

填入你的配置：
```env
LLM_API_PROVIDER=openai
OPENAI_API_KEY=sk-your-actual-api-key-here
SESSION_SECRET=your-random-session-secret-here
```

#### 5. 修改前端 API 地址

编辑 `frontend/src/main.js`，将 API 地址改为：

```javascript
// 使用相对路径，通过 nginx 代理到后端
axios.defaults.baseURL = '/api'
```

或者在构建时使用环境变量（更灵活）。

#### 6. 启动服务

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 查看运行状态
docker-compose ps
```

#### 7. 验证部署

访问以下地址（替换为你的 NAS IP）：
- 前端界面：`http://your_nas_ip:8080`
- 后端 API：`http://your_nas_ip:3000`
- MongoDB：`your_nas_ip:27017`（仅内部访问）

#### 8. 配置开机自启（可选）

Docker Compose 的 `restart: unless-stopped` 已经配置了自动重启，但如果需要确保开机启动：

**群晖**：
1. 打开 Container Manager
2. 找到你的容器
3. 设置 → 启用自动重启

**威联通**：
Container Station 默认会自动启动设置了 restart policy 的容器。

### 常用管理命令

```bash
# 停止服务
docker-compose stop

# 启动服务
docker-compose start

# 重启服务
docker-compose restart

# 停止并删除容器
docker-compose down

# 停止并删除容器及数据卷（谨慎使用！）
docker-compose down -v

# 查看日志
docker-compose logs -f [service_name]

# 更新代码后重新构建
git pull
docker-compose up -d --build

# 进入容器 shell
docker-compose exec backend sh
docker-compose exec mongodb mongosh
```

---

## 方式 2: 直接安装部署

### 前置要求

1. **安装 Node.js**（版本 16+）
2. **安装 MongoDB**（版本 5+）

### 部署步骤

#### 1. 安装 Node.js

**群晖**：
```bash
# 使用 Entware 安装
opkg update
opkg install node node-npm
```

**威联通**：
在 App Center 安装 Node.js 或使用 Entware。

#### 2. 安装 MongoDB

根据你的 NAS 型号和系统，可能需要：
- 使用官方 Docker 镜像（推荐）
- 从源码编译
- 使用第三方包

#### 3. 部署应用

```bash
# 上传代码到 NAS
cd /path/to/mathexam

# 安装后端依赖
cd backend
npm install --production

# 安装前端依赖并构建
cd ../frontend
npm install
npm run build

# 配置环境变量
cd ../backend
cp .env.example .env
vi .env

# 启动后端（使用 PM2 管理进程）
npm install -g pm2
pm2 start server.js --name mathexam-backend
pm2 save
pm2 startup

# 配置 nginx 或使用 Node.js 静态服务器提供前端
```

---

## 高级配置

### 1. 反向代理配置（使用 NAS 的 Web Server）

如果你的 NAS 已经运行了 Web 服务器（如群晖的 Web Station），可以配置反向代理：

**群晖反向代理**：
1. 打开控制面板 → 登录门户 → 高级 → 反向代理服务器
2. 新增规则：
   - 来源：
     - 协议：HTTP
     - 主机名：mathexam.your-domain.com（或 IP）
     - 端口：80
   - 目的地：
     - 协议：HTTP
     - 主机名：localhost
     - 端口：8080

### 2. HTTPS 配置

**使用 Let's Encrypt**：
```bash
# 安装 certbot
# 群晖可以在控制面板中直接配置 Let's Encrypt
# 或者在 docker-compose.yml 中添加 nginx-proxy 和 letsencrypt-companion
```

### 3. 数据备份

**自动备份 MongoDB**：
```bash
# 创建备份脚本
cat > /volume1/docker/mathexam/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/volume1/docker/mathexam/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# 备份 MongoDB
docker-compose exec -T mongodb mongodump --out=/tmp/backup
docker cp mathexam-mongodb:/tmp/backup $BACKUP_DIR/mongodb_$TIMESTAMP

# 保留最近 7 天的备份
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +
EOF

chmod +x backup.sh

# 添加到 crontab（每天凌晨 2 点备份）
(crontab -l 2>/dev/null; echo "0 2 * * * /volume1/docker/mathexam/backup.sh") | crontab -
```

### 4. 性能优化

**MongoDB 索引优化**：
```bash
docker-compose exec mongodb mongosh mathexam
# 创建索引
db.questions.createIndex({ subject: 1, type: 1 })
db.questions.createIndex({ createdBy: 1 })
db.questions.createIndex({ "tags": 1 })
```

---

## 故障排查

### 问题 1: 容器无法启动

```bash
# 查看详细日志
docker-compose logs backend
docker-compose logs mongodb

# 检查端口占用
netstat -tulpn | grep -E '3000|8080|27017'
```

### 问题 2: MongoDB 连接失败

```bash
# 检查 MongoDB 是否运行
docker-compose ps mongodb

# 测试连接
docker-compose exec backend sh
ping mongodb
```

### 问题 3: 前端无法连接后端

检查 nginx 配置和 API 代理设置。

### 问题 4: 文件上传失败

确保 uploads 目录有正确的权限：
```bash
chmod -R 755 backend/uploads
```

---

## 安全建议

1. **修改默认端口**：避免使用常见端口
2. **配置防火墙**：只开放必要的端口
3. **使用 HTTPS**：生产环境必须启用
4. **定期备份**：自动化备份数据库和上传文件
5. **更新密钥**：定期更换 SESSION_SECRET 和 API 密钥
6. **限制访问**：使用 VPN 或 IP 白名单

---

## 监控和维护

### 日志监控

```bash
# 实时查看日志
docker-compose logs -f --tail=100

# 查看特定服务日志
docker-compose logs -f backend
```

### 资源监控

```bash
# 查看容器资源使用
docker stats
```

### 定期维护

```bash
# 清理未使用的 Docker 资源
docker system prune -a

# 更新镜像
docker-compose pull
docker-compose up -d
```

---

## 参考资料

- [Docker 官方文档](https://docs.docker.com/)
- [群晖 Docker 使用指南](https://kb.synology.com/zh-cn/DSM/help/Docker/docker_desc)
- [MongoDB Docker 镜像](https://hub.docker.com/_/mongo)

---

## 获取帮助

如遇问题，请在 GitHub 提交 Issue：
https://github.com/vanabel/MathExamHub/issues

