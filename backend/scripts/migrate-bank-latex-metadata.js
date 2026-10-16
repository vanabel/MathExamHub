/**
 * 为已有 QuestionBank 文档补全 latexExamMetadata 空对象（幂等）。
 * 用法：node scripts/migrate-bank-latex-metadata.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const QuestionBank = require('../models/QuestionBank');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mathcuz';
  await mongoose.connect(uri);
  const result = await QuestionBank.updateMany(
    { latexExamMetadata: { $exists: false } },
    { $set: { latexExamMetadata: {} } },
  );
  console.log('migrate-bank-latex-metadata:', {
    matched: result.matchedCount,
    modified: result.modifiedCount,
  });
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
