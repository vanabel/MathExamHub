# MathExamHub 安全审计与整改状态

> 最后更新：2026-10-16（M11）

## 高危

| 项 | 原状 | 整改（M11） |
|----|------|-------------|
| 题目/导入/导出/组卷 API 无登录 | 任意访问 | 各业务路由已挂载 `requireAuth` + `bankContext`（M3+） |
| 匿名密码重置 | 若存在则无校验 | **无** `/auth/reset-password*` 路由；重置请使用 `backend/scripts/reset-password.js`（CLI） |

## 中危

| 项 | 原状 | 整改（M11） |
|----|------|-------------|
| `POST /questions/create-test-data` 暴露 | 任意登录用户可批量插入 | 仅当 `ALLOW_TEST_ROUTES=1` 且非 `production` 时可用，否则 404 |
| 去重 cleanup 权限过宽 | editor 可执行 | 改为 **`requireBankOwner`**（题库 owner） |
| 前端未处理 401 | 会话失效无跳转 | `main.js` axios 拦截器清除会话并跳转登录（M8 前已有） |

## 低危 / 持续项

- Session 密钥：生产环境必须设置 `SESSION_SECRET`。
- CORS：默认允许 localhost；生产应配合 Nginx 同源。
- 平台 `admin` 角色：已提供 `requirePlatformAdmin` 中间件，供后续管理端点使用。

## 验证

- 未登录 `POST /api/questions/create` → **401**（见 `backend/test/requireAuth.test.js`）。
- 生产或未显式开启时 `POST /api/questions/create-test-data` → **404**。
