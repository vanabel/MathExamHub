require('dotenv').config();
const mongoose = require('mongoose');

// 从环境变量或使用默认连接字符串
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mathexam';

console.log('🔍 正在检查 MongoDB 数据库...\n');
console.log(`连接字符串: ${mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}\n`);

async function checkDatabase() {
  try {
    // 连接到 MongoDB
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log('✓ 成功连接到 MongoDB\n');

    const db = mongoose.connection.db;
    const adminDb = db.admin();

    // 获取数据库信息
    const dbInfo = await db.stats();
    console.log('📊 数据库统计信息:');
    console.log(`  数据库名称: ${dbInfo.db}`);
    console.log(`  集合数量: ${dbInfo.collections}`);
    console.log(`  文档总数: ${dbInfo.objects}`);
    console.log(`  数据大小: ${(dbInfo.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  存储大小: ${(dbInfo.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  索引大小: ${(dbInfo.indexSize / 1024 / 1024).toFixed(2)} MB\n`);

    // 列出所有集合
    const collections = await db.listCollections().toArray();
    console.log('📁 数据库集合列表:');
    if (collections.length === 0) {
      console.log('  (空)');
    } else {
      for (const collection of collections) {
        const coll = db.collection(collection.name);
        const count = await coll.countDocuments();
        try {
          const stats = await db.command({ collStats: collection.name });
          console.log(`  - ${collection.name}: ${count} 个文档, ${(stats.size / 1024).toFixed(2)} KB`);
        } catch (err) {
          console.log(`  - ${collection.name}: ${count} 个文档`);
        }
      }
    }
    console.log('');

    // 如果有 questions 集合，显示一些统计信息
    if (collections.some(c => c.name === 'questions')) {
      const Question = require('../models/Question');
      const questionCount = await Question.countDocuments();
      const subjects = await Question.distinct('subject');
      const types = await Question.distinct('type');
      
      console.log('📝 试题统计:');
      console.log(`  总题数: ${questionCount}`);
      console.log(`  科目数: ${subjects.length}`);
      if (subjects.length > 0) {
        console.log(`  科目列表: ${subjects.join(', ')}`);
      }
      console.log(`  题型数: ${types.length}`);
      if (types.length > 0) {
        console.log(`  题型列表: ${types.join(', ')}`);
      }
      console.log('');
    }

    // 如果有 users 集合，显示用户统计
    if (collections.some(c => c.name === 'users')) {
      const User = require('../models/User');
      const userCount = await User.countDocuments();
      console.log('👥 用户统计:');
      console.log(`  总用户数: ${userCount}`);
      console.log('');
    }

    // 获取服务器信息
    try {
      const serverStatus = await adminDb.serverStatus();
      console.log('🖥️  MongoDB 服务器信息:');
      console.log(`  版本: ${serverStatus.version}`);
      console.log(`  运行时间: ${Math.floor(serverStatus.uptime / 3600)} 小时`);
      console.log(`  连接数: ${serverStatus.connections.current}/${serverStatus.connections.available}`);
      console.log('');
    } catch (err) {
      // 如果无法获取服务器状态（可能是权限问题），跳过
    }

    console.log('✓ 数据库检查完成');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('✗ 检查数据库时出错:');
    console.error(`  错误信息: ${error.message}`);
    console.error('\n可能的原因:');
    console.error('  1. MongoDB 服务未运行');
    console.error('  2. 连接字符串错误');
    console.error('  3. 网络连接问题');
    console.error('  4. 防火墙阻止连接');
    
    if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 提示: 如果 MongoDB 运行在 Docker 容器中，请确保:');
      console.error('  - 容器正在运行: docker ps | grep mongodb');
      console.error('  - 端口已映射: docker port <container_id>');
      console.error('  - 可以使用: docker exec -it <container_id> mongosh');
    }
    
    process.exit(1);
  }
}

checkDatabase();
