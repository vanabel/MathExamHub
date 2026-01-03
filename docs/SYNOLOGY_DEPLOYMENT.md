# 群晖 NAS 快速部署指南

## 前提条件

1. 群晖 DSM 7.0 或更高版本
2. 已安装 "Container Manager"（原 Docker 套件）
3. 启用 SSH 访问

## 快速部署步骤

### 方法 1: 使用 SSH 命令行（推荐）

#### 1. 启用 SSH

控制面板 → 终端机和 SNMP → 启用 SSH 服务

#### 2. 连接到群晖

```bash
ssh admin@你的群晖IP
```

#### 3. 克隆项目

```bash
# 进入 docker 目录
cd /volume1/docker

# 克隆项目
sudo git clone https://github.com/vanabel/MathExamHub.git
cd MathExamHub
```

#### 4. 配置环境变量

```bash
# 创建 .env 文件
sudo cp .env.docker.example .env
sudo vi .env  # 或使用 nano
```

修改为你的配置：
```env
LLM_API_PROVIDER=openai
OPENAI_API_KEY=sk-your-api-key-here
SESSION_SECRET=your-random-secret-here
```

#### 5. 一键部署

```bash
sudo ./deploy.sh
```

部署完成！访问 `http://你的群晖IP:8080` 即可使用。

---

### 方法 2: 使用群晖 File Station + Container Manager

#### 1. 上传文件

1. 打开 File Station
2. 在 `docker` 共享文件夹下创建 `MathExamHub` 文件夹
3. 上传所有项目文件（可以先在本地打包成 zip，然后上传解压）

#### 2. 创建 .env 文件

在 File Station 中：
1. 右键 → 新建 → 创建文本文件
2. 命名为 `.env`
3. 填入配置：

```env
LLM_API_PROVIDER=openai
OPENAI_API_KEY=your-api-key-here
SESSION_SECRET=your-random-secret-here
```

#### 3. 使用 Container Manager 部署

1. 打开 Container Manager
2. 进入 "项目" 标签
3. 点击 "新增"
4. 填写信息：
   - 项目名称: mathexam
   - 路径: `/docker/MathExamHub`
   - Compose 来源: 选择 "docker-compose.yml"
5. 点击下一步，然后启动

---

## 配置反向代理（可选，推荐）

如果你想通过域名访问（如 `mathexam.your-nas.com`），可以配置反向代理：

1. 打开控制面板 → 登录门户 → 高级 → 反向代理服务器
2. 点击 "新增"
3. 填写信息：

**来源**
- 协议: HTTP 或 HTTPS（如果配置了证书）
- 主机名: mathexam.your-nas.com（你的域名或留空）
- 端口: 80（或 443）

**目的地**
- 协议: HTTP
- 主机名: localhost
- 端口: 8080

4. 保存

现在可以通过 `http://你的群晖IP` 或 `http://mathexam.your-nas.com` 访问了！

---

## 配置 HTTPS（可选，推荐）

1. 打开控制面板 → 安全性 → 证书
2. 新增证书 → 从 Let's Encrypt 获取证书
3. 填写域名信息
4. 完成后在反向代理中选择使用该证书

---

## 端口修改（如果端口冲突）

如果默认端口被占用，可以修改 `docker-compose.yml`：

```yaml
services:
  frontend:
    ports:
      - "8888:80"  # 将 8080 改为 8888 或其他未占用端口
  
  backend:
    ports:
      - "3333:3000"  # 将 3000 改为 3333 或其他未占用端口
```

---

## 数据备份

### 自动备份脚本

SSH 连接到群晖后：

```bash
# 创建备份目录
sudo mkdir -p /volume1/docker/MathExamHub/backups

# 创建备份脚本
sudo tee /volume1/docker/MathExamHub/backup.sh > /dev/null << 'EOF'
#!/bin/bash
BACKUP_DIR="/volume1/docker/MathExamHub/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

cd /volume1/docker/MathExamHub

# 备份 MongoDB
docker-compose exec -T mongodb mongodump --archive=/tmp/backup_$TIMESTAMP.archive
docker cp mathexam-mongodb:/tmp/backup_$TIMESTAMP.archive $BACKUP_DIR/
docker-compose exec -T mongodb rm /tmp/backup_$TIMESTAMP.archive

# 备份上传文件
tar -czf $BACKUP_DIR/uploads_$TIMESTAMP.tar.gz backend/uploads/

# 删除 30 天前的备份
find $BACKUP_DIR -name "*.archive" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "备份完成: $TIMESTAMP"
EOF

sudo chmod +x /volume1/docker/MathExamHub/backup.sh
```

### 设置定时任务

1. 打开控制面板 → 任务计划
2. 新增 → 计划的任务 → 用户定义的脚本
3. 填写信息：
   - 任务名称: MathExamHub 自动备份
   - 用户账号: root
   - 计划: 每天凌晨 2:00
   - 任务设置 → 用户定义的脚本:
     ```bash
     /volume1/docker/MathExamHub/backup.sh
     ```
4. 保存

---

## 还原备份

```bash
cd /volume1/docker/MathExamHub

# 还原 MongoDB
docker cp backups/backup_20240101_020000.archive mathexam-mongodb:/tmp/restore.archive
docker-compose exec mongodb mongorestore --archive=/tmp/restore.archive

# 还原上传文件
tar -xzf backups/uploads_20240101_020000.tar.gz
```

---

## 性能优化

### 1. 增加 MongoDB 内存限制

编辑 `docker-compose.yml`：

```yaml
services:
  mongodb:
    mem_limit: 1g  # 根据你的 NAS 内存调整
    memswap_limit: 1g
```

### 2. 使用 SSD 存储缓存

如果你的群晖有 SSD 缓存：
1. 打开存储空间管理员 → SSD 缓存
2. 为 volume1 创建读写缓存
3. 重启容器

---

## 常见问题

### Q1: 端口被占用怎么办？

查看哪个进程占用了端口：
```bash
sudo netstat -tulpn | grep 8080
```

然后修改 `docker-compose.yml` 中的端口映射。

### Q2: 容器启动失败？

查看日志：
```bash
cd /volume1/docker/MathExamHub
sudo docker-compose logs
```

### Q3: 如何更新到最新版本？

```bash
cd /volume1/docker/MathExamHub
sudo git pull
sudo docker-compose down
sudo docker-compose up -d --build
```

### Q4: 如何访问 MongoDB？

使用 MongoDB Compass 或命令行：
```bash
# 进入 MongoDB 容器
sudo docker-compose exec mongodb mongosh

# 或从外部连接（如果开放了端口）
mongosh mongodb://你的群晖IP:27017/mathexam
```

### Q5: 如何重置数据库？

```bash
cd /volume1/docker/MathExamHub
sudo docker-compose down -v  # 警告：这会删除所有数据！
sudo docker-compose up -d
```

---

## 监控和维护

### 查看容器状态

在 Container Manager 中可以直观地看到：
- CPU 使用率
- 内存使用率
- 网络流量
- 容器日志

### 命令行监控

```bash
# 查看资源使用
sudo docker stats

# 查看日志
cd /volume1/docker/MathExamHub
sudo docker-compose logs -f
```

---

## 卸载

```bash
cd /volume1/docker/MathExamHub
sudo docker-compose down -v  # 删除容器和数据卷
cd ..
sudo rm -rf MathExamHub  # 删除项目文件
```

---

## 技术支持

如遇问题，请访问：
- GitHub Issues: https://github.com/vanabel/MathExamHub/issues
- 项目文档: https://github.com/vanabel/MathExamHub

---

## 安全提示

1. **修改默认端口**：避免使用 8080、3000 等常见端口
2. **配置防火墙**：控制面板 → 安全性 → 防火墙
3. **使用 HTTPS**：配置 SSL 证书
4. **定期备份**：设置自动备份任务
5. **更新密钥**：定期更换 API 密钥和 SESSION_SECRET
6. **限制访问**：使用群晖的防火墙或 VPN

