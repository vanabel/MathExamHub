const mongoose = require('mongoose');

/**
 * 连接 MongoDB，供 server 在 listen 前 await。
 * @returns {Promise<typeof mongoose>}
 */
async function connectDB() {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mathexam';

  try {
    await mongoose.connect(mongoURI);
    console.log(`✓ Connected to MongoDB (${mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')})`);
    return mongoose;
  } catch (error) {
    console.error('✗ MongoDB connection error:', error.message);
    console.error('  请确认 MongoDB 已启动，或设置 MONGODB_URI');
    throw error;
  }
}

module.exports = connectDB;
