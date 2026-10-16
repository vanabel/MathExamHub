# 本地 API 与联调说明（M0）

## URL 约定

- 所有 REST API 统一前缀：**`/api`**
- 认证：`/api/auth/*`
- 题目：`/api/questions/*`
- 知识点树：`/api/knowledge-points/*`（M2）
- 组卷蓝图：`/api/exam-blueprints/*`（M7，需登录 + `X-Bank-Id`）
- 组卷生成：`POST /api/exams/generate`（body：`blueprintId` 或内联 `blueprint`）
- 回收站：`GET /api/questions/recycle-bin`；`POST .../recycle-bin/:id/restore`；`DELETE .../recycle-bin/:id`（永久删，需 editor+）
- 健康检查：`GET /api/health`

前端通过 `VUE_APP_API_BASE_URL` 配置基址：

| 环境 | 典型值 |
|------|--------|
| 开发 | `http://localhost:3000/api`（见 `frontend/.env.development`） |
| 生产（Nginx） | `/api`（见 `frontend/.env.production`） |

## Nginx 反向代理

Docker 前端容器内 `nginx.conf` 必须使用：

```nginx
location /api/ {
    proxy_pass http://backend:3000/api/;
}
```

这样浏览器请求 `/api/questions/list` 会原样转发到后端的 `/api/questions/list`。

## 快速 Smoke

```bash
# 终端 1：MongoDB 已启动
cd backend && cp .env.example .env && npm run dev

# 终端 2
curl -s http://localhost:3000/api/health | jq .
curl -s 'http://localhost:3000/api/questions/list?limit=20&offset=0'

# 筛选示例（需登录 session + X-Bank-Id）
# curl -s -b cookies.txt -H 'X-Bank-Id: ...' \
#   'http://localhost:3000/api/questions/list?limit=50&q=勾股&type=填空题&difficulty=中'
```

列表参数详见 `docs/M6_PERFORMANCE.md`。

## 本地前后端一起跑

```bash
# 根目录
npm run start:dev
```

- 后端：`http://localhost:3000`（API：`/api/...`）
- 前端：`http://localhost:8080`（axios 基址指向 `3000/api`）
