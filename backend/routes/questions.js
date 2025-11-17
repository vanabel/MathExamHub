const express = require('express');
const router = express.Router();
const axios = require('axios');
const Question = require('../models/Question'); // 导入试题模型

// 创建测试试题路由
router.post('/create-test-data', (req, res) => {
  const testData = req.body; // 测试数据

  // 使用数据库模型（如Question）将测试数据插入到数据库
  Question.insertMany(testData)
    .then((questions) => {
      res.json(questions);
    })
    .catch((error) => {
      res.status(400).json({error: 'Failed to insert test data' + error});
    });
});

// 创建试题
router.post('/create', (req, res) => {
  const { questionText, options, correctAnswer, totalScore, type, difficulty, createdBy, subject } = req.body;

  let additionalProperties = {};
  if (type === '单选题' || type === '多选题') {
    additionalProperties.options = options;
    //additionalProperties.correctAnswer = correctAnswer;
  } 

  const newQuestion = new Question({
    questionText,
    ...additionalProperties,
    correctAnswer,
    totalScore,
    type, 
    difficulty,
    createdBy,
    subject,
  });

  newQuestion.save()
    .then(question => {
      res.json(question);
    })
    .catch(error => {
      res.status(400).json({
        error,
        submittedData: req.body,
      });
    });
});

// 获取试题信息路由
router.get('/:_id/get', async (req, res) => {
  const { _id } = req.params;

  try {
    // 根据试题ID查找试题信息
    const question = await Question.findById(_id);

    if (!question) {
      return res.status(404).json({ error: '试题不存在' });
    }

    res.status(200).json({ 
      questionText: question.questionText, 
      questionAnswer: question.correctAnswer,
      type: question.type,
      totalScore: question.totalScore,
      difficulty: question.difficulty,
      options: question.options || {},
      subject: question.subject,
    });
  } catch (error) {
    console.error('获取试题信息失败:', error);
    res.status(500).json({ error: '获取试题信息失败' });
  }
});

// 编辑试题
router.put('/:id/edit', async (req, res) => {
  try {
    const { questionText, options, correctAnswer, totalScore, difficulty, type } = req.body;
    const questionId = req.params.id;

    // 查找题目
    const question = await Question.findById(questionId);
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // 仅在字段提供时才更新，避免把未提供的字段覆盖为 undefined
    if (typeof questionText !== 'undefined' && questionText !== null) {
      question.questionText = questionText;
    }
    if (typeof correctAnswer !== 'undefined' && correctAnswer !== null) {
      question.correctAnswer = correctAnswer;
    }
    if (typeof totalScore !== 'undefined' && totalScore !== null) {
      question.totalScore = Number(totalScore);
    }
    if (typeof difficulty !== 'undefined' && difficulty !== null) {
      question.difficulty = difficulty;
    }
    if (typeof type !== 'undefined' && type !== null) {
      question.type = type;
      // 如果类型不是选择题，清除选项字段
      if (type !== '单选题' && type !== '多选题') {
        question.options = {};
      }
    }
    // 处理选项：如果是选择题且有选项，更新；如果是非选择题，清除选项
    if (typeof options !== 'undefined') {
      if (question.type === '单选题' || question.type === '多选题') {
        // 确保选项对象的结构正确
        question.options = options || {};
      } else {
        question.options = {};
      }
    }
    
    // 更新 updatedAt 字段
    question.updatedAt = new Date();

    // 保存更新
    const updatedQuestion = await question.save();
    res.json(updatedQuestion);
  } catch (error) {
    console.error('编辑试题失败:', error);
    console.error('错误堆栈:', error.stack);
    
    // 如果是验证错误，返回 400
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Failed to edit question',
        details: error.message,
        validationErrors: error.errors
      });
    }
    
    // 其他错误返回 500
    res.status(500).json({ 
      error: 'Failed to edit question',
      details: error.message
    });
  }
});

// 删除试题
router.delete('/:id/delete', async (req, res) => {
  try {
    const question = await Question.findOneAndDelete({ _id: req.params.id });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({ message: 'Question deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// 获取试题列表
router.get('/list', (req, res) => {
  Question.find()
    .then(questions => {
      res.json(questions);
    })
    .catch(error => {
      res.status(500).json({error: 'Failed to retrieve questions'});
    });
});

// 获取所有已使用的科目列表
router.get('/subjects', async (req, res) => {
  try {
    const subjects = await Question.distinct('subject');
    // 过滤掉 null 和 undefined
    const validSubjects = subjects.filter(s => s != null);
    // 按字母顺序排序
    validSubjects.sort();
    res.json(validSubjects);
  } catch (error) {
    console.error('获取科目列表失败:', error);
    res.status(500).json({error: 'Failed to retrieve subjects'});
  }
});

// 搜索 学科+题目类型+题目关键词
router.get('/search', async (req, res) => {
  try {
    // Extract search parameters from the query string
    const { subject, questionType, questionText } = req.query;

    // Preprocess the questionText before searching
    const keywordsArray = questionText.split(/[,、;]/);
    console.log(keywordsArray);

    // Build a MongoDB query based on the provided parameters
    const query = {};
    if (subject) query.subject = subject;
    if (questionType) query.type = questionType;
    if (keywordsArray.length > 0) {
      query.questionText = { $all: keywordsArray.map(keyword => new RegExp(keyword.trim(), 'i')) };
    }
    //console.log(query);
    // Use the query to find matching questions
    const searchResults = await Question.find(query);
    console.log(searchResults);
    res.json(searchResults);
  } catch (error) {
    console.error('Error searching questions:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// 提取关键词
router.post('/extractKeywords', async (req, res) => {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  //console.log(openaiApiKey);

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/engines/gpt-3.5-turbo-instruct/completions',
      {
        prompt: req.body.prompt,
        max_tokens: 100,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
      }
    );

    const generatedText = response.data.choices[0].text;
    // Implement your keyword extraction logic here based on the generatedText
    res.json({ keywords: generatedText });
    console.log(generatedText);
  } catch (error) {
    console.error('Error interacting with OpenAI GPT-3 API:', error.response?.data || error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// LaTeX 导入/导出相关路由
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { LatexParser, LatexGenerator } = require('../utils/latexParser');

// 配置 multer 用于文件上传
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/plain' || file.originalname.endsWith('.tex')) {
      cb(null, true);
    } else {
      cb(new Error('只支持 .tex 文件'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 导入 LaTeX 文件
router.post('/import/latex', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传文件' });
    }

    // 读取文件内容
    const fileContent = fs.readFileSync(req.file.path, 'utf-8');

    // 解析 LaTeX 内容
    const parser = new LatexParser();
    const questions = parser.parse(fileContent);

    if (questions.length === 0) {
      // 删除临时文件
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: '未能从文件中解析出题目' });
    }

    // 保存到数据库
    const savedQuestions = [];
    const errors = [];

    for (const q of questions) {
      try {
        // 检查必填字段
        if (!q.questionText || !q.type) {
          errors.push({ question: q, error: '缺少必填字段' });
          continue;
        }

        // 设置默认值
        const questionData = {
          questionText: q.questionText,
          type: q.type,
          totalScore: q.totalScore || 0,
          correctAnswer: q.correctAnswer || q.solution || '',
          difficulty: q.difficulty || '中等',
          subject: q.subject || '解析几何',
          createdBy: req.body.createdBy || '系统导入',
          ...(q.options && Object.keys(q.options).length > 0 ? { options: q.options } : {}),
        };

        const newQuestion = new Question(questionData);
        const saved = await newQuestion.save();
        savedQuestions.push(saved);
      } catch (error) {
        errors.push({ question: q, error: error.message });
      }
    }

    // 删除临时文件
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      imported: savedQuestions.length,
      failed: errors.length,
      questions: savedQuestions,
      errors: errors,
    });
  } catch (error) {
    console.error('导入 LaTeX 文件失败:', error);
    // 清理临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: '导入失败: ' + error.message });
  }
});

// 导出题目为 LaTeX 文件
router.post('/export/latex', async (req, res) => {
  try {
    const { questionIds, metadata } = req.body;

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ error: '请选择要导出的题目' });
    }

    // 从数据库获取题目
    const questions = await Question.find({ _id: { $in: questionIds } });

    if (questions.length === 0) {
      return res.status(404).json({ error: '未找到指定的题目' });
    }

    // 转换为生成器需要的格式
    const questionsData = questions.map(q => ({
      type: q.type,
      totalScore: q.totalScore,
      questionText: q.questionText,
      correctAnswer: q.correctAnswer,
      options: q.options,
      solution: q.correctAnswer, // 使用答案作为解答
      subject: q.subject,
    }));

    // 生成 LaTeX 内容
    const generator = new LatexGenerator();
    const latexContent = generator.generate(questionsData, metadata || {});

    // 设置响应头，让浏览器下载文件
    const filename = metadata?.filename || `mathexam-${Date.now()}.tex`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.send(latexContent);
  } catch (error) {
    console.error('导出 LaTeX 文件失败:', error);
    res.status(500).json({ error: '导出失败: ' + error.message });
  }
});

module.exports = router;
