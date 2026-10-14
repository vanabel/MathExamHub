# M3 题库（QuestionBank）迁移

## 说明

M3 引入 **QuestionBank / BankMember**，题目与知识点均归属 `bankId`。

```bash
cd backend
node scripts/migrate-m3-banks.js --dry-run
node scripts/migrate-m3-banks.js
# 遗留题目无 createdBy 时：
node scripts/migrate-m3-banks.js --fallback-user-id=<User._id>
```

注册与登录会自动创建 **个人默认题库**。
