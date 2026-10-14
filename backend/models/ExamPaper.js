const mongoose = require('mongoose');

const examPaperSchema = new mongoose.Schema({
  bankId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionBank',
    required: true,
    index: true,
  },
  blueprintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExamBlueprint',
  },
  title: { type: String, required: true },
  subject: { type: String },
  randomSeed: { type: Number, required: true },
  questionIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
  }],
  sections: [{
    type: { type: String },
    questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    requestedCount: Number,
    actualCount: Number,
  }],
  stats: {
    totalScore: Number,
    requestedTotalScore: Number,
    byType: mongoose.Schema.Types.Mixed,
    byDifficulty: mongoose.Schema.Types.Mixed,
  },
  relaxations: [{
    step: String,
    sectionIndex: Number,
    message: String,
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
  }],
  warnings: [String],
  shortfalls: [mongoose.Schema.Types.Mixed],
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ExamPaper', examPaperSchema);
