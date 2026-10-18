const mongoose = require('mongoose');
const { DIFFICULTY_VALUES, normalizeDifficulty } = require('../constants/difficulty');

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
  },
  options: {
    A: { type: String },
    B: { type: String },
    C: { type: String },
    D: { type: String },
  },
  correctAnswer: { type: mongoose.Schema.Types.Mixed },
  /** Optional worked solution / explanation (LaTeX), separate from short correctAnswer (e.g. choice letter). */
  solution: { type: String },
  images: [{
    url: { type: String, trim: true },
    caption: { type: String, default: '', trim: true },
    label: { type: String, default: '', trim: true },
    width: { type: String, default: '', trim: true },
  }],
  totalScore: { type: Number, required: true },
  difficulty: {
    type: String,
    enum: DIFFICULTY_VALUES,
    default: '中',
  },
  type: {
    type: String,
    required: true,
    enum: [
      '判断题',
      '填空题',
      '计算题',
      '解答题',
      '证明题',
      '单选题',
      '多选题',
      '作图题',
      '简答题',
    ],
  },
  bankId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionBank',
    required: true,
    index: true,
  },
  subject: {
    type: String,
    trim: true,
  },
  originalLaTeX: {
    type: String,
  },
  /** mathexam makepart title for LaTeX round-trip (e.g. 计算与证明题) */
  latexPartTitle: { type: String, trim: true },
  knowledgePointIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KnowledgePoint',
  }],
  knowledgePointLinks: [{
    knowledgePointId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KnowledgePoint',
      required: true,
    },
    source: {
      type: String,
      enum: ['llm', 'manual'],
      default: 'manual',
    },
    confidence: { type: Number, min: 0, max: 1 },
    reviewedBy: { type: String, trim: true, default: '' },
  }],
  contentHash: {
    type: String,
    sparse: true,
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'deleted'],
    default: 'published',
  },
  deletedAt: { type: Date },
  deletedBy: { type: String },
  source: {
    kind: { type: String },
    fileName: { type: String },
    examId: { type: String },
  },
  usageCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  lastUsedAt: { type: Date },
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

questionSchema.index({ bankId: 1, status: 1, deletedAt: -1 });
questionSchema.index({ bankId: 1, createdAt: -1 });
questionSchema.index({ bankId: 1, subject: 1, type: 1 });
questionSchema.index({ bankId: 1, status: 1, difficulty: 1 });
questionSchema.index({ bankId: 1, status: 1, totalScore: 1 });
questionSchema.index({ bankId: 1, knowledgePointIds: 1 });
questionSchema.index({ bankId: 1, contentHash: 1 }, { unique: true, sparse: true });
questionSchema.index({ questionText: 'text' });

questionSchema.pre('validate', function normalizeFields(next) {
  this.difficulty = normalizeDifficulty(this.difficulty, '中');
  const { computeContentHash } = require('../utils/contentHash');
  const hash = computeContentHash(this);
  if (hash) {
    this.contentHash = hash;
  }
  const {
    syncKnowledgePointIdsFromLinks,
    reconcileLinksFromIds,
  } = require('../utils/knowledgePointLinks');
  if (this.knowledgePointLinks?.length) {
    this.knowledgePointIds = syncKnowledgePointIdsFromLinks(this.knowledgePointLinks);
  } else if (this.knowledgePointIds?.length) {
    this.knowledgePointLinks = reconcileLinksFromIds(
      this.knowledgePointLinks,
      this.knowledgePointIds,
    );
  } else {
    this.knowledgePointLinks = [];
    this.knowledgePointIds = [];
  }
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Question', questionSchema);
