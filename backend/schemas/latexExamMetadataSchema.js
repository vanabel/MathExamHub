const mongoose = require('mongoose');

/** mathexam 试卷头 + 宏包选项（不含逐题字段） */
const latexExamMetadataSchema = new mongoose.Schema({
  packageOptions: {
    type: [String],
    default: undefined,
  },
  documentClass: { type: String, trim: true },
  documentClassOptions: {
    type: [String],
    default: undefined,
  },
  university: { type: String, trim: true },
  school: { type: String, trim: true },
  course: { type: String, trim: true },
  AorB: { type: String, trim: true },
  semester: { type: String, trim: true },
  /** ISO date YYYY-MM-DD for mathexam \\examdate */
  examDate: { type: String, trim: true },
  /** Manual \\academicyear{start}{end} override (both required when set) */
  academicYearStart: { type: String, trim: true },
  academicYearEnd: { type: String, trim: true },
  finalmiddle: { type: String, trim: true },
  totaltime: { type: String, trim: true },
  openclose: { type: String, trim: true },
  degree: { type: String, trim: true },
  totalstu: { type: String, trim: true },
  major: { type: String, trim: true },
  grade: { type: String, trim: true },
  examiner: { type: String, trim: true },
  director: { type: String, trim: true },
  dean: { type: String, trim: true },
  preambleLines: {
    type: [String],
    default: undefined,
  },
  exportMode: {
    type: String,
    enum: ['exam', 'answer', 'both'],
  },
}, { _id: false });

module.exports = latexExamMetadataSchema;
