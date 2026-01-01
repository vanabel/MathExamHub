# NAS 部署快速指南

## 📦 已准备好的部署文件

✅ **Docker 配置**
- `Dockerfile.backend` - 后端容器配置
- `Dockerfile.frontend` - 前端容器配置  
- `docker-compose.yml` - 容器编排配置
- `.dockerignore` - Docker 构建忽略文件
- `nginx.conf` - Nginx 反向代理配置

✅ **环境配置**
- `.env.docker.example` - 环境变量模板
- `frontend/.env.development` - 前端开发环境配置
- `frontend/.env.production` - 前端生产环境配置

✅ **部署脚本**
- `deploy.sh` - 一键部署脚本

✅ **文档**
- `DEPLOYMENT.md` - 完整部署指南（支持各种 NAS 和服务器）
- `SYNOLOGY_DEPLOYMENT.md` - 群晖 NAS 专用快速指南

---

## 🚀 三种部署方式

### 方式 1: SSH 命令行部署（推荐）⭐

适用于所有支持 Docker 的 NAS。

```bash
# 1. SSH 连接到 NAS
ssh admin@你的NAS_IP

# 2. 克隆项目
cd /volume1/docker  # 群晖路径，其他 NAS 请调整
git clone https://github.com/vanabel/MathExamHub.git
cd MathExamHub

# 3. 配置环境变量
cp .env.docker.example .env
vi .env  # 填入你的 API 密钥

# 4. 一键部署
./deploy.sh
```

完成！访问 `http://你的NAS_IP:8080`

---

### 方式 2: 使用 NAS Web 界面部署

#### 群晖 Container Manager

1. **上传文件**
   - 打开 File Station
   - 在 `docker` 文件夹创建 `MathExamHub` 目录
   - 上传所有项目文件

2. **创建项目**
   - 打开 Container Manager → 项目
   - 点击"新增"
   - 项目名称: `mathexam`
   - 路径: `/docker/MathExamHub`
   - 选择 `docker-compose.yml`
   - 启动

3. **访问应用**
   - 前端: `http://你的NAS_IP:8080`

#### 威联通 Container Station

流程类似，在 Container Station 中导入 `docker-compose.yml` 文件。

---

### 方式 3: 云服务器部署

适用于阿里云、腾讯云、AWS 等。

```bash
# 1. 连接服务器
ssh root@你的服务器IP

# 2. 安装 Docker（如未安装）
curl -fsSL https://get.docker.com | sh
systemctl start docker
systemctl enable docker

# 3. 部署应用
git clone https://github.com/vanabel/MathExamHub.git
cd MathExamHub
cp .env.docker.example .env
vi .env
./deploy.sh
```

---

## ⚙️ 环境变量配置

编辑 `.env` 文件：

```env
# 选择 LLM 提供商
LLM_API_PROVIDER=openai          # 可选: openai, siliconflow, ollama

# OpenAI 配置
OPENAI_API_KEY=sk-your-key-here

# 或使用 SiliconFlow
# LLM_API_PROVIDER=siliconflow
# SILICONFLOW_API_KEY=your-key-here
# SILICONFLOW_MODEL=deepseek-ai/DeepSeek-V3

# 或使用本地 Ollama
# LLM_API_PROVIDER=ollama
# OLLAMA_URL=http://host.docker.internal:11434
# OLLAMA_MODEL=qwen3:8b

# Session 密钥（必填，使用随机字符串）
SESSION_SECRET=your-random-secret-here
```

---

## 🔧 常用管理命令

```bash
cd /volume1/docker/MathExamHub  # 进入项目目录

# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose stop

# 启动服务  
docker-compose start

# 重启服务
docker-compose restart

# 更新代码
git pull
docker-compose up -d --build

# 完全卸载（警告：会删除数据！）
docker-compose down -v
```

---

## 🛡️ 安全建议

1. **修改默认端口**
   编辑 `docker-compose.yml`，将 `8080:80` 改为其他端口

2. **配置防火墙**
   只开放必要的端口

3. **使用 HTTPS**
   配置反向代理和 SSL 证书

4. **定期备份**
   设置自动备份数据库和上传文件

5. **更新密钥**
   定期更换 API 密钥和 SESSION_SECRET

---

## 📊 端口说明

| 服务 | 容器端口 | 映射端口 | 说明 |
|------|---------|---------|------|
| 前端 | 80 | 8080 | Web 界面 |
| 后端 | 3000 | 3000 | API 服务 |
| MongoDB | 27017 | 27017 | 数据库（仅内部） |

如果端口冲突，可以在 `docker-compose.yml` 中修改映射端口。

---

## 🔍 故障排查

### 问题 1: 容器无法启动

```bash
# 查看详细日志
docker-compose logs backend
docker-compose logs mongodb
```

### 问题 2: 端口被占用

```bash
# 查看端口占用
netstat -tulpn | grep 8080

# 修改 docker-compose.yml 中的端口映射
```

### 问题 3: MongoDB 连接失败

```bash
# 确保 MongoDB 容器运行中
docker-compose ps

# 重启 MongoDB
docker-compose restart mongodb
```

### 问题 4: 前端无法访问后端

检查 nginx 配置和网络连接。

---

## 📚 详细文档

- **完整部署指南**: [DEPLOYMENT.md](./DEPLOYMENT.md)
  - Docker Compose 详解
  - 直接安装部署
  - 高级配置
  - 性能优化
  - 监控和维护

- **群晖快速部署**: [SYNOLOGY_DEPLOYMENT.md](./SYNOLOGY_DEPLOYMENT.md)
  - 群晖专用配置
  - Container Manager 使用
  - 反向代理设置
  - HTTPS 配置
  - 自动备份

---

## 💡 最佳实践

### 生产环境部署

1. **使用反向代理**
   - 配置 Nginx 或 NAS 内置反向代理
   - 启用 HTTPS
   - 隐藏后端端口

2. **数据持久化**
   - 定期备份 MongoDB 数据
   - 备份上传文件目录
   - 使用 NAS 的快照功能

3. **资源监控**
   - 监控容器 CPU/内存使用
   - 设置日志轮转
   - 定期清理旧日志

4. **安全加固**
   - 修改默认端口
   - 配置防火墙规则
   - 使用强密码
   - 定期更新依赖

---

## 🆘 获取帮助

- GitHub Issues: https://github.com/vanabel/MathExamHub/issues
- 完整文档: https://github.com/vanabel/MathExamHub

---

## 📝 下一步

部署完成后，你可以：

1. 访问 `http://你的NAS_IP:8080` 使用应用
2. 创建用户账号
3. 开始添加试题
4. 配置反向代理和域名（可选）
5. 设置自动备份
6. 邀请其他用户使用

享受使用 MathExamHub！🎉
