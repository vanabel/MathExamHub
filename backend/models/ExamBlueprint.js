const mongoose = require('mongoose');
const { DIFFICULTY_VALUES } = require('../constants/difficulty');

const sectionSchema = new mongoose.Schema({
  type: { type: String, required: true },
  count: { type: Number, required: true, min: 1 },
  scoreEach: { type: Number, min: 0 },
  scoreTotal: { type: Number, min: 0 },
  difficultyMix: {
    易: { type: Number, default: 0, min: 0 },
    中: { type: Number, default: 0, min: 0 },
    难: { type: Number, default: 0, min: 0 },
  },
  knowledgePointIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgePoint' }],
  excludeQuestionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
}, { _id: false });

const examBlueprintSchema = new mongoose.Schema({
  bankId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionBank',
    required: true,
    index: true,
  },
  title: { type: String, required: true, trim: true },
  subject: { type: String, trim: true },
  totalScore: { type: Number, min: 0 },
  sections: {
    type: [sectionSchema],
    validate: [(v) => Array.isArray(v) && v.length > 0, '至少一个 section'],
  },
  randomSeed: { type: Number, default: () => Date.now() },
  allowRelaxation: { type: Boolean, default: true },
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

examBlueprintSchema.pre('save', function preSave() {
  this.updatedAt = new Date();
  for (const section of this.sections) {
    if (!section.scoreEach && section.scoreTotal && section.count) {
      section.scoreEach = section.scoreTotal / section.count;
    }
    if (section.difficultyMix) {
      for (const d of DIFFICULTY_VALUES) {
        if (section.difficultyMix[d] == null) section.difficultyMix[d] = 0;
      }
    }
  }
});

module.exports = mongoose.model('ExamBlueprint', examBlueprintSchema);
