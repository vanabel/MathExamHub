# M6 列表性能与 API 约定

## 统一列表 API

`GET /api/questions/list` 与 `GET /api/questions/search`（兼容别名）支持相同查询参数：

| 参数 | 说明 |
|------|------|
| `limit` / `offset` | 分页（建议始终传入；单页最大 200） |
| `q` | 题干关键词（空格/逗号分词，AND 匹配） |
| `subject` | 科目 |
| `type` / `questionType` | 题型 |
| `difficulty` | 易 / 中 / 难 |
| `knowledgePointId` + `subtree=true` | 知识点子树 |
| `minScore` / `maxScore` | 分值区间 |
| `sortBy` | `createdAt`（默认）、`difficulty`、`totalScore` |
| `sortOrder` | `asc` / `desc`（默认 desc） |

响应（带 `limit` 时）：

```json
{ "questions": [], "total": 10000, "limit": 50, "offset": 0 }
```

## 1e4 题基准（CI）

脚本：`backend/npm run test:bench`

- 种子：每库 **10 000** 道填空题（`BENCH_TARGET_COUNT`）
- 测量：8 次「`limit=50` 列表 + count」的 p95
- CI 阈值：`BENCH_P95_MS=3000`（GitHub Actions `ubuntu-latest` + `mongo:7`）
- 典型结果：p95 常在 **数百 ms** 量级（视 runner 负载波动）

索引：`Question` 上 `{ bankId: 1, createdAt: -1 }`（见 `models/Question.js`）。

## 前端

题目列表页全部筛选与搜索走服务端分页，不再仅过滤当前页。
