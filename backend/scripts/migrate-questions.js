#!/usr/bin/env node
/**
 * 迁移 questions 集合从 mathcuz 数据库到 mathexam 数据库
 * 用法: node backend/scripts/migrate-questions.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// 源数据库连接字符串（必须通过环境变量设置，不允许硬编码密码）
const sourceURI = process.env.MONGODB_URI_SOURCE;
if (!sourceURI) {
  console.error('✗ 错误: 必须设置环境变量 MONGODB_URI_SOURCE');
  console.error('  示例: MONGODB_URI_SOURCE="mongodb://用户名:密码@localhost:27017/mathcuz?authSource=admin"');
  process.exit(1);
}

// 目标数据库连接字符串（从 .env 读取，不允许硬编码密码）
const targetURI = process.env.MONGODB_URI;
if (!targetURI) {
  console.error('✗ 错误: 必须设置环境变量 MONGODB_URI');
  console.error('  请在 backend/.env 文件中设置 MONGODB_URI');
  process.exit(1);
}

async function migrateQuestions() {
  let sourceConn, targetConn;

  try {
    console.log('🔄 开始迁移 questions 集合...\n');

    // 连接到源数据库
    console.log('📥 连接到源数据库 (mathcuz)...');
    sourceConn = await mongoose.createConnection(sourceURI, {
      serverSelectionTimeoutMS: 10000,
    }).asPromise();
    console.log('✓ 源数据库连接成功\n');

    // 连接到目标数据库
    console.log('📤 连接到目标数据库 (mathexam)...');
    targetConn = await mongoose.createConnection(targetURI, {
      serverSelectionTimeoutMS: 10000,
    }).asPromise();
    console.log('✓ 目标数据库连接成功\n');

    const sourceDB = sourceConn.db;
    const targetDB = targetConn.db;

    // 检查源数据库中是否存在 questions 集合
    const sourceCollections = await sourceDB.listCollections().toArray();
    const sourceQuestionsExists = sourceCollections.some(c => c.name === 'questions');

    if (!sourceQuestionsExists) {
      console.log('⚠️  源数据库中没有找到 questions 集合');
      console.log('可用集合:', sourceCollections.map(c => c.name).join(', '));
      process.exit(0);
    }

    // 获取源集合中的文档数量
    const sourceCount = await sourceDB.collection('questions').countDocuments();
    console.log(`📊 源数据库中有 ${sourceCount} 条题目\n`);

    if (sourceCount === 0) {
      console.log('⚠️  源数据库中的 questions 集合为空，无需迁移');
      process.exit(0);
    }

    // 检查目标数据库中是否已有 questions 集合
    const targetCollections = await targetDB.listCollections().toArray();
    const targetQuestionsExists = targetCollections.some(c => c.name === 'questions');
    const targetCount = targetQuestionsExists 
      ? await targetDB.collection('questions').countDocuments() 
      : 0;

    if (targetCount > 0) {
      console.log(`⚠️  目标数据库中已有 ${targetCount} 条题目`);
      console.log('⚠️  迁移将会添加新数据，不会删除现有数据\n');
    }

    // 读取源集合中的所有文档
    console.log('📖 正在读取源数据库中的题目...');
    const questions = await sourceDB.collection('questions').find({}).toArray();
    console.log(`✓ 读取到 ${questions.length} 条题目\n`);

    // 插入到目标数据库
    if (questions.length > 0) {
      console.log('📝 正在写入目标数据库...');
      
      // 如果目标集合已存在，先检查是否有重复
      if (targetQuestionsExists) {
        // 获取已存在的 _id 列表
        const existingIds = await targetDB.collection('questions')
          .find({}, { projection: { _id: 1 } })
          .toArray();
        const existingIdSet = new Set(existingIds.map(doc => doc._id.toString()));
        
        // 过滤掉已存在的文档
        const newQuestions = questions.filter(q => !existingIdSet.has(q._id.toString()));
        
        if (newQuestions.length === 0) {
          console.log('⚠️  所有题目都已存在于目标数据库中，无需迁移');
          process.exit(0);
        }
        
        console.log(`   - 跳过 ${questions.length - newQuestions.length} 条已存在的题目`);
        console.log(`   - 将插入 ${newQuestions.length} 条新题目`);
        
        if (newQuestions.length > 0) {
          await targetDB.collection('questions').insertMany(newQuestions, { ordered: false });
          console.log(`✓ 成功插入 ${newQuestions.length} 条题目\n`);
        }
      } else {
        // 目标集合不存在，直接插入所有数据
        await targetDB.collection('questions').insertMany(questions, { ordered: false });
        console.log(`✓ 成功插入 ${questions.length} 条题目\n`);
      }
    }

    // 验证迁移结果
    const finalCount = await targetDB.collection('questions').countDocuments();
    console.log('✅ 迁移完成！');
    console.log(`   - 源数据库: ${sourceCount} 条题目`);
    console.log(`   - 目标数据库: ${finalCount} 条题目\n`);

  } catch (error) {
    console.error('✗ 迁移失败:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    // 关闭连接
    if (sourceConn) {
      await sourceConn.close();
    }
    if (targetConn) {
      await targetConn.close();
    }
    console.log('🔌 数据库连接已关闭');
  }
}

// 运行迁移
migrateQuestions();
