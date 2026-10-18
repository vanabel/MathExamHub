const mongoose = require('mongoose');

const kpTagSuggestionSchema = new mongoose.Schema({
  knowledgePointId: { type: String, required: true },
  path: { type: String, default: '' },
  confidence: { type: Number, min: 0, max: 1 },
  reason: { type: String, default: '' },
}, { _id: false });

const kpTagJobRowSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  questionPreview: { type: String, default: '' },
  questionText: { type: String, default: '' },
  type: { type: String, default: '' },
  subject: { type: String, default: '' },
  suggestions: [kpTagSuggestionSchema],
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'edited'],
    default: 'pending',
  },
  acceptedKnowledgePointIds: [{ type: String }],
  llmError: { type: String, default: '' },
}, { _id: false });

const kpTagJobSchema = new mongoose.Schema({
  bankId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionBank',
    required: true,
    index: true,
  },
  subject: { type: String, trim: true, default: '' },
  status: {
    type: String,
    enum: ['queued', 'running', 'completed', 'failed'],
    default: 'queued',
  },
  total: { type: Number, default: 0 },
  processed: { type: Number, default: 0 },
  errorMessage: { type: String, default: '' },
  options: {
    maxKpsPerQuestion: { type: Number, default: 1 },
    extraMinConfidence: { type: Number, default: 0.85 },
    concurrency: { type: Number, default: 3 },
  },
  rows: [kpTagJobRowSchema],
  createdBy: { type: String, default: '' },
  appliedAt: { type: Date, default: null },
  appliedModified: { type: Number, default: 0 },
}, { timestamps: true });

kpTagJobSchema.index({ bankId: 1, createdAt: -1 });
kpTagJobSchema.index({ bankId: 1, appliedAt: 1, status: 1 });

module.exports = mongoose.model('KpTagJob', kpTagJobSchema);
