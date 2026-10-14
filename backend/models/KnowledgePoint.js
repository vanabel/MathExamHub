const mongoose = require('mongoose');

const knowledgePointSchema = new mongoose.Schema({
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
}, {
  timestamps: true,
});

knowledgePointSchema.index({ subject: 1, parentId: 1, order: 1 });
knowledgePointSchema.index({ subject: 1, path: 1 }, { unique: true });

module.exports = mongoose.model('KnowledgePoint', knowledgePointSchema);
