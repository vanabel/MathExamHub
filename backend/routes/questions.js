const express = require('express');
const router = express.Router();
const axios = require('axios');
const Question = require('../models/Question');
const requireAuth = require('../middleware/requireAuth');
const { bankContext, requireBankWrite } = require('../middleware/bankContext');
const { getSubtreeNodeIds } = require('../utils/knowledgePointTree');
const registerLatexImportRoutes = require('./latexImport');
const registerDuplicateReviewRoutes = require('./duplicateReview');
const registerRecycleBinRoutes = require('./recycleBin');
const { findAllDuplicatesInBank, formatGroupsForApi } = require('../utils/duplicateDetector');
const { activeQuestionFilter, QUESTION_STATUS } = require('../constants/questionLifecycle');
const { softDeleteQuestion } = require('../services/questionLifecycle');

router.use(requireAuth);
router.use(bankContext);

registerLatexImportRoutes(router);
registerDuplicateReviewRoutes(router);
registerRecycleBinRoutes(router);

router.post('/create-test-data', requireBankWrite, (req, res) => {
  const testData = req.body.map((row) => ({ ...row, bankId: req.bankId }));
  Question.insertMany(testData)
    .then((questions) => res.json(questions))
    .catch((error) => res.status(400).json({ error: 'Failed to insert test data' + error }));
});

router.post('/create', requireBankWrite, (req, res) => {
  const {
    questionText, options, correctAnswer, totalScore, type, difficulty, createdBy, subject,
    originalLaTeX, knowledgePointIds, status, source,
  } = req.body;

  const additionalProperties = {};
  if (type === '单选题' || type === '多选题') {
    additionalProperties.options = options;
  }

  const newQuestion = new Question({
    bankId: req.bankId,
    questionText,
    ...additionalProperties,
    correctAnswer,
    totalScore,
    type,
    difficulty,
    createdBy: createdBy || req.user.username,
    subject,
    originalLaTeX,
    knowledgePointIds,
    status,
    source,
  });

  newQuestion.save()
    .then((question) => res.json(question))
    .catch((error) => res.status(400).json({ error, submittedData: req.body }));
});

router.get('/:_id/get', async (req, res) => {
  try {
    const question = await Question.findOne(activeQuestionFilter({
      _id: req.params._id,
      bankId: req.bankId,
    }));
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
      bankId: question.bankId,
    });
  } catch (error) {
    console.error('获取试题信息失败:', error);
    res.status(500).json({ error: '获取试题信息失败' });
  }
});

router.put('/:id/edit', requireBankWrite, async (req, res) => {
  try {
    const question = await Question.findOne(activeQuestionFilter({
      _id: req.params.id,
      bankId: req.bankId,
    }));
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const fields = [
      'questionText', 'options', 'correctAnswer', 'totalScore', 'difficulty', 'type',
      'subject', 'originalLaTeX', 'knowledgePointIds', 'status', 'source',
    ];
    for (const key of fields) {
      if (typeof req.body[key] !== 'undefined') {
        question[key] = req.body[key];
      }
    }

    const updatedQuestion = await question.save();
    res.json(updatedQuestion);
  } catch (error) {
    console.error('编辑试题失败:', error);
    res.status(400).json({ error: 'Failed to edit question', details: error.message });
  }
});

router.delete('/:id/delete', requireBankWrite, async (req, res) => {
  try {
    const question = await softDeleteQuestion(req.params.id, req.bankId, req.user.username);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.json({ message: 'Question moved to recycle bin', questionId: question._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/list', async (req, res) => {
  try {
    const { subject, questionType, knowledgePointId, status, subtree, checkDuplicates } = req.query;
    const query = activeQuestionFilter({ bankId: req.bankId });
    if (subject) query.subject = subject;
    if (questionType) query.type = questionType;
    if (status) {
      if (status === QUESTION_STATUS.DELETED) {
        return res.status(400).json({ error: '请使用 GET /questions/recycle-bin 查看回收站' });
      }
      query.status = status;
    }

    if (knowledgePointId) {
      if (subtree === 'true') {
        const ids = await getSubtreeNodeIds(req.bankId, knowledgePointId);
        query.knowledgePointIds = { $in: ids };
      } else {
        query.knowledgePointIds = knowledgePointId;
      }
    }

    const questions = await Question.find(query).sort({ createdAt: -1 });

    if (checkDuplicates === 'true') {
      const threshold = parseFloat(req.query.duplicateThreshold) || 0.85;
      const { duplicateGroups } = await findAllDuplicatesInBank(req.bankId, threshold);
      const idToGroup = new Map();
      duplicateGroups.forEach((group, index) => {
        group.questions.forEach((q) => {
          idToGroup.set(String(q._id), { groupId: index, matchKind: group.matchKind });
        });
      });

      const questionsWithDuplicates = questions.map((q) => {
        const meta = idToGroup.get(String(q._id));
        return {
          ...q.toObject(),
          isDuplicate: !!meta,
          duplicateGroupId: meta?.groupId ?? null,
          duplicateMatchKind: meta?.matchKind ?? null,
        };
      });

      return res.json({
        questions: questionsWithDuplicates,
        duplicateGroups: formatGroupsForApi(duplicateGroups),
      });
    }

    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve questions' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { subject, questionType, questionText } = req.query;
    const query = activeQuestionFilter({ bankId: req.bankId });
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

    const searchResults = await Question.find(query);
    res.json(searchResults);
  } catch (error) {
    console.error('Error searching questions:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/extractKeywords', async (req, res) => {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/engines/gpt-3.5-turbo-instruct/completions',
      { prompt: req.body.prompt, max_tokens: 100 },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiApiKey}`,
        },
      },
    );
    res.json({ keywords: response.data.choices[0].text });
  } catch (error) {
    console.error('Error interacting with OpenAI GPT-3 API:', error.response?.data || error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
