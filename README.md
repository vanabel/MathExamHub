# MathExamHub

一个功能完整的数学试题库管理系统，支持试题的创建、编辑、搜索、导入导出等功能。

An application for managing and generating math exam questions, with **Node + Express + MongoDB backend**, **Vue 3 SPA frontend**, and a minimal **Electron shell**.

---

## 📚 文档导航

- [功能概览](#功能概览-features)
- [快速开始](#快速开始)
- [部署指南](#部署方式-deployment)
  - [PM2 部署](./docs/DEPLOYMENT_PM2.md) - 推荐用于 NAS 和个人使用
  - [Docker 部署](./docs/DEPLOYMENT.md) - 推荐用于生产环境
  - [群晖 NAS 部署](./docs/SYNOLOGY_DEPLOYMENT.md) - 群晖专用快速指南
  - [部署检查清单](./docs/DEPLOYMENT_CHECKLIST.md) - 完整的部署检查项
- [LaTeX 导入导出](./docs/LaTeX_IMPORT_EXPORT.md) - LaTeX 文件导入导出详细说明
- [本地开发](#本地开发运行-local-development)
- [技术栈](#技术栈-tech-stack)

---

## 功能概览 (Features)

### 📝 试题管理 (Question Management)

- **创建试题**：支持多种题型
  - 判断题、单选题、多选题
  - 填空题、计算题、解答题、证明题、作图题
- **科目管理**：支持多个数学科目
  - 微分几何、解析几何、高等几何、线性代数 II 等
- **试题属性**：完整的元数据管理
  - 分值、难度、出题人、创建时间等
- **编辑与删除**：灵活的试题管理
  - 支持按字段更新，不会覆盖未提供的字段
  - 批量删除功能
- **搜索功能**：强大的试题检索
  - 按科目、题型、关键词搜索
  - 支持模糊匹配和组合查询

### 🔍 智能搜索辅助 (AI-Powered Search)

- **关键词提取**：使用 LLM API 自动提取题干关键词
  - 支持 OpenAI、SiliconFlow、Ollama 三种提供商
  - 实时提取，无需手动输入关键词
- **相似题目推荐**：输入题干时自动显示相似题目
  - 避免重复出题
  - 参考已有题目进行改进

### 📄 LaTeX 导入导出 (LaTeX Import/Export)

- **导入 LaTeX 文件**：批量导入试卷
  - 支持 `mathexam` 宏包格式
  - 自动解析题目、选项、答案
  - 支持图片上传和引用
  - 预览功能，导入前可查看解析结果
- **导出 LaTeX 文件**：生成标准 LaTeX 试卷
  - 支持自定义试卷头部信息
  - 自动打包相关图片文件
  - 可直接使用 XeLaTeX 编译

### 🎨 数学公式渲染 (Math Rendering)

- **LaTeX 支持**：完整的数学公式渲染
  - 使用 MathJax 渲染题干和选项中的公式
  - 支持行内公式和块级公式
- **分值标记**：特殊的答案格式处理
  - 支持 `\score{分值}` 标记
  - 自动组合成带分值标记的展示形式

### 👥 用户管理 (User Management)

- **用户注册**：安全的用户注册系统
  - 用户名 + 密码 + 邮箱
  - 使用 `bcryptjs` 进行密码哈希存储
- **登录认证**：基于 Passport.js 的认证
  - Passport Local 策略
  - Session 会话管理
  - 密码重置功能
- **权限控制**：预留角色字段
  - 支持用户角色管理（如 Basic）
  - 为后续权限扩展预留接口

### 🖥️ Electron 桌面应用 (Electron Shell)

- **桌面壳**：提供桌面应用基础结构
  - 使用 Electron 创建主窗口
  - 加载前端页面
  - 可扩展菜单栏、窗口生命周期等功能

---

## 项目结构 (Project Structure)

根目录：

- `backend/`：Node.js + Express 后端
- `frontend/`：Vue 3 前端项目
- `electron/`：Electron 主进程和渲染进程入口
- `package.json` / `nodemon.json`：根层配置

### 后端结构 (`backend/`)

- `server.js`：Express 入口
  - 配置 CORS、Session、Passport、中间件等。
  - 挂载路由：
    - `/auth` → `routes/auth.js`
    - `/questions` → `routes/questions.js`
- `config/database.js`：
  - 使用 `mongoose` 连接本地 MongoDB：`mongodb://localhost/mathexam`
- `config/passport.js`：
  - 使用 `passport-local` 和 `bcryptjs` 配置本地登录策略，并实现序列化/反序列化。
- `models/User.js`：用户模型
- `models/Question.js`：通用试题模型，包含题型、科目、题干、选项、答案、分值、难度等字段。
- `routes/auth.js`：
  - `POST /auth/register`：用户注册（包含密码哈希）。
  - `POST /auth/login`：Passport Local 登录。
  - `GET /auth/logout`：登出。
- `routes/questions.js`：
  - `POST /questions/create` - 创建试题
  - `GET /questions/:_id/get` - 获取单个试题
  - `PUT /questions/:id/edit` - 编辑试题（按字段更新）
  - `DELETE /questions/:id/delete` - 删除试题
  - `GET /questions/list` - 获取试题列表
  - `GET /questions/search` - 搜索试题
  - `GET /questions/duplicates` - 查找重复试题
  - `POST /questions/duplicates/cleanup` - 清理重复试题
  - `GET /questions/subjects` - 获取所有科目列表
  - `POST /questions/extractKeywords` - 提取关键词（调用 LLM API）
  - `POST /questions/import/latex` - 导入 LaTeX 文件
  - `POST /questions/import/latex/preview` - 预览 LaTeX 文件
  - `POST /questions/export/latex` - 导出 LaTeX 文件

> 提示：要使 `/questions/extractKeywords` 正常工作，需要在运行环境设置 `OPENAI_API_KEY` 环境变量。

### 前端结构 (`frontend/`)

- `src/main.js`：
  - 引入 `bootstrap` 样式。
  - 创建 Vue 应用，挂载 `router`。
  - 使用 `axios` 配置 `baseURL = http://localhost:3000` 与后端通信。
  - 使用 `app.use(VueMathjaxNext)` 注册 `vue-mathjax-next`。
- `src/App.vue`：
  - 简单的壳组件，包含 `<router-view>`。
- `src/router/index.js`：
  - 路由：
    - `/login` → 用户登录页面
    - `/register` → 用户注册页面
    - `/question-list` → 试题列表
    - `/question-add` → 新增试题
    - `/question-edit/:id` → 编辑试题
    - `/latex-import` → LaTeX 导入页面
    - `/latex-export` → LaTeX 导出页面
- `src/components/QuestionList.vue`：
  - 调用 `/questions/list` 获取试题列表并展示。
  - 题干、选项使用 MathJax 渲染。
- `src/components/QuestionAdd.vue`：
  - 新增试题表单。
  - 输入题干时自动联动 OpenAI 关键词提取和试题搜索。
  - 调用 `/questions/create` 提交表单。
- `src/components/QuestionEdit.vue`：
  - 根据 URL 参数 `id` 调用 `/questions/:id/get` 获取题干和答案。
  - 调用 `PUT /questions/:id/edit` 完成编辑提交，成功后跳转回试题列表。
- `src/components/UserRegister.vue`：
  - 注册表单，调用 `/auth/register`。
- `src/views/*.vue`：
  - 将上述组件封装为路由页面。

---

## 部署方式 (Deployment)

### 方案 A: PM2 部署（推荐用于 NAS 和个人使用）⭐

**适用于**：个人 NAS、轻量级部署、资源受限环境

**优势**：更简单、更轻量、性能更好、易于调试

```bash
# 1. 克隆项目
git clone https://github.com/vanabel/MathExamHub.git
cd MathExamHub

# 2. 配置环境变量
cp backend/.env.example backend/.env
vi backend/.env  # 填入你的配置

# 3. 一键部署
./deploy-pm2.sh
```

📖 详细文档：[PM2 部署指南](./docs/DEPLOYMENT_PM2.md)

---

### 方案 B: Docker 部署（推荐用于生产环境）

**适用于**：云服务器、多环境部署、需要完全隔离

**优势**：环境隔离、可移植性好、容器化管理

```bash
# 1. 克隆项目
git clone https://github.com/vanabel/MathExamHub.git
cd MathExamHub

# 2. 配置环境变量
cp .env.docker.example .env
vi .env  # 填入你的配置

# 3. 一键部署
./deploy.sh
```

📖 详细文档：
- [Docker 完整部署指南](./docs/DEPLOYMENT.md)
- [群晖 NAS Docker 部署](./docs/SYNOLOGY_DEPLOYMENT.md)
- [NAS 部署快速指南](./docs/NAS_DEPLOYMENT_SUMMARY.md)
- [部署检查清单](./docs/DEPLOYMENT_CHECKLIST.md)

---

## 本地开发运行 (Local Development)

### 1. 启动后端 (Backend)

确保已经安装 MongoDB 并在本地运行（默认 `mongodb://localhost:27017`）。

**如果 MongoDB 在 Docker 容器中运行：**

```bash
# 检查容器状态
docker ps | grep mongodb

# 如果容器未运行，启动容器
docker start <container_id>

# 进入容器并打开 MongoDB Shell
docker exec -it <container_id> mongosh

# 或在容器外执行命令
docker exec -it <container_id> mongosh mathexam --eval "db.stats()"
```

**如果 MongoDB 直接安装在系统上：**

```bash
# macOS (使用 Homebrew 安装的情况)
brew services start mongodb-community

# 或直接运行
mongod --config /opt/homebrew/etc/mongod.conf

# 检查 MongoDB 是否运行
pgrep -f mongod
```

> **提示**: 如果遇到 MongoDB 连接超时错误，请先确保 MongoDB 服务或容器正在运行。

```bash
cd backend

# 安装依赖（包含 bcryptjs）
npm install

# 开发模式（依赖 nodemon）
npm run dev
```

#### 检查 MongoDB 数据库

**方法 1: 使用数据库检查脚本（推荐）**

```bash
# 检查数据库状态和统计信息
node backend/scripts/check-database.js
```

这个脚本会显示：
- 数据库连接状态
- 集合列表和文档数量
- 试题统计信息（科目、题型等）
- 用户统计信息
- 服务器信息

**方法 2: 使用 MongoDB Shell（如果 MongoDB 在容器中）**

⚠️ **如果 MongoDB 启用了身份验证，需要先获取认证信息：**
```bash
# 查看连接字符串中的用户名和密码
grep MONGODB_URI backend/.env
```

**方法 A: 使用连接字符串直接认证（推荐）**
```bash
# 使用完整的连接字符串连接（包含认证信息）
sudo docker exec -it 8b9453be3c65 mongosh "mongodb://用户名:密码@localhost:27017/mathexam?authSource=admin"

# 示例（请替换为你的实际用户名和密码）
# ⚠️ 请从 backend/.env 文件获取实际的连接字符串，不要硬编码密码！
# 连接字符串格式: mongodb://用户名:密码@localhost:27017/mathexam?authSource=admin
sudo docker exec -it 8b9453be3c65 mongosh "mongodb://用户名:密码@localhost:27017/mathexam?authSource=admin"
```

**方法 B: 先连接后认证**
```bash
# 进入 MongoDB 容器并打开 mongosh
sudo docker exec -it 8b9453be3c65 mongosh

# 或使用旧版本的 mongo 命令（MongoDB < 6.0）
sudo docker exec -it 8b9453be3c65 mongo
```

进入后可以使用以下命令：
```javascript
// 先进行身份验证（切换到 admin 数据库）
use admin
db.auth("用户名", "密码")

// 然后切换到 mathexam 数据库
use mathexam

// 显示所有集合
show collections

// 查看试题数量
db.questions.countDocuments()

// 查看用户数量
db.users.countDocuments()

// 查看试题示例
db.questions.findOne()

// 查看用户示例（不显示密码）
db.users.findOne({}, {password: 0})

// 退出
exit
```

**方法 3: 在终端直接执行 MongoDB 命令**

⚠️ **如果启用了身份验证，需要在连接字符串中包含认证信息**

```bash
# 设置连接字符串变量（从 .env 文件获取）
MONGODB_URI="mongodb://用户名:密码@localhost:27017/mathexam?authSource=admin"

# 查看数据库统计
sudo docker exec -it 8b9453be3c65 mongosh "$MONGODB_URI" --eval "db.stats()"

# 查看所有集合
sudo docker exec -it 8b9453be3c65 mongosh "$MONGODB_URI" --eval "show collections"

# 查看试题数量
sudo docker exec -it 8b9453be3c65 mongosh "$MONGODB_URI" --eval "db.questions.countDocuments()"

# 查看用户数量
sudo docker exec -it 8b9453be3c65 mongosh "$MONGODB_URI" --eval "db.users.countDocuments()"

# 查看所有科目
sudo docker exec -it 8b9453be3c65 mongosh "$MONGODB_URI" --eval "db.questions.distinct('subject')"

# 查看所有题型
sudo docker exec -it 8b9453be3c65 mongosh "$MONGODB_URI" --eval "db.questions.distinct('type')"
```

**快速获取连接字符串：**
```bash
# 从环境变量文件读取
grep MONGODB_URI backend/.env
```

> 📖 **更多 Docker MongoDB 命令**: 查看 [MongoDB Docker 命令文档](./docs/MONGODB_DOCKER_COMMANDS.md)

#### 忘记密码？重置密码

**方法 1: 使用密码重置脚本（推荐）**

```bash
# 通过用户名重置
node backend/scripts/reset-password.js <username> <newPassword>

# 通过邮箱重置
node backend/scripts/reset-password.js --email <email> <newPassword>
```

**方法 2: 使用 API 端点**

```bash
# 重置密码（需要后端服务运行）
curl -X POST http://localhost:3000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"username": "your_username", "newPassword": "new_password"}'

# 或通过邮箱重置
curl -X POST http://localhost:3000/auth/reset-password-by-email \
  -H "Content-Type: application/json" \
  -d '{"email": "your_email@example.com", "newPassword": "new_password"}'
```

如需调用关键词提取接口，请在运行前配置 LLM API。支持三种 LLM API 提供商：

**配置方式：**

1. **使用环境变量（推荐）**
   - 在 `backend/config/llm.js` 中通过环境变量配置
   - 或直接设置环境变量

2. **直接修改配置文件**
   - 编辑 `backend/config/llm.js` 文件

**配置示例：**

**1. OpenAI (默认)**
```bash
export LLM_API_PROVIDER=openai
export OPENAI_API_KEY=你的API密钥
```

**2. SiliconFlow**
```bash
export LLM_API_PROVIDER=siliconflow
export SILICONFLOW_API_KEY=你的API密钥
export SILICONFLOW_MODEL=deepseek-ai/DeepSeek-V3  # 可选，默认为此值
```

**3. Ollama (本地)**
```bash
export LLM_API_PROVIDER=ollama
export OLLAMA_URL=http://localhost:11434  # 可选，默认为此值
export OLLAMA_MODEL=qwen3:8b  # 可选，默认为此值
```

**配置文件位置：**
- 配置文件：`backend/config/llm.js`
- 示例文件：`backend/config/llm.config.example.js`

注意：
- 使用 Ollama 前需要先启动 Ollama 服务并确保模型已下载
- 配置文件支持环境变量覆盖，优先使用环境变量

### 2. 启动前端 (Frontend)

```bash
cd frontend

npm install
npm run serve
```

默认会在 `http://localhost:8080` 启动开发服务器，并通过 `axios` 调用 `http://localhost:3000` 的后端接口。

### 3. 启动 Electron（可选，初步集成） (Electron, optional)

当前 Electron 仅简单加载前端静态页面，你可以在根目录新增一个脚本，例如：

```json
"scripts": {
  "electron": "cd electron && electron ."
}
```

然后执行：

```bash
npm run electron
```

> 更完善的方案是将前端构建产物（`frontend/dist`）作为 Electron 的加载入口，并在 Electron 启动时确保后端服务已经运行，这部分目前尚未实现。

---

## 📖 更多文档

- [LaTeX 导入导出详细说明](./docs/LaTeX_IMPORT_EXPORT.md) - 包含图片上传、命名规则等
- [PM2 部署完整指南](./docs/DEPLOYMENT_PM2.md) - 适合 NAS 和个人使用
- [Docker 部署完整指南](./docs/DEPLOYMENT.md) - 适合生产环境
- [群晖 NAS 快速部署](./docs/SYNOLOGY_DEPLOYMENT.md) - 群晖专用指南
- [部署检查清单](./docs/DEPLOYMENT_CHECKLIST.md) - 完整的部署检查项

## 🔧 已知限制和待办事项 (Known Limitations & TODO)

- [ ] Electron 集成前后端自动启动流程，目前仅作为简单壳加载前端页面
- [ ] 部分 UI/导航可以进一步美化和增强
- [ ] 用户权限管理功能可以进一步扩展

---

## 技术栈 (Tech Stack)

- **后端 (Backend)**
  - Node.js, Express
  - MongoDB, Mongoose
  - express-session, passport, passport-local
  - bcryptjs
  - axios（用于调用 OpenAI API）

- **前端 (Frontend)**
  - Vue 3
  - Vue Router
  - axios
  - bootstrap
  - vue-mathjax-next

- **桌面端 (Desktop)**
  - Electron
