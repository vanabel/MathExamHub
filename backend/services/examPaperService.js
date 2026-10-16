const ExamPaper = require('../models/ExamPaper');
const Question = require('../models/Question');

async function recordQuestionUsage(bankId, questionIds) {
  if (!questionIds?.length) return;
  const now = new Date();
  await Question.updateMany(
    { _id: { $in: questionIds }, bankId },
    { $inc: { usageCount: 1 }, $set: { lastUsedAt: now } },
  );
}

function mapQuestionsForApi(pool, questionIds) {
  return questionIds
    .map((id) => pool.find((q) => String(q._id) === String(id)))
    .filter(Boolean)
    .map((q) => ({
      _id: q._id,
      type: q.type,
      difficulty: q.difficulty,
      totalScore: q.totalScore,
      subject: q.subject,
      questionText: q.questionText,
      originalLaTeX: q.originalLaTeX,
      knowledgePointIds: q.knowledgePointIds,
      usageCount: q.usageCount,
      lastUsedAt: q.lastUsedAt,
    }));
}

async function createExamPaperDoc({
  bankId,
  blueprintId,
  blueprint,
  result,
  username,
  variantLabel,
  variantGroupId,
}) {
  return ExamPaper.create({
    bankId,
    blueprintId: blueprintId || undefined,
    variantGroupId,
    variantLabel,
    title: blueprint.title,
    subject: blueprint.subject,
    randomSeed: blueprint.randomSeed,
    questionIds: result.questionIds,
    sections: result.sections,
    stats: result.stats,
    relaxations: result.relaxations,
    warnings: result.warnings,
    shortfalls: result.shortfalls,
    createdBy: username,
  });
}

function buildGeneratePayload(paper, result, questions) {
  return {
    paperId: paper._id,
    success: result.success,
    questionIds: result.questionIds,
    questions,
    sections: result.sections,
    stats: result.stats,
    relaxations: result.relaxations,
    warnings: result.warnings,
    shortfalls: result.shortfalls,
    randomSeed: result.randomSeed ?? paper.randomSeed,
  };
}

module.exports = {
  recordQuestionUsage,
  mapQuestionsForApi,
  createExamPaperDoc,
  buildGeneratePayload,
};
