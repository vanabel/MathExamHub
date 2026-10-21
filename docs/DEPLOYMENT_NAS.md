# NAS / Docker 部署指南（MathExamHub）

> 与当前代码一致：`backend/server.js` 挂载 **`/api/*`**；Nginx 需保留 `/api` 前缀转发。

## 1. 前置条件

- Docker Compose v2、可用内存建议 ≥ 2GB（含 MongoDB）
- 域名或 NAS 内网 IP；**生产必须**设置强随机 `SESSION_SECRET`

## 2. 环境变量（`.env` 示例）

```env
NODE_ENV=production
MONGODB_URI=mongodb://mongodb:27017/mathexam
PORT=3000
SESSION_SECRET=请替换为至少32字节随机串

# 可选：LLM 关键词
LLM_API_PROVIDER=openai
OPENAI_API_KEY=
```

`docker-compose.yml` 已映射 `SESSION_SECRET`；**勿使用**默认 `your_session_secret_change_me`。

## 3. 依赖安装（NAS / 裸机 `git pull`）

自 **v1.0.0 预发布** 起，`node_modules` **不再纳入 Git**。拉代码后需在仓库内安装依赖：

```bash
git pull
npm ci --prefix backend
npm ci --prefix frontend
# 若跑 e2e：npm ci --prefix e2e
```

Docker 构建会在镜像内执行 `npm ci`，一般无需在 NAS 上单独装依赖；仅当在宿主机直接跑 Node 时才需要上述命令。

### 3.1 从旧版 checkout 迁移（一次性）

若本地/ NAS 曾在仓库内执行过 `npm install`，`backend/node_modules` 可能被 Git 跟踪并产生脏树或 `git pull` 冲突：

```bash
git fetch origin main
git pull
git rm -r --cached backend/node_modules node_modules 2>/dev/null || true
rm -rf backend/node_modules node_modules frontend/node_modules
npm ci --prefix backend
npm ci --prefix frontend
```

之后 `.gitignore` 会忽略 `node_modules`，日常升级只需 `git pull` + 上述 `npm ci`。

## 4. 启动

```bash
docker compose up -d --build
```

- 前端：`http://<host>:8080`（容器内 Nginx → 静态 Vue + `/api/` 反代）
- 后端直连（调试）：`http://<host>:3000/api/health`

## 5. Nginx 与 `/api` 前缀

仓库根目录 `nginx.conf`（frontend 镜像使用）：

```nginx
location /api/ {
    proxy_pass http://backend:3000/api/;
    ...
}
```

前端 axios 基址应为 **`/api`**（生产构建通过同源 `/api` 访问，勿去掉前缀）。

开发环境见 `docs/DEV_API.md`（Vite proxy → `http://localhost:3000/api`）。

## 6. 数据迁移顺序（已有库升级）

在**同一 `MONGODB_URI`** 上按顺序执行（先备份）：

1. `node backend/scripts/migrate-stem-html-images.js`（默认 dry-run）→ `node backend/scripts/migrate-stem-html-images.js --apply`（题干内嵌图片迁入 `images[]`）
2. `node backend/scripts/migrate-m2-schema.js`
3. `node backend/scripts/migrate-m3-banks.js`（dry-run）→ `node backend/scripts/migrate-m3-banks.js --apply`（为用户创建个人题库并绑定 orphan 题目；无 `createdBy` 时可加 `--fallback-username=vanabel`）
4. `node backend/scripts/migrate-bank-latex-metadata.js`（如有 LaTeX 元数据字段）

新装空库可跳过；注册用户时会自动创建个人题库。

## 6.1 Production upgrade checklist（v0.x → v1.0.0）

在维护窗口内执行，**先备份** MongoDB 与 `backend/uploads`：

| Step | Action |
|------|--------|
| 1 | `mongodump`（或 NAS 快照）保存当前库 |
| 2 | 拉取目标版本代码 / 镜像，`docker compose build --pull` |
| 3 | 设置 `.env`：`SESSION_SECRET`（≥32 字节随机）、`MONGODB_URI`、`NODE_ENV=production` |
| 4 | 运行 §5 迁移脚本（仅首次升级该环境时需要；已执行过的脚本可跳过） |
| 5 | `docker compose up -d`；确认 `curl -sf http://<host>:8080/api/health` |
| 6 | **Nginx**：确认 `location /api/` → `proxy_pass http://backend:3000/api/;`（保留 `/api` 前缀，见 §4） |
| 7 |  smoke：注册/登录 → 导入或 onboarding 示例 → 组卷向导导出 ZIP |
| 8 | 可选：本地 XeLaTeX 编译 ZIP（见 [TEXLIVE.md](./TEXLIVE.md)） |
| 9 | 回滚：恢复 dump + 上一版镜像 tag，勿混用新旧 schema 代码 |

发布说明：[RELEASE_v1.0.0.md](./RELEASE_v1.0.0.md)、[CHANGELOG.md](../CHANGELOG.md)。

## 7. 安全 checklist

- [ ] `SESSION_SECRET` 已更换
- [ ] 生产未设置 `ALLOW_TEST_ROUTES=1`（`create-test-data` 路由关闭）
- [ ] MongoDB 不对公网暴露（Compose 可去掉 `27017:27017` 端口映射）
- [ ] 平台管理员：在 MongoDB 将目标用户 `role` 设为 `admin`，访问 `/admin` 控制台

## 8. 持久化卷

- `mongodb_data`：题库数据
- `./backend/uploads`：LaTeX 导入图片/PDF

## 9. 健康检查

```bash
curl -s http://localhost:8080/api/health
# 期望 {"ok":true,...}
node backend/scripts/check-database.js
# 只读汇总：用户数、题库、题型/难度分布、M2/M3/图片迁移是否完成
```

运维 CLI：`node backend/scripts/reset-password.js <username>`（密码来自 `RESET_PASSWORD` 或 stdin，不回显）。

## 10. CI 对齐

GitHub Actions 运行 `npm test`、`npm run test:scenario`；M6 起增加 `npm run test:bench`（1e4 题分页基准），与生产 API 前缀约定相同。

## 11. v1 upgrade from feature/latex-import-export（PM2 / Cloudflare）

生产 NAS 若仍运行在旧分支 `feature/latex-import-export`（例如 `@102f998`，根目录 `ecosystem.config.js` + `deploy-pm2.sh`），升级到 **main** 后请改用仓库内 **`deploy/pm2/`** 脚本（main 不再在根目录保留 PM2 文件）。

### 11.1 一次性：`node_modules` 出 Git

与 §3.1 相同：若历史上在仓库里装过依赖，先 `git rm -r --cached backend/node_modules node_modules`（如有），删除目录后 `npm ci --prefix backend` 与 `npm ci --prefix frontend`。

### 11.2 `backend/.env`（无密钥写入脚本）

在 NAS 上维护 **`backend/.env`**（参考 `backend/.env.example`），至少包括：

| 变量 | PM2 典型值 |
|------|------------|
| `PORT` | `19897`（后端） |
| `MONGODB_URI` | 本地或容器 Mongo |
| `SESSION_SECRET` | 强随机串 |
| `CORS_ORIGINS` | `https://exam.vanabel.cn`（逗号分隔多域名） |

可选：`GIT_COMMIT=$(git rev-parse --short HEAD)` 供 `/api/health` 返回。

### 11.3 构建与 PM2

Synology 上 **Node / npm / pnpm 不在默认 PATH**，需先把 nvm 的 Node 20 放在最前（与手工部署相同；`deploy/pm2/*.sh` 也会自动尝试该目录，失败时再手动 export）：

```bash
export PATH="$HOME/.nvm/versions/node/v20.19.5/bin:$PATH"
node -v   # 期望 v20.19.5
```

PM2 若装在 `~/pm2-local` 且不在 `PATH`：

```bash
export PM2_BIN=~/pm2-local/node_modules/.bin/pm2
./deploy/pm2/deploy-pm2.sh
```

仓库 **backend/**、**frontend/** 均为 **`package-lock.json` + `npm ci`**；不要用 pnpm 改写 lockfile。

- 后端：`backend/server.js`，端口由 `backend/.env` 的 `PORT` 决定（默认生产 **19897**）。
- 前端：`deploy/pm2/start-frontend.sh` → `serve -s frontend/dist --listen=19896`。
- 重启：`./deploy/pm2/restart-pm2.sh`。

### 11.4 路由与探活

- **无 NAS 本机 Nginx**：公网 `https://exam.vanabel.cn` 经 **Cloudflare Tunnel** 把 `/api` 指到后端 `:19897`，静态页指到前端 `:19896`（或 tunnel 多 origin）。
- 探活：`curl -s http://127.0.0.1:19897/api/health` → `{"ok":true,"version":"…",…}`。

### 11.5 与 Docker 文档的差异

本文 §4–§5 的 Nginx/`docker compose` 流程适用于容器部署；PM2 裸机路径见本节，二者勿混用同一端口映射。

### 11.6 日常生产更新（无数据库迁移）

在 NAS checkout（如 `/volume1/web/nodejs/MathExamHub`）上，**已配置好 `backend/.env` 且 PM2 在跑** 时，拉代码 + 构建 + 重启：

```bash
export PATH="$HOME/.nvm/versions/node/v20.19.5/bin:$PATH"
pnpm run update
# 等价 fallback（不经过 pnpm 的 pre-run 检查）：npm run update
# 或直接：bash deploy/pm2/update.sh
```

根目录 **`.npmrc`** 含 `verify-deps-before-run=false`，避免 pnpm 10/11 在运行 `update` 前自动 `pnpm install` 根目录（含 electron）。根目录 **`package.json` 的 `update` 脚本**只是入口；**依赖安装仅在 backend/frontend 内用 `npm ci`**（不引入 `pnpm-lock.yaml`、不把仓库切到 pnpm）。

若曾在根目录误跑过 `pnpm install`，请删除 stray 的 **`pnpm-lock.yaml`** 与根 **`node_modules/`**（保留 `backend/node_modules`、`frontend/node_modules` 由 `npm ci` 管理即可）。`update.sh` 会在 shell 默认 Node 22 时仍优先选用 nvm 的 **Node 20** 并打印所用版本。

行为摘要：

- 拒绝有**已跟踪未提交修改**的工作区；**未跟踪**的 `backend/uploads/`、`logs/` 可忽略。
- `git fetch` + `git pull --ff-only`；打印 `old -> new` commit；若已是最新且未传 `--force` 则输出 `already up to date` 并退出。
- **不**运行任何 `migrate-*` 脚本，**不**修改 `backend/.env`。
- 仅当 `backend/` 或 `frontend/` 的 `package.json` / `package-lock.json` 相对旧 commit 有变更时才 **`npm ci`**。
- **`npm run build`** 构建前端；`pm2 restart mathexam-backend mathexam-frontend --update-env`（`GIT_COMMIT=<新 short sha>`），`pm2 save`。
- 脚本内 **`ensure_node20`**：若当前 `node` 不是 20，会 prepend `~/.nvm/versions/node/v20.19.5/bin`（可通过 `NAS_NVM_NODE20_DIR` 覆盖）。
- PM2 默认 `~/pm2-local/node_modules/.bin/pm2`。
- 轮询 `http://127.0.0.1:19897/api/health` 直到 `commit` 匹配；失败时打印 `git reset --hard <old sha>` + 重建 + 重启的回滚提示。

强制在同 commit 上重建/重启：`pnpm run update -- --force`（pnpm 需用 `--` 传递脚本参数）。
