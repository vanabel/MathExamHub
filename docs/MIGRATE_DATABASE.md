# 数据库迁移指南

本文档说明如何将数据从一个数据库迁移到另一个数据库。

## 迁移 questions 集合

### 方法 1: 使用 Node.js 脚本（推荐）

```bash
# 运行迁移脚本
node backend/scripts/migrate-questions.js
```

这个脚本会：
- 从 `mathcuz` 数据库读取 `questions` 集合
- 检查重复数据（基于 `_id`）
- 将新数据插入到 `mathexam` 数据库
- 显示迁移统计信息

**配置说明：**
- 源数据库连接：通过环境变量 `MONGODB_URI_SOURCE` 设置（**必须设置，不允许硬编码密码**）
- 目标数据库连接：从 `backend/.env` 文件中的 `MONGODB_URI` 读取（**必须设置，不允许硬编码密码**）

⚠️ **安全提示**：所有数据库连接字符串都必须从环境变量或 `.env` 文件读取，不允许在代码或文档中硬编码密码！

### 方法 2: 使用 MongoDB 工具（Docker 环境）

如果 MongoDB 运行在 Docker 容器中（容器 ID: 8b9453be3c65）：

```bash
# ⚠️ 安全提示：请从环境变量或配置文件中获取连接字符串，不要硬编码密码！

# 1. 导出源数据库的 questions 集合
# 连接字符串格式: mongodb://用户名:密码@localhost:27017/数据库名?authSource=admin
sudo docker exec 8b9453be3c65 mongodump \
  --uri="mongodb://用户名:密码@localhost:27017/mathcuz?authSource=admin" \
  --collection=questions \
  --archive=/tmp/questions_backup.archive

# 2. 将备份文件复制到本地
sudo docker cp 8b9453be3c65:/tmp/questions_backup.archive ./questions_backup.archive

# 3. 导入到目标数据库
sudo docker cp ./questions_backup.archive 8b9453be3c65:/tmp/questions_backup.archive
sudo docker exec 8b9453be3c65 mongorestore \
  --uri="mongodb://用户名:密码@localhost:27017/mathexam?authSource=admin" \
  --archive=/tmp/questions_backup.archive \
  --nsFrom="mathcuz.questions" \
  --nsTo="mathexam.questions"
```

### 方法 3: 使用 MongoDB Shell（交互式）

```bash
# 进入 MongoDB Shell
# ⚠️ 请替换为你的实际用户名和密码
sudo docker exec -it 8b9453be3c65 mongosh "mongodb://用户名:密码@localhost:27017/admin?authSource=admin"

# 在 Shell 中执行
use mathcuz
var questions = db.questions.find({}).toArray()

use mathexam
db.questions.insertMany(questions, { ordered: false })
```

### 方法 4: 使用 mongoexport 和 mongoimport

```bash
# ⚠️ 安全提示：请从环境变量或配置文件中获取连接字符串，不要硬编码密码！

# 1. 导出为 JSON
# 连接字符串格式: mongodb://用户名:密码@localhost:27017/数据库名?authSource=admin
sudo docker exec 8b9453be3c65 mongoexport \
  --uri="mongodb://用户名:密码@localhost:27017/mathcuz?authSource=admin" \
  --collection=questions \
  --out=/tmp/questions.json

# 2. 复制文件
sudo docker cp 8b9453be3c65:/tmp/questions.json ./questions.json

# 3. 导入到目标数据库
sudo docker cp ./questions.json 8b9453be3c65:/tmp/questions.json
sudo docker exec 8b9453be3c65 mongoimport \
  --uri="mongodb://用户名:密码@localhost:27017/mathexam?authSource=admin" \
  --collection=questions \
  --file=/tmp/questions.json \
  --jsonArray
```

## 迁移 users 集合

如果需要迁移用户数据，可以使用类似的方法：

```bash
# 修改脚本中的集合名称，或使用 MongoDB 工具
node backend/scripts/migrate-questions.js  # 修改集合名称为 users
```

## 注意事项

1. **备份数据**：在迁移前，建议先备份目标数据库
   ```bash
   # ⚠️ 请从 backend/.env 文件获取连接字符串
   # 连接字符串格式: mongodb://用户名:密码@localhost:27017/数据库名?authSource=admin
   sudo docker exec 8b9453be3c65 mongodump \
     --uri="mongodb://用户名:密码@localhost:27017/mathexam?authSource=admin" \
     --archive=/tmp/mathexam_backup_$(date +%Y%m%d_%H%M%S).archive
   ```

2. **重复数据处理**：
   - Node.js 脚本会自动跳过已存在的文档（基于 `_id`）
   - 使用 MongoDB 工具时，可能需要手动处理重复数据

3. **索引**：迁移后可能需要重建索引
   ```bash
   # 在 MongoDB Shell 中
   use mathexam
   db.questions.createIndex({ subject: 1 })
   db.questions.createIndex({ type: 1 })
   db.questions.createIndex({ keywords: 1 })
   ```

4. **验证迁移**：迁移后检查数据完整性
   ```bash
   node backend/scripts/check-database.js
   ```

## 完整迁移所有集合

如果需要迁移整个数据库：

```bash
# ⚠️ 安全提示：请从环境变量或配置文件中获取连接字符串，不要硬编码密码！

# 导出整个数据库
# 连接字符串格式: mongodb://用户名:密码@localhost:27017/数据库名?authSource=admin
sudo docker exec 8b9453be3c65 mongodump \
  --uri="mongodb://用户名:密码@localhost:27017/mathcuz?authSource=admin" \
  --archive=/tmp/mathcuz_full.archive

# 导入到目标数据库（会保持数据库名称）
sudo docker exec 8b9453be3c65 mongorestore \
  --uri="mongodb://用户名:密码@localhost:27017/mathexam?authSource=admin" \
  --archive=/tmp/mathcuz_full.archive \
  --nsFrom="mathcuz.*" \
  --nsTo="mathexam.*"
```
