const mongoose = require('mongoose');

const options = {
  serverSelectionTimeoutMS: 5000, // 5秒超时
  socketTimeoutMS: 45000, // 45秒socket超时
  // 启用命令缓冲，允许在连接建立前执行命令（会在连接建立后自动执行）
  bufferCommands: true,
};

const connectDB = async () => {
  try {
    // 优先使用环境变量 MONGODB_URI，否则使用默认的本地连接
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mathexam';
    await mongoose.connect(mongoURI, options);
    console.log('✓ Connected to MongoDB');
    console.log(`  URI: ${mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`); // 隐藏密码
    return mongoose.connection;
  } catch (error) {
    console.error('✗ MongoDB connection error:', error);
    console.error('请确保 MongoDB 正在运行并且连接信息正确');
    console.error('当前使用的连接: ' + (process.env.MONGODB_URI ? '环境变量 MONGODB_URI' : 'mongodb://localhost:27017/mathexam'));
    throw error;
  }
};

const db = mongoose.connection;

db.on('error', (error) => {
  console.error('MongoDB connection error:', error);
  if (error.message.includes('buffering timed out')) {
    console.error('提示: MongoDB 连接超时。请检查:');
    console.error('  1. MongoDB 是否正在运行');
    console.error('  2. 连接字符串是否正确: mongodb://localhost:27017/mathexam');
    console.error('  3. 防火墙是否阻止了连接');
  }
});

db.on('disconnected', () => {
  console.warn('MongoDB 连接已断开');
});

db.on('reconnected', () => {
  console.log('MongoDB 重新连接成功');
});

// 优雅关闭
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB 连接已关闭');
  process.exit(0);
});

// 导出连接函数和 connection 对象
module.exports = connectDB;
module.exports.connection = db;
