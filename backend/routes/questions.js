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
  const {
    questionText,
    options,
    correctAnswer,
    totalScore,
    type,
    difficulty,
    createdBy,
    subject,
    originalLaTeX,
    knowledgePointIds,
    status,
    source,
  } = req.body;

  let additionalProperties = {};
  if (type === '单选题' || type === '多选题') {
    additionalProperties.options = options;
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
    originalLaTeX,
    knowledgePointIds,
    status,
    source,
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
      originalLaTeX: question.originalLaTeX,
      knowledgePointIds: question.knowledgePointIds,
      contentHash: question.contentHash,
      status: question.status,
      source: question.source,
      usageCount: question.usageCount,
    });
  } catch (error) {
    console.error('获取试题信息失败:', error);
    res.status(500).json({ error: '获取试题信息失败' });
  }
});

// 编辑试题
router.put('/:id/edit', async (req, res) => {
  try {
    const {
      questionText,
      options,
      correctAnswer,
      totalScore,
      difficulty,
      type,
      subject,
      originalLaTeX,
      knowledgePointIds,
      status,
      source,
    } = req.body;

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    if (typeof questionText !== 'undefined') question.questionText = questionText;
    if (typeof options !== 'undefined') question.options = options;
    if (typeof correctAnswer !== 'undefined') question.correctAnswer = correctAnswer;
    if (typeof totalScore !== 'undefined') question.totalScore = totalScore;
    if (typeof difficulty !== 'undefined') question.difficulty = difficulty;
    if (typeof type !== 'undefined') question.type = type;
    if (typeof subject !== 'undefined') question.subject = subject;
    if (typeof originalLaTeX !== 'undefined') question.originalLaTeX = originalLaTeX;
    if (typeof knowledgePointIds !== 'undefined') question.knowledgePointIds = knowledgePointIds;
    if (typeof status !== 'undefined') question.status = status;
    if (typeof source !== 'undefined') question.source = source;

    const updatedQuestion = await question.save();
    res.json(updatedQuestion);
  } catch (error) {
    console.error('编辑试题失败:', error);
    res.status(400).json({ error: 'Failed to edit question', details: error.message });
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
router.get('/list', async (req, res) => {
  try {
    const { subject, questionType, knowledgePointId, status } = req.query;
    const query = {};
    if (subject) query.subject = subject;
    if (questionType) query.type = questionType;
    if (knowledgePointId) query.knowledgePointIds = knowledgePointId;
    if (status) query.status = status;

    const questions = await Question.find(query).sort({ createdAt: -1 });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve questions' });
  }
});

// 搜索 学科+题目类型+题目关键词
router.get('/search', async (req, res) => {
  try {
    const { subject, questionType, questionText } = req.query;

    const query = {};
    if (subject) query.subject = subject;
    if (questionType) query.type = questionType;

    if (questionText && String(questionText).trim()) {
      const keywordsArray = String(questionText)
        .split(/[,、;]/)
        .map((keyword) => keyword.trim())
        .filter(Boolean);
      if (keywordsArray.length > 0) {
        query.questionText = {
          $all: keywordsArray.map((keyword) => new RegExp(keyword, 'i')),
        };
      }
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

module.exports = router;
