/**
 * LaTeX 题目解析器
 * 用于解析 mathexam 格式的 LaTeX 文件，提取题目信息
 */

class LatexParser {
  constructor() {
    this.questions = [];
    this.currentPart = null;
    this.currentQuestion = null;
  }

  /**
   * 匹配嵌套的花括号内容
   * 例如：\fillin{\frac{1}{2}} 会正确匹配到 \frac{1}{2}
   * @param {string} text - 要匹配的文本
   * @param {number} startIndex - 开始位置（花括号 { 的位置）
   * @returns {string|null} 匹配到的内容（不包含花括号），如果失败返回 null
   */
  matchNestedBraces(text, startIndex) {
    if (text[startIndex] !== '{') {
      return null;
    }

    let depth = 0;
    let start = startIndex;
    let i = startIndex;

    while (i < text.length) {
      // 处理 LaTeX 命令（\后面跟字母）
      if (text[i] === '\\' && i + 1 < text.length) {
        // 跳过反斜杠
        i++;
        // 如果是字母，跳过整个命令名（如 \frac, \sqrt 等）
        if (/[a-zA-Z]/.test(text[i])) {
          while (i < text.length && /[a-zA-Z]/.test(text[i])) {
            i++;
          }
          // 不增加 i，因为循环末尾会 i++，但这里我们已经处理了反斜杠和命令名
          // 所以需要继续检查当前字符（可能是 {, }, 或其他）
          continue;
        } else {
          // 如果不是字母，跳过单个字符（如 \{, \}, \$, 等）
          i++;
          continue;
        }
      }
      
      if (text[i] === '{') {
        depth++;
      } else if (text[i] === '}') {
        depth--;
        if (depth === 0) {
          // 找到了匹配的结束花括号
          return text.substring(start + 1, i);
        }
      }
      i++;
    }

    return null; // 没有找到匹配的结束花括号
  }

  /**
   * 解析 LaTeX 文件内容
   * @param {string} latexContent - LaTeX 文件内容
   * @returns {Array} 解析后的题目数组
   */
  parse(latexContent) {
    this.questions = [];
    this.currentPart = null;
    this.currentQuestion = null;
    this.fullContent = latexContent; // 保存完整内容用于提取元数据

    // 移除注释
    latexContent = this.removeComments(latexContent);

    // 解析各个部分
    this.parseParts(latexContent);

    return this.questions;
  }

  /**
   * 移除 LaTeX 注释
   */
  removeComments(content) {
    return content.replace(/%.*$/gm, '');
  }

  /**
   * 解析 makepart 环境
   */
  parseParts(content) {
    // 匹配 \begin{makepart}...\end{makepart}
    // 支持两种格式：
    // 1. \begin{makepart}{type}[score] - type 在前，score 在后
    // 2. \begin{makepart}[info]{type}[score] - info 在前，type 在后，score 在最后
    // 3. \begin{makepart}[info]{type} - 没有 score
    const partRegex = /\\begin\{makepart\}(?:\[([^\]]*)\])?\{([^}]+)\}(?:\[([^\]]*)\])?(.*?)\\end\{makepart\}/gs;
    let match;

    while ((match = partRegex.exec(content)) !== null) {
      const partInfo = match[1] || '';
      const partType = match[2].trim();
      const partScore = match[3] || ''; // 部分级别的默认分数
      const partContent = match[4];

      // 解析部分级别的默认分数
      let defaultScore = 0;
      if (partScore && partScore.trim() !== '') {
        const parsedScore = parseInt(partScore.trim(), 10);
        if (!isNaN(parsedScore) && parsedScore >= 0) {
          defaultScore = parsedScore;
        }
      }

      this.currentPart = {
        type: partType,
        info: partInfo,
        defaultScore: defaultScore, // 保存默认分数
      };

      // 解析该部分中的题目，传入默认分数
      this.parseProblems(partContent, partType, defaultScore);
    }
  }

  /**
   * 解析 problem 环境
   * @param {string} content - 题目内容
   * @param {string} partType - 部分类型
   * @param {number} defaultScore - 部分级别的默认分数（如果题目没有指定分数，使用此默认值）
   */
  parseProblems(content, partType, defaultScore = 0) {
    // 匹配 \begin{problem}...\end{problem}
    // 使用非贪婪匹配，但要处理嵌套的 solution 环境
    const problemRegex = /\\begin\{problem\}(?:\[([^\]]*)\])?(.*?)\\end\{problem\}/gs;
    let match;

    while ((match = problemRegex.exec(content)) !== null) {
      // 解析分数：优先使用题目自己指定的分数，如果没有则使用部分级别的默认分数
      let score = defaultScore; // 默认使用部分级别的分数
      if (match[1] && match[1].trim() !== '') {
        const parsedScore = parseInt(match[1].trim(), 10);
        // 检查是否为有效数字
        if (!isNaN(parsedScore) && parsedScore >= 0) {
          score = parsedScore; // 题目自己指定了分数，优先使用
        }
      }
      let problemContent = match[2];

      const question = {
        type: this.mapPartTypeToQuestionType(partType),
        totalScore: score,
        questionText: '',
        correctAnswer: '',
        options: {},
        solution: '',
        subject: this.extractSubject(this.fullContent || content),
      };

      // 先解析解答（需要从完整内容中提取）
      this.parseSolution(problemContent, question);

      // 解析题目内容
      this.parseQuestionContent(problemContent, question);

      this.questions.push(question);
    }
  }

  /**
   * 将题型映射到数据库中的题目类型
   */
  mapPartTypeToQuestionType(partType) {
    const typeMap = {
      '填空题': '填空题',
      '选择题': '单选题',
      '判断题': '判断题',
      '计算题': '计算题',
      '解答题': '解答题',
      '证明题': '证明题',
      '作图题': '作图题',
    };
    return typeMap[partType] || partType;
  }

  /**
   * 解析题目内容
   */
  parseQuestionContent(content, question) {
    // 移除 problem 环境的开始和结束标记
    let text = content;

    // 提取选择题选项
    if (question.type === '单选题' || question.type === '多选题') {
      this.parseChoices(content, question);
    }

    // 提取填空题答案
    if (question.type === '填空题') {
      this.parseFillInAnswers(content, question);
    }

    // 提取选择题答案
    if (question.type === '单选题' || question.type === '多选题') {
      this.parsePickoutAnswer(content, question);
    }

    // 移除 solution 环境（使用非贪婪匹配处理嵌套）
    text = text.replace(/\\begin\{solution\}(?:\[[^\]]*\])?(?:\[[^\]]*\])?.*?\\end\{solution\}/gs, '');
    text = text.replace(/\\begin\{rmk\}.*?\\end\{rmk\}/gs, '');

    // 移除选择题选项
    text = text.replace(/\\begin\{abcd\}.*?\\end\{abcd\}/gs, '');

    // 移除答案标记，但保留占位符（支持嵌套花括号）
    // 使用循环来替换，以正确处理嵌套花括号
    let result = '';
    let i = 0;
    while (i < text.length) {
      // 检查是否是 \fillin{
      if (text.substring(i, i + 7) === '\\fillin{') {
        const braceStart = i + 7;
        const matched = this.matchNestedBraces(text, braceStart);
        if (matched !== null) {
          result += '\\fillin{}';
          i = braceStart + matched.length + 2; // 跳过匹配的内容和两个花括号
          continue;
        }
      }
      // 检查是否是 \fillout{
      if (text.substring(i, i + 8) === '\\fillout{') {
        const braceStart = i + 8;
        const matched = this.matchNestedBraces(text, braceStart);
        if (matched !== null) {
          result += '\\fillout{}';
          i = braceStart + matched.length + 2;
          continue;
        }
      }
      // 检查是否是 \pickout{
      if (text.substring(i, i + 8) === '\\pickout{') {
        const braceStart = i + 8;
        const matched = this.matchNestedBraces(text, braceStart);
        if (matched !== null) {
          // 不添加任何内容，直接跳过
          i = braceStart + matched.length + 2;
          continue;
        }
      }
      result += text[i];
      i++;
    }
    text = result;

    // 清理题目文本，保留数学公式
    question.questionText = this.cleanText(text).trim();
  }

  /**
   * 解析选择题选项
   */
  parseChoices(content, question) {
    const abcdRegex = /\\begin\{abcd\}(.*?)\\end\{abcd\}/s;
    const match = content.match(abcdRegex);

    if (match) {
      const optionsContent = match[1];
      // 匹配 \item 开头的选项
      const itemRegex = /\\item\s+(.*?)(?=\\item|$)/gs;
      let itemMatch;
      const options = {};

      let optionIndex = 0;
      const optionKeys = ['A', 'B', 'C', 'D', 'E', 'F'];

      while ((itemMatch = itemRegex.exec(optionsContent)) !== null && optionIndex < optionKeys.length) {
        const optionText = this.cleanText(itemMatch[1]).trim();
        if (optionText) {
          options[optionKeys[optionIndex]] = optionText;
          optionIndex++;
        }
      }

      question.options = options;
    }
  }

  /**
   * 解析填空题答案
   * 支持嵌套花括号，如 \fillin{\frac{1}{2}}
   */
  parseFillInAnswers(content, question) {
    const answers = [];
    let index = 0;

    // 匹配 \fillin{...}
    while (index < content.length) {
      const fillinIndex = content.indexOf('\\fillin{', index);
      if (fillinIndex === -1) break;

      const braceStart = fillinIndex + 7; // '\\fillin'.length
      const matched = this.matchNestedBraces(content, braceStart);
      if (matched !== null) {
        answers.push(matched.trim());
        index = braceStart + matched.length + 2; // 跳过匹配的内容和两个花括号
      } else {
        index = fillinIndex + 1;
      }
    }

    // 重置索引，匹配 \fillout{...}
    index = 0;
    while (index < content.length) {
      const filloutIndex = content.indexOf('\\fillout{', index);
      if (filloutIndex === -1) break;

      const braceStart = filloutIndex + 8; // '\\fillout'.length
      const matched = this.matchNestedBraces(content, braceStart);
      if (matched !== null) {
        answers.push(matched.trim());
        index = braceStart + matched.length + 2;
      } else {
        index = filloutIndex + 1;
      }
    }

    if (answers.length > 0) {
      question.correctAnswer = answers.length === 1 ? answers[0] : answers;
    }
  }

  /**
   * 解析选择题答案
   */
  parsePickoutAnswer(content, question) {
    const pickoutRegex = /\\pickout\{([^}]*)\}/;
    const match = content.match(pickoutRegex);

    if (match) {
      question.correctAnswer = match[1].trim();
    }
  }

  /**
   * 解析解答
   */
  parseSolution(content, question) {
    const solutionRegex = /\\begin\{solution\}(?:\[([^\]]*)\])?(?:\[([^\]]*)\])?(.*?)\\end\{solution\}/s;
    const match = content.match(solutionRegex);

    if (match) {
      question.solution = this.cleanText(match[3] || match[2] || match[1] || '').trim();
      // 如果答案为空，使用解答作为答案
      if (!question.correctAnswer && question.solution) {
        question.correctAnswer = question.solution;
      }
    }
  }

  /**
   * 提取科目信息（从文件内容中推断）
   * 注意：这个方法会在解析 parts 时被调用，需要传入完整的文件内容
   * 如果科目不在映射表中，直接使用原课程名称（自动添加新科目）
   */
  extractSubject(fullContent) {
    // 尝试从 \course 命令中提取
    const courseMatch = fullContent.match(/\\course\{([^}]+)\}/);
    if (courseMatch) {
      const course = courseMatch[1].trim();
      // 常用科目的映射（保持一致性）
      // 如果不在映射表中，直接使用原课程名称，系统会自动添加为新科目
      const subjectMap = {
        '高等代数': '高等代数',
        '解析几何': '解析几何',
        '高等几何': '高等几何',
        '微分几何': '微分几何',
        '线性代数II': '线性代数II',
      };
      // 如果课程在映射表中，使用映射值；否则直接使用课程名称（自动添加新科目）
      return subjectMap[course] || course;
    }
    return '解析几何'; // 默认值
  }

  /**
   * 清理文本，移除多余的空白和 LaTeX 命令
   */
  cleanText(text) {
    if (!text) return '';

    // 移除一些常见的 LaTeX 命令但保留内容
    text = text.replace(/\\noindent/g, '');
    text = text.replace(/\\par\b/g, '\n');
    text = text.replace(/\\ignorespaces/g, '');
    text = text.replace(/\\zihao\{[^}]+\}/g, '');
    text = text.replace(/\\heiti/g, '');
    
    // 移除行首的题号标记（如 "1.\,"）
    text = text.replace(/^\d+\.\\,?\s*/gm, '');
    
    // 规范化空白：多个连续空白变为单个，但保留换行
    text = text.replace(/[ \t]+/g, ' ');
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n'); // 多个连续换行变为两个

    return text.trim();
  }
}

/**
 * 生成 LaTeX 文件内容
 */
class LatexGenerator {
  constructor() {
    this.parts = {};
  }

  /**
   * 从题目数组生成 LaTeX 内容
   * @param {Array} questions - 题目数组
   * @param {Object} metadata - 元数据（学校、课程等）
   * @returns {string} LaTeX 文件内容
   */
  generate(questions, metadata = {}) {
    // 按题型分组
    const groupedQuestions = this.groupByType(questions);

    let latex = this.generateHeader(metadata);
    latex += '\n\\begin{document}\n';
    latex += '\\makehead\n';

    // 生成各个部分
    for (const [type, qs] of Object.entries(groupedQuestions)) {
      latex += this.generatePart(type, qs);
    }

    latex += '\\end{document}\n';
    return latex;
  }

  /**
   * 生成文件头部
   */
  generateHeader(metadata) {
    return `\\documentclass[]{article}
\\usepackage[nospace]{mathexam}
\\usepackage{hyperref}
\\usepackage[nameinlink]{cleveref}
\\crefname{figure}{图}{图}
\\renewcommand{\\labelenumi}{\\alph{enumi})}

\\university{${metadata.university || '西南大学'}}
\\school{${metadata.school || '数学与统计学院'}}
\\course{${metadata.course || '高等代数'}}
\\AorB{${metadata.AorB || 'A'}}
\\finalmiddle{${metadata.finalmiddle || '期末'}}
\\totaltime{${metadata.totaltime || '120'}}
\\openclose{${metadata.openclose || '闭卷'}}
\\degree{${metadata.degree || '本科'}}
\\totalstu{${metadata.totalstu || ''}}
\\major{${metadata.major || '数学与应用数学'}}
\\grade{${metadata.grade || '2017'}}
\\examiner{${metadata.examiner || ''}}
\\director{${metadata.director || ''}}
\\dean{${metadata.dean || ''}}
`;
  }

  /**
   * 按题型分组
   */
  groupByType(questions) {
    const grouped = {};
    for (const q of questions) {
      const type = this.mapQuestionTypeToPartType(q.type);
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(q);
    }
    return grouped;
  }

  /**
   * 将数据库中的题目类型映射到 LaTeX 题型
   */
  mapQuestionTypeToPartType(type) {
    const typeMap = {
      '填空题': '填空题',
      '单选题': '选择题',
      '多选题': '选择题',
      '判断题': '判断题',
      '计算题': '计算题',
      '解答题': '解答题',
      '证明题': '证明题',
      '作图题': '作图题',
    };
    return typeMap[type] || type;
  }

  /**
   * 生成一个题型部分
   */
  generatePart(type, questions) {
    const totalScore = questions.reduce((sum, q) => sum + (q.totalScore || 0), 0);
    const partInfo = `共${questions.length}题，共计${totalScore}分`;

    let latex = `\\begin{makepart}[${partInfo}]{${type}}\n`;

    for (const q of questions) {
      latex += this.generateProblem(q);
    }

    latex += '\\end{makepart}\n';
    return latex;
  }

  /**
   * 生成单个题目
   */
  generateProblem(question) {
    let latex = `  \\begin{problem}[${question.totalScore || 0}]\n`;

    // 生成题目文本
    latex += `    ${this.escapeLatex(question.questionText)}\n`;

    // 生成选择题选项
    if (question.type === '单选题' || question.type === '多选题') {
      if (question.options && Object.keys(question.options).length > 0) {
        latex += '    \\begin{abcd}\n';
        for (const [key, value] of Object.entries(question.options)) {
          if (value) {
            latex += `      \\item ${this.escapeLatex(value)}\n`;
          }
        }
        latex += '    \\end{abcd}\n';
        // 添加答案标记
        if (question.correctAnswer) {
          latex += `    \\pickout{${question.correctAnswer}}\n`;
        }
      }
    }

    // 生成填空题答案标记
    if (question.type === '填空题') {
      // 在题目文本中应该已经有 \fillin{}，这里只需要在解答中显示答案
    }

    // 生成解答
    if (question.solution || question.correctAnswer) {
      latex += '    \\begin{solution}\n';
      latex += `      ${this.escapeLatex(question.solution || question.correctAnswer || '')}\n`;
      latex += '    \\end{solution}\n';
    }

    latex += '  \\end{problem}\n';
    return latex;
  }

  /**
   * 转义 LaTeX 特殊字符
   * 注意：不转义数学公式中的内容（$...$ 和 $$...$$）
   */
  escapeLatex(text) {
    if (!text) return '';
    
    // 分割文本为数学公式部分和普通文本部分
    const parts = [];
    let lastIndex = 0;
    let inMath = false;
    let mathDelimiter = '';
    
    // 匹配 $...$ 或 $$...$$
    const mathRegex = /(\$\$?)(.*?)\1/g;
    let match;
    
    while ((match = mathRegex.exec(text)) !== null) {
      // 添加数学公式前的普通文本
      if (match.index > lastIndex) {
        const plainText = text.substring(lastIndex, match.index);
        parts.push({ type: 'plain', content: plainText });
      }
      
      // 添加数学公式（不转义）
      parts.push({ 
        type: 'math', 
        content: match[0] // 包含 $ 或 $$
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // 添加剩余的普通文本
    if (lastIndex < text.length) {
      const plainText = text.substring(lastIndex);
      parts.push({ type: 'plain', content: plainText });
    }
    
    // 如果没有数学公式，整个文本都是普通文本
    if (parts.length === 0) {
      parts.push({ type: 'plain', content: text });
    }
    
    // 转义普通文本部分
    return parts.map(part => {
      if (part.type === 'math') {
        return part.content; // 数学公式不转义
      } else {
        // 转义普通文本中的特殊字符
        return part.content
          .replace(/\\/g, '\\textbackslash{}')
          .replace(/\{/g, '\\{')
          .replace(/\}/g, '\\}')
          .replace(/\$/g, '\\$')
          .replace(/#/g, '\\#')
          .replace(/&/g, '\\&')
          .replace(/%/g, '\\%')
          .replace(/\^/g, '\\textasciicircum{}')
          .replace(/_/g, '\\_');
      }
    }).join('');
  }
}

module.exports = { LatexParser, LatexGenerator };

