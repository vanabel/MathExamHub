/**
 * 重复题目检测工具
 * 用于检测数据库中的重复题目
 */

const Question = require('../models/Question');

/**
 * 清理文本用于比较（移除空白字符、HTML标签、LaTeX命令等）
 */
function normalizeText(text) {
  if (!text) return '';
  
  // 移除 HTML 标签
  let normalized = text.replace(/<[^>]+>/g, '');
  
  // 移除 LaTeX 命令（保留内容）
  normalized = normalized.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1');
  normalized = normalized.replace(/\\[a-zA-Z]+/g, '');
  
  // 移除数学公式标记（$...$, $$...$$）
  normalized = normalized.replace(/\$\$?[^$]*\$\$?/g, '');
  normalized = normalized.replace(/\\\[[^\]]*\\\]/g, '');
  normalized = normalized.replace(/\\\([^\)]*\\\)/g, '');
  
  // 移除空白字符并转换为小写
  normalized = normalized.replace(/\s+/g, '').toLowerCase();
  
  // 移除标点符号
  normalized = normalized.replace(/[，。、；：！？,.;:!?]/g, '');
  
  return normalized;
}

/**
 * 计算两个文本的相似度（使用简单的字符匹配）
 * 返回 0-1 之间的相似度值
 */
function calculateSimilarity(text1, text2) {
  const norm1 = normalizeText(text1);
  const norm2 = normalizeText(text2);
  
  if (norm1.length === 0 && norm2.length === 0) return 1;
  if (norm1.length === 0 || norm2.length === 0) return 0;
  
  // 完全匹配
  if (norm1 === norm2) return 1;
  
  // 计算最长公共子序列（简化版）
  const longer = norm1.length > norm2.length ? norm1 : norm2;
  const shorter = norm1.length > norm2.length ? norm2 : norm1;
  
  // 如果较短的文本是较长文本的子串，返回相似度
  if (longer.includes(shorter)) {
    return shorter.length / longer.length;
  }
  
  // 计算字符重叠度
  let matches = 0;
  const charCount1 = {};
  const charCount2 = {};
  
  for (const char of norm1) {
    charCount1[char] = (charCount1[char] || 0) + 1;
  }
  for (const char of norm2) {
    charCount2[char] = (charCount2[char] || 0) + 1;
  }
  
  for (const char in charCount1) {
    if (charCount2[char]) {
      matches += Math.min(charCount1[char], charCount2[char]);
    }
  }
  
  const totalChars = Math.max(norm1.length, norm2.length);
  return matches / totalChars;
}

/**
 * 检测题目是否与数据库中的题目重复
 * @param {Object} question - 要检测的题目对象
 * @param {number} threshold - 相似度阈值（0-1），默认 0.85
 * @returns {Promise<Array>} 返回重复的题目数组
 */
async function findDuplicates(question, threshold = 0.85) {
  if (!question.questionText) {
    return [];
  }
  
  // 获取所有题目
  const allQuestions = await Question.find({}).select('_id questionText type subject originalLaTeX');
  
  const duplicates = [];
  const normalizedQuestionText = normalizeText(question.questionText);
  
  for (const existingQuestion of allQuestions) {
    // 跳过自己（如果是更新操作）
    if (question._id && existingQuestion._id.toString() === question._id.toString()) {
      continue;
    }
    
    // 比较题目文本
    const similarity = calculateSimilarity(
      question.questionText,
      existingQuestion.questionText || ''
    );
    
    if (similarity >= threshold) {
      duplicates.push({
        question: existingQuestion,
        similarity: similarity,
        matchType: similarity === 1 ? 'exact' : 'similar'
      });
    }
  }
  
  // 按相似度降序排序
  duplicates.sort((a, b) => b.similarity - a.similarity);
  
  return duplicates;
}

/**
 * 批量检测题目列表中的重复
 * @param {Array} questions - 题目数组
 * @param {number} threshold - 相似度阈值
 * @returns {Promise<Object>} 返回重复检测结果
 */
async function detectDuplicatesInBatch(questions, threshold = 0.85) {
  const results = {
    duplicates: [], // [{ question, duplicates: [...] }]
    unique: [], // 没有重复的题目
  };
  
  for (const question of questions) {
    const duplicates = await findDuplicates(question, threshold);
    
    if (duplicates.length > 0) {
      results.duplicates.push({
        question: question,
        duplicates: duplicates,
      });
    } else {
      results.unique.push(question);
    }
  }
  
  return results;
}

/**
 * 检测数据库中所有题目的重复情况
 * @param {number} threshold - 相似度阈值
 * @returns {Promise<Array>} 返回重复组数组，每个组包含相似的题目
 */
async function findAllDuplicates(threshold = 0.85) {
  const allQuestions = await Question.find({}).select('_id questionText type subject originalLaTeX createdAt');
  const processed = new Set();
  const duplicateGroups = [];
  
  for (let i = 0; i < allQuestions.length; i++) {
    if (processed.has(i)) continue;
    
    const question1 = allQuestions[i];
    const group = [question1];
    
    for (let j = i + 1; j < allQuestions.length; j++) {
      if (processed.has(j)) continue;
      
      const question2 = allQuestions[j];
      const similarity = calculateSimilarity(
        question1.questionText || '',
        question2.questionText || ''
      );
      
      if (similarity >= threshold) {
        group.push(question2);
        processed.add(j);
      }
    }
    
    if (group.length > 1) {
      duplicateGroups.push(group);
      processed.add(i);
    }
  }
  
  return duplicateGroups;
}

module.exports = {
  normalizeText,
  calculateSimilarity,
  findDuplicates,
  detectDuplicatesInBatch,
  findAllDuplicates,
};

