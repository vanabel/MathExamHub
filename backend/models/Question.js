const mongoose = require('mongoose');

// 创建一个通用的试题模型
const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
  },
  options: { // 选项（仅适用于选择题）
    A: { type: String },
    B: { type: String },
    C: { type: String },
    D: { type: String },
  },
  correctAnswer: {type: mongoose.Schema.Types.Mixed}, // 答案，可以是字符串、数组等，根据试题类型而异
  totalScore: {type: Number, required: true},
  // 其他通用字段，如难度级别、创建日期、修改日期等
  difficulty: {type: String}, // 难度级别，如简单、中等、困难
  createdAt: {type: Date, default: Date.now}, // 创建日期
  updatedAt: {type: Date, default: Date.now}, // 修改日期
  createdBy: {type: String}, // 创建试题的用户
});

// 添加一个字段来表示试题类型
questionSchema.add({
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
    ],
  },
});
// 添加一个字段来表示试题科目
questionSchema.add({
 subject: {
    type: String,
    enum: [
      '微分几何',
      '解析几何', 
      '高等几何', 
      '线性代数II',
      /* Add other subjects as needed */
    ],
  },
});

module.exports = mongoose.model('Question', questionSchema);
