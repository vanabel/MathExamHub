const KpTagJob = require('../models/KpTagJob');
const Question = require('../models/Question');
const KnowledgePoint = require('../models/KnowledgePoint');
const { activeQuestionFilter } = require('../constants/questionLifecycle');
const platformSettingsService = require('./platformSettingsService');
const { settingsForLlmAssist } = require('./llmProviderResolve');
const { buildKpTagSuggestionsForQuestions } = require('./llmKpTagService');
const { applyKpTagUpdates } = require('./llmKpTagService');
const { mapWithConcurrency } = require('./latexImportLlmHelper');
const { countReviewRows, isJobReviewOpen } = require('../utils/kpTagJobReviewCounts');

function summarizeJob(job) {
  const reviewCounts = countReviewRows(job.rows);
  return {
    _id: job._id,
    bankId: job.bankId,
    subject: job.subject,
    status: job.status,
    total: job.total,
    processed: job.processed,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    appliedAt: job.appliedAt,
    reviewCounts,
    reviewOpen: isJobReviewOpen(job),
  };
}

async function loadUntaggedQuestions(bankId, subject) {
  const filter = activeQuestionFilter({
    bankId,
    $or: [{ knowledgePointIds: { $exists: false } }, { knowledgePointIds: { $size: 0 } }],
  });
  if (subject) filter.subject = String(subject).trim();
  return Question.find(filter)
    .select('_id questionText type subject difficulty totalScore correctAnswer solution options knowledgePointIds')
    .lean();
}

async function startKpTagJob(bankId, userName, opts = {}) {
  const subject = opts.subject ? String(opts.subject).trim() : '';
  const questions = await loadUntaggedQuestions(bankId, subject);
  const job = await KpTagJob.create({
    bankId,
    subject,
    status: 'queued',
    total: questions.length,
    processed: 0,
    options: {
      maxKpsPerQuestion: opts.maxKpsPerQuestion ?? 1,
      extraMinConfidence: opts.extraMinConfidence ?? 0.85,
      concurrency: opts.concurrency ?? 3,
    },
    rows: [],
    createdBy: userName || '',
  });

  setImmediate(() => {
    runKpTagJob(String(job._id), questions).catch((err) => {
      console.error('kp tag job failed', err);
    });
  });

  return job.toObject();
}

async function runKpTagJob(jobId, questions) {
  const job = await KpTagJob.findById(jobId);
  if (!job) return;
  job.status = 'running';
  await job.save();

  try {
    const platformSettings = await platformSettingsService.getPlatformSettings();
    const settings = settingsForLlmAssist(platformSettings);
    const concurrency = job.options?.concurrency || 3;
    const tagOpts = {
      maxKpsPerQuestion: job.options?.maxKpsPerQuestion ?? 1,
      extraMinConfidence: job.options?.extraMinConfidence ?? 0.85,
      subject: job.subject || undefined,
      concurrency,
      leafOnlyCatalog: true,
    };

    const rows = [];
    let processed = 0;
    await mapWithConcurrency(questions, concurrency, async (q) => {
      const [suggestion] = await buildKpTagSuggestionsForQuestions(
        [q],
        job.bankId,
        platformSettings,
        tagOpts,
      );
      rows.push({
        questionId: String(q._id),
        questionPreview: String(q.questionText || '').slice(0, 200),
        questionText: String(q.questionText || ''),
        type: q.type,
        subject: q.subject,
        suggestions: suggestion?.suggestions || [],
        status: 'pending',
        acceptedKnowledgePointIds: (suggestion?.suggestions || []).map((s) => s.knowledgePointId),
        llmError: suggestion?.llmError || '',
      });
      processed += 1;
      if (processed % 5 === 0 || processed === questions.length) {
        await KpTagJob.updateOne(
          { _id: jobId },
          { $set: { processed, rows: rows.slice() } },
        );
      }
    });

    await KpTagJob.updateOne(
      { _id: jobId },
      {
        $set: {
          status: 'completed',
          processed: questions.length,
          rows,
        },
      },
    );
  } catch (err) {
    await KpTagJob.updateOne(
      { _id: jobId },
      { $set: { status: 'failed', errorMessage: err.message || 'job failed' } },
    );
  }
}

async function getKpTagJob(bankId, jobId) {
  return KpTagJob.findOne({ _id: jobId, bankId }).lean();
}

async function listKpTagJobs(bankId, { limit = 30 } = {}) {
  const jobs = await KpTagJob.find({ bankId })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 100))
    .lean();
  return jobs.map(summarizeJob);
}

async function getLatestOpenReviewJob(bankId, subject) {
  const query = {
    bankId,
    appliedAt: null,
    status: { $in: ['queued', 'running', 'completed'] },
  };
  if (subject) query.subject = String(subject).trim();
  const job = await KpTagJob.findOne(query).sort({ updatedAt: -1 }).lean();
  return job || null;
}

async function getKpTagReviewSummary(bankId) {
  const jobs = await KpTagJob.find({
    bankId,
    appliedAt: null,
    status: { $in: ['queued', 'running', 'completed'] },
  }).select('rows status').lean();

  let pendingRowCount = 0;
  let openJobCount = 0;
  for (const job of jobs) {
    if (!isJobReviewOpen(job)) continue;
    openJobCount += 1;
    pendingRowCount += countReviewRows(job.rows).pending;
  }
  return { openJobCount, pendingRowCount };
}

async function updateKpTagJobReview(bankId, jobId, rowUpdates) {
  const job = await KpTagJob.findOne({ _id: jobId, bankId });
  if (!job) return null;
  const byId = new Map((rowUpdates || []).map((r) => [String(r.questionId), r]));
  for (const row of job.rows) {
    const patch = byId.get(String(row.questionId));
    if (!patch) continue;
    if (patch.status) row.status = patch.status;
    if (patch.acceptedKnowledgePointIds) {
      row.acceptedKnowledgePointIds = patch.acceptedKnowledgePointIds;
    }
  }
  job.markModified('rows');
  await job.save();
  return job.toObject();
}

async function applyKpTagJob(bankId, jobId, reviewer) {
  const job = await KpTagJob.findOne({ _id: jobId, bankId });
  if (!job) return { modified: 0 };
  if (job.appliedAt) {
    return { modified: 0, alreadyApplied: true };
  }
  const jobLean = job.toObject();
  const updates = (jobLean.rows || [])
    .filter((r) => r.status === 'accepted' || r.status === 'edited')
    .filter((r) => r.acceptedKnowledgePointIds?.length)
    .map((r) => ({
      questionId: r.questionId,
      knowledgePointLinks: (r.acceptedKnowledgePointIds || []).map((id) => {
        const sug = (r.suggestions || []).find((s) => s.knowledgePointId === id);
        return {
          knowledgePointId: id,
          source: sug ? 'llm' : 'manual',
          confidence: sug?.confidence,
          reviewedBy: reviewer || '',
        };
      }),
    }));
  const result = await applyKpTagUpdates(bankId, updates, { replace: true });
  job.appliedAt = new Date();
  job.appliedModified = result.modified;
  await job.save();
  return { ...result, appliedAt: job.appliedAt };
}

module.exports = {
  startKpTagJob,
  getKpTagJob,
  listKpTagJobs,
  getLatestOpenReviewJob,
  getKpTagReviewSummary,
  updateKpTagJobReview,
  applyKpTagJob,
  loadUntaggedQuestions,
  summarizeJob,
  countReviewRows,
};
