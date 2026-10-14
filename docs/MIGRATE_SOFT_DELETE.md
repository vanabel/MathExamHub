# 软删除 / 回收站（无破坏性迁移）

## 变更

- `Question.status` 新增枚举值 **`deleted`**
- 可选字段：`deletedAt`、`deletedBy`

## 现有数据

无需运行脚本：历史题目保持 `published` / `draft` / `archived`，行为不变。

## 行为说明

- 删除（含去重 cleanup）→ **软删除**，文档保留，`contentHash` 保留（导入仍视为重复）。
- **永久删除**仅针对已在回收站（`status=deleted`）的记录，物理移除后可释放 `contentHash` 唯一槽位。
