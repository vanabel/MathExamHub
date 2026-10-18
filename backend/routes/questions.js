const express = require('express');
const router = express.Router();
const axios = require('axios');
const Question = require('../models/Question');
const requireAuth = require('../middleware/requireAuth');
const { bankContext, requireBankWrite } = require('../middleware/bankContext');
const { getSubtreeNodeIds } = require('../utils/knowledgePointTree');
const registerLatexImportRoutes = require('./latexImport');
const registerLatexExportRoutes = require('./latexExport');
const registerDuplicateReviewRoutes = require('./duplicateReview');
const registerRecycleBinRoutes = require('./recycleBin');
const { findAllDuplicatesInBank, formatGroupsForApi } = require('../utils/duplicateDetector');
const { activeQuestionFilter, QUESTION_STATUS } = require('../constants/questionLifecycle');
const { softDeleteQuestion } = require('../services/questionLifecycle');
const {
  buildQuestionListFilter,
  parseListPagination,
  parseListSort,
} = require('../utils/questionListQuery');
const { assessQuestionQuality } = require('../utils/questionQuality');
const { extractImagesFromStem } = require('../utils/questionImages');
const platformSettingsService = require('../services/platformSettingsService');
const { buildRelabelSuggestionsForQuestions } = require('../services/llmRelabelService');
const { buildBankQuestionDashboard } = require('../utils/bankQuestionStats');
const { buildBankStatsCsvLines } = require('../utils/bankStatsCsv');

router.use(requireAuth);
router.use(bankContext);

registerLatexImportRoutes(router);
registerLatexExportRoutes(router);
registerDuplicateReviewRoutes(router);
registerRecycleBinRoutes(router);

router.post('/create-test-data', requireBankWrite, (req, res) => {
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_TEST_ROUTES !== '1') {
    return res.status(404).json({ error: 'Not found' });
  }
  const testData = req.body.map((row) => ({ ...row, bankId: req.bankId }));
  Question.insertMany(testData)
    .then((questions) => res.json(questions))
    .catch((error) => res.status(400).json({ error: 'Failed to insert test data' + error }));
});

router.post('/create', requireBankWrite, (req, res) => {
  const {
    questionText, options, correctAnswer, solution, images, totalScore, type, difficulty, createdBy, subject,
    originalLaTeX, knowledgePointIds, status, source,
  } = req.body;

  const additionalProperties = {};
  if (type === '单选题' || type === '多选题') {
    additionalProperties.options = options;
  }

  const solutionText = typeof solution === 'string' && solution.trim() ? solution.trim() : undefined;
  const stemImages = extractImagesFromStem(questionText || '', Array.isArray(images) ? images : []);

  const newQuestion = new Question({
    bankId: req.bankId,
    questionText: stemImages.stem,
    images: stemImages.images,
    ...additionalProperties,
    correctAnswer,
    solution: solutionText,
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

router.get('/stats/dashboard', requireBankWrite, async (req, res) => {
  try {
    const dashboard = await buildBankQuestionDashboard(req.bankId);
    res.json(dashboard);
  } catch (error) {
    console.error('stats dashboard failed', error);
    res.status(500).json({ error: '统计加载失败' });
  }
});

router.get('/stats/dashboard.csv', requireBankWrite, async (req, res) => {
  try {
    const dashboard = await buildBankQuestionDashboard(req.bankId);
    const lines = buildBankStatsCsvLines(dashboard);
    const body = `\uFEFF${lines.join('\n')}\n`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="bank-stats.csv"');
    res.send(body);
  } catch (error) {
    res.status(500).json({ error: '导出失败' });
  }
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
      solution: question.solution,
      type: question.type,
      totalScore: question.totalScore,
      difficulty: question.difficulty,
      options: question.options || {},
      subject: question.subject,
      originalLaTeX: question.originalLaTeX,
      images: question.images || [],
      knowledgePointIds: question.knowledgePointIds,
      contentHash: question.contentHash,
      status: question.status,
      source: question.source,
      usageCount: question.usageCount ?? 0,
      lastUsedAt: question.lastUsedAt,
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
      'options', 'correctAnswer', 'solution', 'totalScore', 'difficulty', 'type',
      'subject', 'originalLaTeX', 'knowledgePointIds', 'status', 'source', 'images',
    ];
    for (const key of fields) {
      if (typeof req.body[key] !== 'undefined') {
        if (key === 'solution' && typeof req.body[key] === 'string' && !req.body[key].trim()) {
          question.solution = undefined;
        } else {
          question[key] = req.body[key];
        }
      }
    }
    if (typeof req.body.questionText !== 'undefined') {
      const extracted = extractImagesFromStem(
        req.body.questionText,
        Array.isArray(req.body.images) ? req.body.images : question.images,
      );
      question.questionText = extracted.stem;
      question.images = extracted.images;
    } else if (Array.isArray(req.body.images)) {
      question.images = req.body.images;
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

function escapeCsvCell(value) {
  const s = String(value ?? '').replace(/"/g, '""');
  return `"${s}"`;
}

router.get('/quality/export.csv', requireBankWrite, async (req, res) => {
  try {
    const quality = req.query.quality || 'incomplete';
    const query = buildQuestionListFilter({
      bankId: req.bankId,
      query: { ...req.query, quality },
    });
    const questions = await Question.find(query)
      .select('_id questionText type difficulty knowledgePointIds correctAnswer originalLaTeX')
      .lean();
    const lines = [
      'id,type,difficulty,qualityIssues,questionText',
    ];
    for (const q of questions) {
      const issues = assessQuestionQuality(q).join(';');
      lines.push([
        escapeCsvCell(q._id),
        escapeCsvCell(q.type),
        escapeCsvCell(q.difficulty),
        escapeCsvCell(issues),
        escapeCsvCell((q.questionText || '').slice(0, 500)),
      ].join(','));
    }
    const body = `\uFEFF${lines.join('\n')}\n`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="question-quality-export.csv"');
    res.send(body);
  } catch (error) {
    console.error('quality CSV export failed', error);
    res.status(500).json({ error: '导出失败' });
  }
});

router.post('/llm-relabel-difficulty', requireBankWrite, async (req, res) => {
  try {
    const dryRun = req.body?.apply !== true && req.query.apply !== 'true';
    const query = buildQuestionListFilter({
      bankId: req.bankId,
      query: req.body?.filters || req.query || {},
    });
    const questions = await Question.find(query)
      .select('_id questionText type subject difficulty totalScore correctAnswer solution options')
      .lean();
    const platformSettings = await platformSettingsService.getPlatformSettings();
    const suggestions = await buildRelabelSuggestionsForQuestions(
      questions,
      req.bankId,
      platformSettings,
    );
    const changed = suggestions.filter(
      (s) => s.suggestedDifficulty && s.suggestedDifficulty !== s.currentDifficulty,
    );
    if (!dryRun) {
      let modified = 0;
      for (const row of changed) {
        const q = await Question.findOne(activeQuestionFilter({ _id: row.questionId, bankId: req.bankId }));
        if (!q) continue;
        q.difficulty = row.suggestedDifficulty;
        await q.save();
        modified += 1;
      }
      return res.json({ dryRun: false, total: suggestions.length, changed: changed.length, modified, suggestions });
    }
    res.json({ dryRun: true, total: suggestions.length, changed: changed.length, suggestions });
  } catch (error) {
    console.error('llm-relabel-difficulty failed', error);
    res.status(500).json({ error: '难度重标建议失败' });
  }
});

router.post('/batch-metadata', requireBankWrite, async (req, res) => {
  try {
    const updates = req.body?.updates;
    if (!Array.isArray(updates) || !updates.length) {
      return res.status(400).json({ error: 'updates 数组必填' });
    }
    let modified = 0;
    for (const row of updates) {
      if (!row.id) continue;
      const q = await Question.findOne(activeQuestionFilter({ _id: row.id, bankId: req.bankId }));
      if (!q) continue;
      if (row.difficulty) q.difficulty = row.difficulty;
      if (Array.isArray(row.knowledgePointIds)) q.knowledgePointIds = row.knowledgePointIds;
      await q.save();
      modified += 1;
    }
    res.json({ modified });
  } catch (error) {
    res.status(500).json({ error: '批量更新失败' });
  }
});

async function runQuestionList(req, res) {
  try {
    const { knowledgePointId, subtree, checkDuplicates, status } = req.query;
    if (status === QUESTION_STATUS.DELETED) {
      return res.status(400).json({ error: '请使用 GET /questions/recycle-bin 查看回收站' });
    }

    let kpSubtreeIds = null;
    if (knowledgePointId && subtree === 'true') {
      kpSubtreeIds = await getSubtreeNodeIds(req.bankId, knowledgePointId);
    }

    const query = buildQuestionListFilter({
      bankId: req.bankId,
      query: req.query,
      kpSubtreeIds,
    });

    const sort = parseListSort(req.query);
    const { explicit: hasPagination, limit, offset } = parseListPagination(req.query);

    let questionsQuery = Question.find(query).sort(sort);
    if (limit != null) {
      questionsQuery = questionsQuery.skip(offset).limit(limit);
    }
    const [questions, total] = await Promise.all([
      questionsQuery.exec(),
      hasPagination ? Question.countDocuments(query) : Promise.resolve(null),
    ]);

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

      const payload = {
        questions: questionsWithDuplicates,
        duplicateGroups: formatGroupsForApi(duplicateGroups),
      };
      if (hasPagination) {
        payload.total = total;
        payload.limit = limit;
        payload.offset = offset;
      }
      return res.json(payload);
    }

    const attachQuality = req.query.includeQuality === 'true';
    const mapQ = (q) => {
      const obj = q.toObject ? q.toObject() : q;
      if (attachQuality) {
        obj.qualityIssues = assessQuestionQuality(obj);
      }
      return obj;
    };

    if (hasPagination) {
      return res.json({
        questions: questions.map(mapQ),
        total,
        limit,
        offset,
      });
    }

    res.json(questions.map(mapQ));
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve questions' });
  }
}

router.get('/list', runQuestionList);

/** @deprecated 与 /list 相同参数；请使用 GET /questions/list?q=&limit=&offset= */
router.get('/search', (req, res) => {
  if (req.query.limit == null && req.query.offset == null) {
    req.query.limit = '200';
    req.query.offset = '0';
  }
  return runQuestionList(req, res);
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
