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
    /* 其他试题信息字段 */ });
  } catch (error) {
    console.error('获取试题信息失败:', error);
    res.status(500).json({ error: '获取试题信息失败' });
  }
});

// 编辑试题
router.put('/:id/edit', (req, res) => {
  const { questionText, options, correctAnswer, totalScore, difficulty } = req.body;

  Question.findById(req.params.id, (err, question) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // 仅在字段提供时才更新，避免把未提供的字段覆盖为 undefined
    if (typeof questionText !== 'undefined') {
      question.questionText = questionText;
    }
    if (typeof options !== 'undefined') {
      question.options = options;
    }
    if (typeof correctAnswer !== 'undefined') {
      question.correctAnswer = correctAnswer;
    }
    if (typeof totalScore !== 'undefined') {
      question.totalScore = totalScore;
    }
    if (typeof difficulty !== 'undefined') {
      question.difficulty = difficulty;
    }

    question
      .save()
      .then((updatedQuestion) => {
        res.json(updatedQuestion);
      })
      .catch((error) => {
        res.status(400).json({ error: 'Failed to edit question' });
      });
  });
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

module.exports = router;
