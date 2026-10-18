const mongoose = require('mongoose');

const knowledgePointSchema = new mongoose.Schema({
  bankId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionBank',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KnowledgePoint',
    default: null,
  },
  /** 从根到本节点的名称路径，如 /解析几何/二次曲线 */
  path: {
    type: String,
    required: true,
    trim: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  prerequisiteIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KnowledgePoint',
  }],
  successorIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KnowledgePoint',
  }],
  relatedIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KnowledgePoint',
  }],
  tags: [{ type: String, trim: true }],
  cognitiveLevel: { type: String, trim: true, default: '' },
  category: { type: String, trim: true, default: '' },
  objective: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
}, {
  timestamps: true,
});

knowledgePointSchema.index({ bankId: 1, subject: 1, parentId: 1, order: 1 });
knowledgePointSchema.index({ bankId: 1, subject: 1, path: 1 }, { unique: true });

module.exports = mongoose.model('KnowledgePoint', knowledgePointSchema);
