## MathExam

一个用于管理和出题的数学试题库应用，包含 **后端 API (Node + Express + MongoDB)**、**前端单页应用 (Vue 3 + Bootstrap + MathJax)**，并提供一个简单的 **Electron 桌面壳**。

An application for managing and generating math exam questions, with **Node + Express + MongoDB backend**, **Vue 3 SPA frontend**, and a minimal **Electron shell**.

---

### 功能概览 (Features)

- **试题管理 (Question Management)**
  - 创建数学试题（支持判断题、单选题、多选题、填空题、计算题、解答题、证明题、作图题）。
  - 支持题目科目（微分几何、解析几何、高等几何、线性代数 II 等）。
  - 设置每题分值、难度、出题人等信息。
  - 编辑试题（支持修改题干和答案，后端支持按字段更新）。
  - 删除试题。
  - 列出全部试题。
  - 按 **科目 + 题目类型 + 关键词** 搜索试题。

- **数学公式展示 (Math Rendering)**
  - 使用 `vue-mathjax-next` 在前端渲染题干和选项中的 LaTeX 数学公式。
  - 对答案字符串中形如 `\score{1}` 的标记做额外处理，组合成带分值标记的展示形式。

- **基础用户管理 (User Management)**
  - 用户注册（用户名 + 密码 + 邮箱），后端使用 `bcryptjs` 进行密码哈希存储。
  - 用户角色字段（如 Basic），可为后续权限控制预留。
  - 使用 Passport Local 策略实现用户名/密码登录（后端已配置策略和会话序列化）。

- **关键字搜索辅助（依赖 OpenAI） (Keyword Assist via OpenAI)**
  - 前端在输入题干时：
    - 调用后端 `/questions/extractKeywords`，由 OpenAI API 提取多个关键词。
    - 使用提取出的关键词调用 `/questions/search`，在输入过程中实时显示相似题目列表。
  - 便于避免重复出题，并可参考已有题目。

- **Electron 桌面壳（初步） (Electron Shell)**
  - 使用 Electron 创建主窗口，加载前端页面。
  - 提供桌面应用基础结构（菜单栏、窗口生命周期等可以继续扩展）。

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
  - `POST /questions/create-test-data`
  - `POST /questions/create`
  - `GET /questions/:_id/get`
  - `PUT /questions/:id/edit`（按提供字段更新试题，未提供的字段不会被覆盖为 `undefined`）
  - `DELETE /questions/:id/delete`
  - `GET /questions/list`
  - `GET /questions/search`
  - `POST /questions/extractKeywords`（调用 OpenAI API）。

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
    - `/register` → 用户注册页面
    - `/question-list` → 试题列表
    - `/question-add` → 新增试题
    - `/question-edit/:id` → 编辑试题
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

## 运行方式 (How to Run)

### 1. 启动后端 (Backend)

确保已经安装 MongoDB 并在本地运行（默认 `mongodb://localhost:27017`）。

**如果 MongoDB 未运行，请先启动：**

```bash
# macOS (使用 Homebrew 安装的情况)
brew services start mongodb-community

# 或直接运行
mongod --config /opt/homebrew/etc/mongod.conf

# 检查 MongoDB 是否运行
pgrep -f mongod
```

> **提示**: 如果遇到 MongoDB 连接超时错误，请先执行 `brew services start mongodb-community` 启动 MongoDB 服务。

```bash
cd backend

# 安装依赖（包含 bcryptjs）
npm install

# 开发模式（依赖 nodemon）
npm run dev
```

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

## 当前已知待办 / 不完整部分 (TODO)

- [ ] 补充前端登录页面和登录状态管理（目前只有注册接口和后端登录策略）。
- [ ] 在 `GET /questions/:_id/get` 中返回更多字段（分值、难度、题型、选项等），并在 `QuestionEdit.vue` 中绑定这些字段进行完整编辑。
- [ ] Electron 集成前后端自动启动流程，仅作为简单壳加载前端页面。
- [ ] 部分 UI/导航（如顶部菜单、路由跳转入口）可以进一步美化和增强。

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
