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

1. `node backend/scripts/migrate-m2-schema.js`
2. `node backend/scripts/migrate-m3-banks.js`（为用户创建个人题库并绑定 orphan 题目）
3. `node backend/scripts/migrate-bank-latex-metadata.js`（如有 LaTeX 元数据字段）

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
```

## 10. CI 对齐

GitHub Actions 运行 `npm test`、`npm run test:scenario`；M6 起增加 `npm run test:bench`（1e4 题分页基准），与生产 API 前缀约定相同。
