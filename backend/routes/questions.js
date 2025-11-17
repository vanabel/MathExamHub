const express = require('express');
const router = express.Router();
const axios = require('axios');
const Question = require('../models/Question'); // 导入试题模型

// 创建测试试题路由
router.post('/create-test-data', (req, res) => {
  const testData = req.body; // 测试数据

  // 使用数据库模型（如Question）将测试数据插入到数据库
  Question.insertMany(testData)
    .then((questions) => {
      res.json(questions);
    })
    .catch((error) => {
      res.status(400).json({error: 'Failed to insert test data' + error});
    });
});

// 创建试题
router.post('/create', (req, res) => {
  const { questionText, options, correctAnswer, totalScore, type, difficulty, createdBy, subject } = req.body;

  let additionalProperties = {};
  if (type === '单选题' || type === '多选题') {
    additionalProperties.options = options;
    //additionalProperties.correctAnswer = correctAnswer;
  } 

  const newQuestion = new Question({
    questionText,
    ...additionalProperties,
    correctAnswer,
    totalScore,
    type, 
    difficulty,
    createdBy,
    subject,
  });

  newQuestion.save()
    .then(question => {
      res.json(question);
    })
    .catch(error => {
      res.status(400).json({
        error,
        submittedData: req.body,
      });
    });
});

// 获取试题信息路由
router.get('/:_id/get', async (req, res) => {
  const { _id } = req.params;

  try {
    // 根据试题ID查找试题信息
    const question = await Question.findById(_id);

    if (!question) {
      return res.status(404).json({ error: '试题不存在' });
    }

    res.status(200).json({ 
      questionText: question.questionText, 
      questionAnswer: question.correctAnswer,
      type: question.type,
      totalScore: question.totalScore,
      difficulty: question.difficulty,
      options: question.options || {},
      subject: question.subject,
      originalLaTeX: question.originalLaTeX, // 返回原始 LaTeX 代码
    });
  } catch (error) {
    console.error('获取试题信息失败:', error);
    res.status(500).json({ error: '获取试题信息失败' });
  }
});

// 编辑试题
router.put('/:id/edit', async (req, res) => {
  try {
    const { questionText, options, correctAnswer, totalScore, difficulty, type } = req.body;
    const questionId = req.params.id;

    // 查找题目
    const question = await Question.findById(questionId);
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // 仅在字段提供时才更新，避免把未提供的字段覆盖为 undefined
    if (typeof questionText !== 'undefined' && questionText !== null) {
      // 判断提交的内容是原始 LaTeX 代码还是处理后的 HTML
      const isOriginalLaTeX = !questionText.includes('<image') && !questionText.includes('<a href="#fig:');
      
      if (isOriginalLaTeX) {
        // 提交的是原始 LaTeX 代码
        question.originalLaTeX = questionText;
        
        // 尝试处理原始 LaTeX 代码，将 \includegraphics 转换为 <image> 标签
        // 需要查找实际的文件名（可能带前缀）
        let processedText = questionText;
        const uploadDir = path.join(__dirname, '../uploads');
        
        // 处理 \includegraphics{filename}
        const includegraphicsRegex = /\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g;
        processedText = processedText.replace(includegraphicsRegex, (match, filename) => {
          const nameWithoutExt = filename.trim().replace(/\.(png|jpg|jpeg|gif|pdf)$/i, '');
          
          // 在 uploads 目录中查找匹配的文件（支持带前缀的文件名）
          try {
            const files = fs.readdirSync(uploadDir);
            for (const file of files) {
              const fileWithoutExt = file.replace(/\.(png|jpg|jpeg|gif|pdf)$/i, '');
              // 检查是否以原始名称结尾（支持前缀）
              if (fileWithoutExt.endsWith(`-${nameWithoutExt}`) || fileWithoutExt === nameWithoutExt) {
                // 找到匹配的文件，使用实际文件名
                const label = nameWithoutExt;
                return `<image href="${file}" id="fig:${label}" />`;
              }
            }
          } catch (error) {
            console.error('读取 uploads 目录失败:', error);
          }
          
          // 如果找不到匹配的文件，使用原始文件名
          const fileExt = filename.match(/\.(png|jpg|jpeg|gif|pdf)$/i)?.[1] || 'pdf';
          const fullFileName = filename.includes('.') ? filename : `${filename}.${fileExt}`;
          return `<image href="${fullFileName}" id="fig:${nameWithoutExt}" />`;
        });
        
        // 处理 \ref{fig:xxx}
        const refRegex = /\\ref\{([^}]+)\}/g;
        processedText = processedText.replace(refRegex, (match, label) => {
          const labelPart = label.replace(/^fig:/, '');
          const numMatch = labelPart.match(/(\d+)/);
          const displayText = numMatch ? numMatch[1] : labelPart;
          return `<a href="#fig:${labelPart}">${displayText}</a>`;
        });
        
        // 更新 questionText 为处理后的版本
        question.questionText = processedText;
      } else {
        // 提交的是处理后的 HTML（包含 <image> 标签）
        question.questionText = questionText;
        
        // 将 <image> 和 <a> 标签转换回 LaTeX 代码保存到 originalLaTeX
        const { LatexGenerator } = require('../utils/latexParser');
        const generator = new LatexGenerator();
        let originalLaTeX = questionText;
        originalLaTeX = generator.convertImageTagsToLaTeX(originalLaTeX);
        originalLaTeX = generator.convertRefTagsToLaTeX(originalLaTeX);
        question.originalLaTeX = originalLaTeX;
      }
    }
    if (typeof correctAnswer !== 'undefined' && correctAnswer !== null) {
      question.correctAnswer = correctAnswer;
    }
    if (typeof totalScore !== 'undefined' && totalScore !== null) {
      question.totalScore = Number(totalScore);
    }
    if (typeof difficulty !== 'undefined' && difficulty !== null) {
      question.difficulty = difficulty;
    }
    if (typeof type !== 'undefined' && type !== null) {
      question.type = type;
      // 如果类型不是选择题，清除选项字段
      if (type !== '单选题' && type !== '多选题') {
        question.options = {};
      }
    }
    // 处理选项：如果是选择题且有选项，更新；如果是非选择题，清除选项
    if (typeof options !== 'undefined') {
      if (question.type === '单选题' || question.type === '多选题') {
        // 确保选项对象的结构正确
        question.options = options || {};
      } else {
        question.options = {};
      }
    }
    
    // 更新 updatedAt 字段
    question.updatedAt = new Date();

    // 保存更新
    const updatedQuestion = await question.save();
    res.json(updatedQuestion);
  } catch (error) {
    console.error('编辑试题失败:', error);
    console.error('错误堆栈:', error.stack);
    
    // 如果是验证错误，返回 400
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Failed to edit question',
        details: error.message,
        validationErrors: error.errors
      });
    }
    
    // 其他错误返回 500
    res.status(500).json({ 
      error: 'Failed to edit question',
      details: error.message
    });
  }
});

// 删除试题
router.delete('/:id/delete', async (req, res) => {
  try {
    const question = await Question.findOneAndDelete({ _id: req.params.id });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({ message: 'Question deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// 获取试题列表
router.get('/list', (req, res) => {
  Question.find()
    .then(questions => {
      res.json(questions);
    })
    .catch(error => {
      res.status(500).json({error: 'Failed to retrieve questions'});
    });
});

// 获取所有已使用的科目列表
router.get('/subjects', async (req, res) => {
  try {
    const subjects = await Question.distinct('subject');
    // 过滤掉 null 和 undefined
    const validSubjects = subjects.filter(s => s != null);
    // 按字母顺序排序
    validSubjects.sort();
    res.json(validSubjects);
  } catch (error) {
    console.error('获取科目列表失败:', error);
    res.status(500).json({error: 'Failed to retrieve subjects'});
  }
});

// 搜索 学科+题目类型+题目关键词
router.get('/search', async (req, res) => {
  try {
    // Extract search parameters from the query string
    const { subject, questionType, questionText } = req.query;

    // Preprocess the questionText before searching
    const keywordsArray = questionText.split(/[,、;]/);
    console.log(keywordsArray);

    // Build a MongoDB query based on the provided parameters
    const query = {};
    if (subject) query.subject = subject;
    if (questionType) query.type = questionType;
    if (keywordsArray.length > 0) {
      query.questionText = { $all: keywordsArray.map(keyword => new RegExp(keyword.trim(), 'i')) };
    }
    //console.log(query);
    // Use the query to find matching questions
    const searchResults = await Question.find(query);
    console.log(searchResults);
    res.json(searchResults);
  } catch (error) {
    console.error('Error searching questions:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// 提取关键词
router.post('/extractKeywords', async (req, res) => {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  //console.log(openaiApiKey);

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/engines/gpt-3.5-turbo-instruct/completions',
      {
        prompt: req.body.prompt,
        max_tokens: 100,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
      }
    );

    const generatedText = response.data.choices[0].text;
    // Implement your keyword extraction logic here based on the generatedText
    res.json({ keywords: generatedText });
    console.log(generatedText);
  } catch (error) {
    console.error('Error interacting with OpenAI GPT-3 API:', error.response?.data || error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// LaTeX 导入/导出相关路由
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { LatexParser, LatexGenerator } = require('../utils/latexParser');

// 配置 multer 用于文件上传
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    // 允许 .tex 文件和图片/PDF 文件
    if (file.mimetype === 'text/plain' || file.originalname.endsWith('.tex')) {
      cb(null, true);
    } else if (file.mimetype.startsWith('image/') || 
               file.mimetype === 'application/pdf' ||
               /\.(png|jpg|jpeg|gif|pdf)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 .tex 文件和图片/PDF 文件（png/jpg/jpeg/gif/pdf）'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 导入 LaTeX 文件
router.post('/import/latex', upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'images', maxCount: 20 }
]), async (req, res) => {
  try {
    if (!req.files || !req.files['file'] || req.files['file'].length === 0) {
      return res.status(400).json({ error: '请上传 .tex 文件' });
    }

    const texFile = req.files['file'][0];
    const imageFiles = req.files['images'] || [];

    // 读取文件内容
    const fileContent = fs.readFileSync(texFile.path, 'utf-8');

    // 从 tex 文件名提取信息，用于生成唯一文件名
    // 例如：AnalyticGeometry2024MiddleTermA.tex -> 解析几何-2024-midterm
    const texFileName = texFile.originalname.replace(/\.tex$/i, '');
    const filePrefix = generateFilePrefix(texFileName, fileContent);

    // 处理图片/PDF 文件：重命名并移动到 uploads 目录
    const imageMap = {}; // 原始文件名（不含扩展名）-> 新文件名的映射
    for (const imgFile of imageFiles) {
      // 提取原始文件名（不含扩展名）和扩展名（支持 pdf）
      const extMatch = imgFile.originalname.match(/\.(png|jpg|jpeg|gif|pdf)$/i);
      const ext = extMatch ? extMatch[1].toLowerCase() : 'png';
      const originalName = imgFile.originalname.replace(/\.(png|jpg|jpeg|gif|pdf)$/i, '');
      const newFileName = `${filePrefix}-${originalName}.${ext}`;
      const newPath = path.join(uploadDir, newFileName);
      
      // 移动文件到新路径
      fs.renameSync(imgFile.path, newPath);
      // 存储映射：原始文件名（不含扩展名）-> 新文件名（含扩展名）
      imageMap[originalName] = newFileName;
      // 也支持带扩展名的查找（向后兼容）
      imageMap[imgFile.originalname] = newFileName;
    }

    // 解析 LaTeX 内容，传入图片映射和文件前缀
    const parser = new LatexParser();
    const questions = parser.parse(fileContent, { imageMap, filePrefix });

    if (questions.length === 0) {
      // 删除临时文件
      fs.unlinkSync(texFile.path);
      // 清理已上传的图片文件
      for (const imgFile of imageFiles) {
        if (fs.existsSync(imgFile.path)) {
          fs.unlinkSync(imgFile.path);
        }
      }
      return res.status(400).json({ error: '未能从文件中解析出题目' });
    }

    // 保存到数据库
    const savedQuestions = [];
    const errors = [];

    for (const q of questions) {
      try {
        // 检查必填字段
        if (!q.questionText || !q.type) {
          errors.push({ question: q, error: '缺少必填字段' });
          continue;
        }

        // 设置默认值
        const questionData = {
          questionText: q.questionText,
          type: q.type,
          totalScore: q.totalScore || 0,
          correctAnswer: q.correctAnswer || q.solution || '',
          difficulty: q.difficulty || '中等',
          subject: q.subject || '解析几何',
          createdBy: req.body.createdBy || '系统导入',
          ...(q.options && Object.keys(q.options).length > 0 ? { options: q.options } : {}),
          ...(q.originalLaTeX ? { originalLaTeX: q.originalLaTeX } : {}), // 保存原始 LaTeX 代码
        };

        const newQuestion = new Question(questionData);
        const saved = await newQuestion.save();
        savedQuestions.push(saved);
      } catch (error) {
        errors.push({ question: q, error: error.message });
      }
    }

    // 删除临时 tex 文件（图片文件已移动到 uploads 目录，保留）
    fs.unlinkSync(texFile.path);

    res.json({
      success: true,
      imported: savedQuestions.length,
      failed: errors.length,
      questions: savedQuestions,
      errors: errors,
    });
  } catch (error) {
    console.error('导入 LaTeX 文件失败:', error);
    // 清理临时文件
    if (req.files && req.files['file'] && req.files['file'].length > 0) {
      const texFile = req.files['file'][0];
      if (fs.existsSync(texFile.path)) {
        fs.unlinkSync(texFile.path);
      }
    }
    if (req.files && req.files['images']) {
      for (const imgFile of req.files['images']) {
        if (fs.existsSync(imgFile.path)) {
          fs.unlinkSync(imgFile.path);
        }
      }
    }
    res.status(500).json({ error: '导入失败: ' + error.message });
  }
});

/**
 * 从 tex 文件名和内容生成文件前缀
 * 例如：AnalyticGeometry2024MiddleTermA.tex -> 解析几何-2024-midterm
 */
function generateFilePrefix(texFileName, fileContent) {
  // 尝试从文件内容中提取课程信息
  const courseMatch = fileContent.match(/\\course\{([^}]+)\}/);
  const course = courseMatch ? courseMatch[1].trim() : '解析几何';
  
  // 尝试提取年份和考试类型
  const yearMatch = fileContent.match(/\\grade\{([^}]+)\}/);
  const year = yearMatch ? yearMatch[1].trim() : '';
  
  const finalMiddleMatch = fileContent.match(/\\finalmiddle\{([^}]+)\}/);
  const finalMiddle = finalMiddleMatch ? finalMiddleMatch[1].trim() : '';
  
  // 生成前缀：课程-年份-考试类型
  const parts = [course];
  if (year) parts.push(year);
  if (finalMiddle) {
    // 转换考试类型：期末 -> final, 期中 -> midterm
    const typeMap = {
      '期末': 'final',
      '期中': 'midterm',
      'Final': 'final',
      'Middle': 'midterm',
      'Midterm': 'midterm'
    };
    const type = typeMap[finalMiddle] || finalMiddle.toLowerCase();
    parts.push(type);
  }
  
  return parts.join('-');
}

// 导出题目为 LaTeX 文件
router.post('/export/latex', async (req, res) => {
  try {
    const { questionIds, metadata } = req.body;

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ error: '请选择要导出的题目' });
    }

    // 从数据库获取题目
    const questions = await Question.find({ _id: { $in: questionIds } });

    if (questions.length === 0) {
      return res.status(404).json({ error: '未找到指定的题目' });
    }

    // 转换为生成器需要的格式（包含 originalLaTeX）
    const questionsData = questions.map(q => ({
      type: q.type,
      totalScore: q.totalScore,
      questionText: q.questionText,
      correctAnswer: q.correctAnswer,
      options: q.options,
      solution: q.correctAnswer, // 使用答案作为解答
      subject: q.subject,
      originalLaTeX: q.originalLaTeX, // 包含原始 LaTeX 代码
    }));

    // 生成 LaTeX 内容
    const generator = new LatexGenerator();
    const latexContent = generator.generate(questionsData, metadata || {});

    // 收集所有引用的图片文件
    // 从生成的 LaTeX 内容中提取 \includegraphics{...}
    const imageFiles = new Set();
    const imageFilesMap = {}; // 原始文件名 -> 实际文件名的映射
    
    // 从 LaTeX 内容中提取 \includegraphics{figName}
    // 也检查 \begin{figure} 环境中的 \includegraphics
    const includegraphicsRegex = /\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g;
    let imgMatch;
    let hasImages = false;
    
    while ((imgMatch = includegraphicsRegex.exec(latexContent)) !== null) {
      hasImages = true;
      const originalName = imgMatch[1].trim();
      // 去掉可能的扩展名
      const nameWithoutExt = originalName.replace(/\.(png|jpg|jpeg|gif|pdf)$/i, '');
      
      // 在 uploads 目录中查找对应的文件（可能带前缀）
      const uploadDir = path.join(__dirname, '../uploads');
      let files = [];
      try {
        files = fs.readdirSync(uploadDir);
      } catch (error) {
        console.error('读取 uploads 目录失败:', error);
      }
      
      // 查找匹配的文件（支持带前缀的文件名）
      for (const file of files) {
        const fileWithoutExt = file.replace(/\.(png|jpg|jpeg|gif|pdf)$/i, '');
        // 检查是否以原始名称结尾（支持前缀）
        if (fileWithoutExt.endsWith(`-${nameWithoutExt}`) || fileWithoutExt === nameWithoutExt) {
          imageFiles.add(file);
          imageFilesMap[originalName] = file;
          break;
        }
      }
    }
    
    // 如果从 LaTeX 内容中没有找到 \includegraphics，检查是否有 <image> 标签（不应该发生，但作为后备）
    if (!hasImages) {
      const imageTagRegex = /<image\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
      let tagMatch;
      while ((tagMatch = imageTagRegex.exec(latexContent)) !== null) {
        hasImages = true;
        const href = tagMatch[1];
        imageFiles.add(href);
        imageFilesMap[href] = href;
      }
    }

    // 检查是否有图片文件需要打包
    if (imageFiles.size > 0) {
      // 使用 archiver 创建 zip 文件
      const archiver = require('archiver');
      const archive = archiver('zip', { zlib: { level: 9 } });

      // 设置响应头
      // 确保文件名不包含 .tex 扩展名，因为我们要创建 .zip 文件
      let baseFilename = metadata?.filename || `mathexam-${Date.now()}`;
      baseFilename = baseFilename.replace(/\.tex$/, '').replace(/\.zip$/, '');
      const zipFilename = `${baseFilename}.zip`;
      
      // 对文件名进行编码，避免中文字符等特殊字符导致错误
      const encodedFilename = encodeURIComponent(zipFilename);
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);

      // 将 zip 流连接到响应
      archive.pipe(res);

      // 添加 LaTeX 文件（zip 内部的 .tex 文件名）
      const texFilename = `${baseFilename}.tex`;
      archive.append(latexContent, { name: texFilename });

      // 添加图片文件
      const uploadDir = path.join(__dirname, '../uploads');
      for (const [originalName, actualFile] of Object.entries(imageFilesMap)) {
        const imagePath = path.join(uploadDir, actualFile);
        if (fs.existsSync(imagePath)) {
          // 使用原始文件名（LaTeX 中使用的名称）作为 zip 中的文件名
          // 如果原始名称没有扩展名，从实际文件中获取扩展名
          let zipFileName = originalName;
          if (!/\.(png|jpg|jpeg|gif|pdf)$/i.test(originalName)) {
            const ext = actualFile.match(/\.(png|jpg|jpeg|gif|pdf)$/i)?.[1] || 'pdf';
            zipFileName = `${originalName}.${ext}`;
          }
          archive.file(imagePath, { name: zipFileName });
        }
      }

      // 完成压缩
      await archive.finalize();
    } else {
      // 没有图片，直接返回 LaTeX 文件
      // 确保文件名包含 .tex 扩展名
      let filename = metadata?.filename || `mathexam-${Date.now()}`;
      filename = filename.replace(/\.zip$/, '');
      if (!filename.endsWith('.tex')) {
        filename = `${filename}.tex`;
      }
      
      // 对文件名进行编码，避免中文字符等特殊字符导致错误
      const encodedFilename = encodeURIComponent(filename);
      
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
      res.send(latexContent);
    }
  } catch (error) {
    console.error('导出 LaTeX 文件失败:', error);
    res.status(500).json({ error: '导出失败: ' + error.message });
  }
});

module.exports = router;
