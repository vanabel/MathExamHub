# M2 数据库迁移说明

## 变更摘要

- `Question.difficulty` 统一为 **`易` | `中` | `难`**
- 新增字段：`knowledgePointIds`、`contentHash`、`status`、`source`、`usageCount`、`originalLaTeX`
- 新集合 **`KnowledgePoint`**（章节/知识点树）
- 新索引见 `backend/models/Question.js` 与 `KnowledgePoint.js`

## 运行迁移

```bash
cd backend
cp .env.example .env   # 若尚未配置
node scripts/migrate-m2-schema.js --dry-run
node scripts/migrate-m2-schema.js
```

## 难度映射

| 旧值 | 新值 |
|------|------|
| 简单、易 | 易 |
| 中等、中 | 中 |
| 较难、困难、难 | 难 |
| 空 / 未知 | 中 |

## contentHash

- 由 `originalLaTeX` 或 `questionText` 归一化后 SHA-256 生成。
- 迁移时若发生碰撞，会自动追加 `-<id后缀>` 以保证唯一索引可创建。

## 回滚

M2 未删除字段；回滚需从备份恢复 MongoDB。建议在迁移前 `mongodump`。
