const mongoose = require('mongoose');
const latexExamMetadataSchema = require('../schemas/latexExamMetadataSchema');

const questionBankSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  kind: {
    type: String,
    enum: ['personal', 'shared'],
    default: 'shared',
  },
  isPersonalDefault: {
    type: Boolean,
    default: false,
  },
  latexExamMetadata: {
    type: latexExamMetadataSchema,
    default: () => ({}),
  },
}, {
  timestamps: true,
});

questionBankSchema.index({ ownerId: 1, isPersonalDefault: 1 });

module.exports = mongoose.model('QuestionBank', questionBankSchema);
