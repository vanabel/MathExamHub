const mongoose = require('mongoose');
const { BANK_ROLES } = require('../constants/bankRoles');

const bankMemberSchema = new mongoose.Schema({
  bankId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionBank',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: BANK_ROLES,
    required: true,
  },
}, {
  timestamps: true,
});

bankMemberSchema.index({ bankId: 1, userId: 1 }, { unique: true });
bankMemberSchema.index({ userId: 1 });

module.exports = mongoose.model('BankMember', bankMemberSchema);
