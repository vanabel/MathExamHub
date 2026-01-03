require('dotenv').config();
const mongoose = require('mongoose');

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mathcuz';

console.log('连接 MongoDB...');
mongoose.connect(mongoURI, {
  serverSelectionTimeoutMS: 5000,
})
.then(async () => {
  console.log('✓ 连接成功！');
  
  // 尝试写入测试数据
  const testSchema = new mongoose.Schema({ test: String, date: Date });
  const TestModel = mongoose.model('test_collection', testSchema);
  
  console.log('\n尝试写入测试数据...');
  const testDoc = new TestModel({ test: 'hello', date: new Date() });
  
  await testDoc.save();
  console.log('✓ 写入成功！');
  
  // 读取验证
  const found = await TestModel.findOne({ test: 'hello' });
  console.log('✓ 读取成功:', found);
  
  // 清理测试数据
  await TestModel.deleteOne({ test: 'hello' });
  console.log('✓ 删除成功');
  
  process.exit(0);
})
.catch((error) => {
  console.error('✗ 错误:', error);
  process.exit(1);
});
