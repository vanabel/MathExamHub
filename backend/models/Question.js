const mongoose = require('mongoose');
const { DIFFICULTY_VALUES, normalizeDifficulty } = require('../constants/difficulty');
const { computeContentHash } = require('../utils/contentHash');

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
  subject: {
    type: String,
    trim: true,
  },
  originalLaTeX: {
    type: String,
  },
  knowledgePointIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KnowledgePoint',
  }],
  contentHash: {
    type: String,
    sparse: true,
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published',
  },
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
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

questionSchema.index({ subject: 1, type: 1 });
questionSchema.index({ knowledgePointIds: 1 });
questionSchema.index({ contentHash: 1 }, { unique: true, sparse: true });
questionSchema.index({ questionText: 'text' });

questionSchema.pre('validate', function normalizeFields(next) {
  this.difficulty = normalizeDifficulty(this.difficulty, '中');
  const hash = computeContentHash(this);
  if (hash) {
    this.contentHash = hash;
  }
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Question', questionSchema);
