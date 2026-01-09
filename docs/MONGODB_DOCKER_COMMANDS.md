# MongoDB Docker 容器检查命令

本文档提供了通过 Docker 容器检查和操作 MongoDB 数据库的常用命令。

## 基本信息

- 容器 ID: `8b9453be3c65`
- 数据库名称: `mathexam`

## ⚠️ 重要：身份验证

如果你的 MongoDB 启用了身份验证，需要先进行认证才能执行操作。请查看 `backend/.env` 文件中的 `MONGODB_URI` 获取用户名和密码。

## 快速检查命令

### 1. 进入 MongoDB Shell 交互式界面

#### 方法 A: 使用连接字符串直接认证（推荐）

```bash
# 使用连接字符串直接连接（包含认证信息）
# 格式: mongodb://用户名:密码@localhost:27017/数据库名?authSource=admin
sudo docker exec -it 8b9453be3c65 mongosh "mongodb://用户名:密码@localhost:27017/mathexam?authSource=admin"

# ⚠️ 请从 backend/.env 文件获取实际的连接字符串，不要硬编码密码！
# 示例格式（请替换为你的实际用户名和密码）:
# sudo docker exec -it 8b9453be3c65 mongosh "mongodb://用户名:密码@localhost:27017/mathexam?authSource=admin"
```

#### 方法 B: 先连接后认证

```bash
# 进入容器并打开 MongoDB Shell
sudo docker exec -it 8b9453be3c65 mongosh

# 如果使用的是旧版本 MongoDB (< 6.0)，使用 mongo 命令
sudo docker exec -it 8b9453be3c65 mongo
```

进入后执行的常用命令：
```javascript
// 先进行身份验证（切换到 admin 数据库）
use admin
db.auth("用户名", "密码")

// 然后切换到 mathexam 数据库
use mathexam

// 显示所有集合
show collections

// 查看数据库统计信息
db.stats()

// 查看试题数量
db.questions.countDocuments()

// 查看用户数量
db.users.countDocuments()

// 查看一条试题示例
db.questions.findOne()

// 查看一条用户示例（不显示密码）
db.users.findOne({}, {password: 0})

// 查看所有科目
db.questions.distinct("subject")

// 查看所有题型
db.questions.distinct("type")

// 退出
exit
```

### 2. 执行单个命令（不进入交互式界面）

⚠️ **如果启用了身份验证，需要在连接字符串中包含认证信息**

```bash
# 查看数据库统计信息
sudo docker exec -it 8b9453be3c65 mongosh "mongodb://用户名:密码@localhost:27017/mathexam?authSource=admin" --eval "db.stats()"

# 显示所有集合
sudo docker exec -it 8b9453be3c65 mongosh "mongodb://用户名:密码@localhost:27017/mathexam?authSource=admin" --eval "show collections"

# 查看试题数量
sudo docker exec -it 8b9453be3c65 mongosh "mongodb://用户名:密码@localhost:27017/mathexam?authSource=admin" --eval "db.questions.countDocuments()"

# 查看用户数量
sudo docker exec -it 8b9453be3c65 mongosh "mongodb://用户名:密码@localhost:27017/mathexam?authSource=admin" --eval "db.users.countDocuments()"

# 查看所有科目
sudo docker exec -it 8b9453be3c65 mongosh "mongodb://用户名:密码@localhost:27017/mathexam?authSource=admin" --eval "db.questions.distinct('subject')"

# 查看所有题型
sudo docker exec -it 8b9453be3c65 mongosh "mongodb://用户名:密码@localhost:27017/mathexam?authSource=admin" --eval "db.questions.distinct('type')"

# 查看数据库大小
sudo docker exec -it 8b9453be3c65 mongosh "mongodb://用户名:密码@localhost:27017/mathexam?authSource=admin" --eval "db.stats().dataSize"

# 查看集合详情（包括索引）
sudo docker exec -it 8b9453be3c65 mongosh "mongodb://用户名:密码@localhost:27017/mathexam?authSource=admin" --eval "db.questions.getIndexes()"
```

**快速获取连接字符串的方法：**

```bash
# 从环境变量文件读取连接字符串（如果存在）
grep MONGODB_URI backend/.env

# ⚠️ 安全提示：不要将包含真实密码的连接字符串写入文档或代码！
# 连接字符串格式: mongodb://用户名:密码@localhost:27017/数据库名?authSource=admin
# 请从 backend/.env 文件中读取实际的连接字符串
```

**使用环境变量简化命令：**

```bash
# 设置环境变量
MONGODB_URI="mongodb://用户名:密码@localhost:27017/mathexam?authSource=admin"

# 然后使用
sudo docker exec -it 8b9453be3c65 mongosh "$MONGODB_URI" --eval "db.stats()"
```

### 3. 数据查询示例

⚠️ **所有命令都需要在连接字符串中包含认证信息**

```bash
# 设置连接字符串变量（替换为你的实际值）
MONGODB_URI="mongodb://用户名:密码@localhost:27017/mathexam?authSource=admin"

# 查看最近的 5 条试题
sudo docker exec -it 8b9453be3c65 mongosh "$MONGODB_URI" --eval "db.questions.find().limit(5).pretty()"

# 按科目统计试题数量
sudo docker exec -it 8b9453be3c65 mongosh "$MONGODB_URI" --eval "db.questions.aggregate([{$group: {_id: '$subject', count: {$sum: 1}}}])"

# 按题型统计试题数量
sudo docker exec -it 8b9453be3c65 mongosh "$MONGODB_URI" --eval "db.questions.aggregate([{$group: {_id: '$type', count: {$sum: 1}}}])"

# 查找特定科目的试题
sudo docker exec -it 8b9453be3c65 mongosh "$MONGODB_URI" --eval "db.questions.find({subject: '微分几何'}).count()"

# 查看所有用户名（不显示密码）
sudo docker exec -it 8b9453be3c65 mongosh "$MONGODB_URI" --eval "db.users.find({}, {username: 1, email: 1, _id: 0}).pretty()"
```

### 4. 容器和数据库管理

```bash
# 查看容器状态
sudo docker ps | grep 8b9453be3c65

# 查看容器详细信息
sudo docker inspect 8b9453be3c65

# 查看容器日志
sudo docker logs 8b9453be3c65

# 查看最近的日志
sudo docker logs --tail 50 8b9453be3c65

# 查看容器资源使用情况
sudo docker stats 8b9453be3c65

# 备份数据库（导出为 JSON）
sudo docker exec 8b9453be3c65 mongodump --db=mathexam --archive=/tmp/mathexam_backup.archive
sudo docker cp 8b9453be3c65:/tmp/mathexam_backup.archive ./mathexam_backup.archive

# 恢复数据库
sudo docker cp ./mathexam_backup.archive 8b9453be3c65:/tmp/mathexam_backup.archive
sudo docker exec 8b9453be3c65 mongorestore --db=mathexam --archive=/tmp/mathexam_backup.archive
```

## 快捷脚本

你可以创建一个快捷脚本文件来简化常用操作：

```bash
# 创建脚本
cat > check-mongodb.sh << 'EOF'
#!/bin/bash
CONTAINER_ID="8b9453be3c65"

# 从 .env 文件读取连接字符串，或使用默认值
if [ -f backend/.env ]; then
  MONGODB_URI=$(grep "^MONGODB_URI=" backend/.env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
  # 将连接字符串中的数据库名替换为 mathexam（如果需要）
  MONGODB_URI=$(echo "$MONGODB_URI" | sed 's|/[^/]*?|/mathexam?|' | sed 's|/[^/]*$|/mathexam|')
else
  echo "错误: 未找到 backend/.env 文件"
  echo "请手动设置 MONGODB_URI 环境变量或创建 backend/.env 文件"
  exit 1
fi

case "$1" in
  shell)
    sudo docker exec -it $CONTAINER_ID mongosh "$MONGODB_URI"
    ;;
  stats)
    sudo docker exec -it $CONTAINER_ID mongosh "$MONGODB_URI" --eval "db.stats()"
    ;;
  collections)
    sudo docker exec -it $CONTAINER_ID mongosh "$MONGODB_URI" --eval "show collections"
    ;;
  questions)
    sudo docker exec -it $CONTAINER_ID mongosh "$MONGODB_URI" --eval "db.questions.countDocuments()"
    ;;
  users)
    sudo docker exec -it $CONTAINER_ID mongosh "$MONGODB_URI" --eval "db.users.countDocuments()"
    ;;
  *)
    echo "用法: $0 {shell|stats|collections|questions|users}"
    echo "  shell        - 进入 MongoDB Shell"
    echo "  stats        - 查看数据库统计"
    echo "  collections  - 查看所有集合"
    echo "  questions    - 查看试题数量"
    echo "  users        - 查看用户数量"
    echo ""
    echo "当前使用的连接字符串:"
    echo "$MONGODB_URI" | sed 's/:[^:@]*@/:****@/'
    ;;
esac
EOF

chmod +x check-mongodb.sh

# 使用示例
./check-mongodb.sh shell
./check-mongodb.sh stats
./check-mongodb.sh questions
```

## 常见问题解决

### 错误：command find requires authentication

如果遇到此错误，说明 MongoDB 需要身份验证。解决方法：

1. **方法一：在连接字符串中包含认证信息（推荐）**
   ```bash
   # 获取连接字符串
   grep MONGODB_URI backend/.env
   
   # 使用完整的连接字符串连接
   sudo docker exec -it 8b9453be3c65 mongosh "mongodb://用户名:密码@localhost:27017/mathexam?authSource=admin"
   ```

2. **方法二：先连接后认证**
   ```bash
   sudo docker exec -it 8b9453be3c65 mongosh
   ```
   然后在 MongoDB Shell 中：
   ```javascript
   use admin
   db.auth("用户名", "密码")
   use mathexam
   ```

### 如何获取认证信息

```bash
# 查看环境变量文件中的连接字符串
cat backend/.env | grep MONGODB_URI

# 连接字符串格式：
# mongodb://用户名:密码@主机:端口/数据库名?authSource=认证数据库
```

## 常见问题解决

### 错误：command find requires authentication

如果遇到此错误，说明 MongoDB 需要身份验证。解决方法：

1. **方法一：在连接字符串中包含认证信息（推荐）**
   ```bash
   # 获取连接字符串
   grep MONGODB_URI backend/.env
   
   # 使用完整的连接字符串连接
   sudo docker exec -it 8b9453be3c65 mongosh "mongodb://用户名:密码@localhost:27017/mathexam?authSource=admin"
   ```

2. **方法二：先连接后认证**
   ```bash
   sudo docker exec -it 8b9453be3c65 mongosh
   ```
   然后在 MongoDB Shell 中：
   ```javascript
   use admin
   db.auth("用户名", "密码")
   use mathexam
   ```

### 如何获取认证信息

```bash
# 查看环境变量文件中的连接字符串
cat backend/.env | grep MONGODB_URI

# 连接字符串格式：
# mongodb://用户名:密码@主机:端口/数据库名?authSource=认证数据库
```

## 注意事项

1. 所有命令都需要 `sudo` 权限（取决于你的 Docker 配置）
2. 如果 MongoDB 版本 < 6.0，请使用 `mongo` 而不是 `mongosh`
3. 确保容器正在运行：`sudo docker ps | grep 8b9453be3c65`
4. 如果容器未运行，先启动：`sudo docker start 8b9453be3c65`
5. **如果启用了身份验证，必须在连接字符串中包含用户名和密码，或先进行身份验证**
6. 密码中包含特殊字符时，需要进行 URL 编码（如 `@` 编码为 `%40`）
5. **如果启用了身份验证，必须在连接字符串中包含用户名和密码，或先进行身份验证**
6. 密码中包含特殊字符时，需要进行 URL 编码（如 `@` 编码为 `%40`）