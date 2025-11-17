/**
 * LaTeX 文本处理工具
 * 用于在前端显示时处理 LaTeX 命令
 */

/**
 * 检查字符串是否在数学公式环境中（$...$, $$...$$, \[...\], \begin{equation}...\end{equation}）
 */
function isInMathEnvironment(text, index) {
  // 检查是否在 $...$ 中
  let dollarCount = 0;
  for (let i = 0; i < index; i++) {
    if (text[i] === '$' && (i === 0 || text[i - 1] !== '\\')) {
      dollarCount++;
    }
  }
  if (dollarCount % 2 === 1) return true;

  // 检查是否在 $$...$$ 中（连续两个$）
  const beforeText = text.substring(0, index);
  const doubleDollarMatches = beforeText.match(/\$\$/g);
  if (doubleDollarMatches && doubleDollarMatches.length % 2 === 1) return true;

  // 检查是否在 \[...\] 中
  const openBrackets = (beforeText.match(/\\\[/g) || []).length;
  const closeBrackets = (beforeText.match(/\\\]/g) || []).length;
  if (openBrackets > closeBrackets) return true;

  // 检查是否在 \begin{equation}...\end{equation} 中
  const beginEq = (beforeText.match(/\\begin\{equation\}/g) || []).length;
  const endEq = (beforeText.match(/\\end\{equation\}/g) || []).length;
  if (beginEq > endEq) return true;

  return false;
}

/**
 * 匹配嵌套花括号内容（辅助函数）
 */
function matchNestedBraces(text, startIndex) {
  if (startIndex < 0 || startIndex >= text.length || text[startIndex] !== '{') return null;
  
  let depth = 1; // 从 1 开始，因为我们已经知道 startIndex 是 '{'
  let i = startIndex + 1; // 从 '{' 后面开始
  
  while (i < text.length) {
    // 处理反斜杠转义
    if (text[i] === '\\' && i + 1 < text.length) {
      i += 2; // 跳过反斜杠和下一个字符
      continue;
    }
    
    if (text[i] === '{') {
      depth++;
    } else if (text[i] === '}') {
      depth--;
      if (depth === 0) {
        // 找到了匹配的结束花括号
        return text.substring(startIndex + 1, i);
      }
    }
    i++;
  }
  
  return null;
}

/**
 * 解析 enumerate 环境并转换为 HTML 列表
 * 支持嵌套的 enumerate 环境
 * @param {string} text - 包含 enumerate 环境的文本
 * @returns {string} 转换后的文本（HTML 格式）
 */
function processEnumerate(text) {
  if (!text) return '';
  
  // 匹配 \begin{enumerate}...\end{enumerate}，支持嵌套
  // 使用递归方式处理嵌套的 enumerate
  function parseEnumerate(content, startPos) {
    // 使用正则表达式查找 \begin{enumerate}，更可靠
    const beginRegex = /\\begin\{enumerate\}/g;
    beginRegex.lastIndex = startPos;
    const beginMatch = beginRegex.exec(content);
    if (!beginMatch) return null;
    
    const enumerateStart = beginMatch.index;
    const beginPattern = '\\begin{enumerate}';
    const beginLen = beginPattern.length;
    let depth = 1;
    let i = enumerateStart + beginLen;
    let contentStart = i;
    
    // 找到匹配的 \end{enumerate}
    while (i < content.length && depth > 0) {
      // 检查是否是 \begin{enumerate}
      if (content.substring(i, i + beginLen) === beginPattern) {
        depth++;
        i += beginLen;
        continue;
      }
      // 检查是否是 \end{enumerate}
      const endPattern = '\\end{enumerate}';
      if (content.substring(i, i + endPattern.length) === endPattern) {
        depth--;
        if (depth === 0) {
          // 找到了匹配的结束标签
          const enumerateContent = content.substring(contentStart, i);
          return {
            start: enumerateStart,
            end: i + endPattern.length,
            content: enumerateContent
          };
        }
        i += endPattern.length;
        continue;
      }
      i++;
    }
    
    return null;
  }
  
  const replacements = [];
  let pos = 0;
  
  while (pos < text.length) {
    const enumerate = parseEnumerate(text, pos);
    if (!enumerate) break;
    
    // 解析 \item 项（需要处理嵌套的 enumerate）
    const items = [];
    const enumerateContent = enumerate.content;
    
    // 使用正则表达式匹配所有 \item，更准确
    // 匹配 \item 后面跟任意空白字符（包括换行符、空格、制表符等）
    const itemRegex = /\\item\s*/g;
    const itemMatches = [];
    let itemMatch;
    
    // 收集所有 \item 的位置
    while ((itemMatch = itemRegex.exec(enumerateContent)) !== null) {
      itemMatches.push({
        index: itemMatch.index,
        length: itemMatch[0].length // 包括 \item 和后面的空白字符
      });
    }
    
    // 根据匹配位置提取每个 item 的内容
    for (let i = 0; i < itemMatches.length; i++) {
      const currentMatch = itemMatches[i];
      const itemStart = currentMatch.index + currentMatch.length;
      
      // 找到下一个 \item 或结束位置
      let itemEnd;
      if (i < itemMatches.length - 1) {
        itemEnd = itemMatches[i + 1].index;
      } else {
        itemEnd = enumerateContent.length;
      }
      
      const itemContent = enumerateContent.substring(itemStart, itemEnd).trim();
      if (itemContent) {
        items.push(itemContent);
      }
    }
    
    // 生成 HTML 列表
    if (items.length > 0) {
      const htmlList = '<ol class="latex-enumerate">' + 
        items.map(item => {
          // 递归处理嵌套的 enumerate
          const processedItem = processEnumerate(item);
          // 处理 item 中的数学公式（但保留 HTML 结构）
          const finalItem = processedItem || item;
          return `<li>${finalItem}</li>`;
        }).join('') + 
        '</ol>';
      replacements.push({
        start: enumerate.start,
        end: enumerate.end,
        replacement: htmlList
      });
    }
    
    pos = enumerate.end;
  }
  
  // 从后往前替换
  let processed = text;
  for (let i = replacements.length - 1; i >= 0; i--) {
    const r = replacements[i];
    processed = processed.substring(0, r.start) + r.replacement + processed.substring(r.end);
  }
  
  return processed;
}

/**
 * 处理题目文本为 HTML（包含 enumerate 列表）
 * @param {string} text - 原始文本
 * @returns {string} 处理后的 HTML
 */
export function processQuestionTextToHTML(text) {
  if (!text) return '';

  // 先处理 enumerate 环境（转换为 HTML）
  let processed = processEnumerate(text);
  
  // 然后处理其他 LaTeX 命令，但需要避免处理 HTML 标签内的内容
  // 使用正则表达式分割 HTML 标签和文本内容
  const parts = [];
  const htmlTagRegex = /<[^>]+>/g;
  let match;
  
  // 收集所有 HTML 标签的位置
  const tags = [];
  while ((match = htmlTagRegex.exec(processed)) !== null) {
    tags.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[0]
    });
  }
  
  // 分割文本和 HTML 标签
  let currentIndex = 0;
  for (const tag of tags) {
    if (tag.start > currentIndex) {
      // 添加标签前的文本
      parts.push({ type: 'text', content: processed.substring(currentIndex, tag.start) });
    }
    // 添加 HTML 标签
    parts.push({ type: 'html', content: tag.content });
    currentIndex = tag.end;
  }
  
  // 添加剩余的文本
  if (currentIndex < processed.length) {
    parts.push({ type: 'text', content: processed.substring(currentIndex) });
  }
  
  // 如果没有 HTML 标签，整个都是文本
  if (parts.length === 0) {
    parts.push({ type: 'text', content: processed });
  }
  
  // 只处理文本部分，保留 HTML 标签
  const result = parts.map(part => {
    if (part.type === 'html') {
      return part.content;
    } else {
      // 处理文本中的 LaTeX 命令
      return processQuestionText(part.content);
    }
  }).join('');
  
  return result;
}

/**
 * 处理题目文本，转换 LaTeX 命令以便 MathJax 正确渲染
 * @param {string} text - 原始文本
 * @returns {string} 处理后的文本
 */
export function processQuestionText(text) {
  if (!text) return '';

  let processed = text;

  // 1. 处理 \pickout{A} -> (A)（支持嵌套花括号）
  const pickoutRegex = /\\pickout\{/g;
  const pickoutReplacements = [];
  pickoutRegex.lastIndex = 0; // 重置正则表达式
  let match;
  
  while ((match = pickoutRegex.exec(processed)) !== null) {
    const startIndex = match.index;
    const braceStart = startIndex + 8; // '\\pickout'.length = 8
    if (braceStart - 1 < processed.length && processed[braceStart - 1] === '{') {
      const content = matchNestedBraces(processed, braceStart - 1);
      if (content !== null) {
        pickoutReplacements.push({
          start: startIndex,
          end: braceStart + content.length + 1,
          replacement: `(${content})`
        });
      }
    }
  }
  
  // 从后往前替换
  for (let i = pickoutReplacements.length - 1; i >= 0; i--) {
    const r = pickoutReplacements[i];
    processed = processed.substring(0, r.start) + r.replacement + processed.substring(r.end);
  }

  // 2. 处理 \[ ... \] 数学公式 -> $$ ... $$
  processed = processed.replace(/\\\[/g, '$$');
  processed = processed.replace(/\\\]/g, '$$');

  // 3. 处理没有 $ 包围的 \fillin{...}，添加 $$
  // 需要匹配嵌套花括号，并检查是否在数学环境中
  const fillinRegex = /\\fillin\{/g;
  const replacements = [];
  fillinRegex.lastIndex = 0; // 重置正则表达式
  
  while ((match = fillinRegex.exec(processed)) !== null) {
    const startIndex = match.index;
    // 检查是否在数学环境中
    const inMath = isInMathEnvironment(processed, startIndex);
    if (!inMath) {
      // 使用 matchNestedBraces 来正确匹配嵌套花括号
      const braceStart = startIndex + 7; // '\\fillin'.length = 7
      if (braceStart - 1 < processed.length && processed[braceStart - 1] === '{') {
        const content = matchNestedBraces(processed, braceStart - 1);
        if (content !== null) {
          replacements.push({
            start: startIndex,
            end: braceStart + content.length + 1,
            replacement: `$\\fillin{${content}}$`
          });
        }
      }
    }
  }
  
  // 从后往前替换，避免索引变化
  for (let i = replacements.length - 1; i >= 0; i--) {
    const r = replacements[i];
    processed = processed.substring(0, r.start) + r.replacement + processed.substring(r.end);
  }

  // 4. 处理没有 $ 包围的 \fillout{...}，添加 $$
  const filloutRegex = /\\fillout\{/g;
  const filloutReplacements = [];
  filloutRegex.lastIndex = 0; // 重置正则表达式
  
  while ((match = filloutRegex.exec(processed)) !== null) {
    const startIndex = match.index;
    if (!isInMathEnvironment(processed, startIndex)) {
      // 使用 matchNestedBraces 来正确匹配嵌套花括号
      const braceStart = startIndex + 8; // '\\fillout'.length
      const content = matchNestedBraces(processed, braceStart - 1);
      if (content !== null) {
        filloutReplacements.push({
          start: startIndex,
          end: braceStart + content.length + 1,
          replacement: `$$\\fillout{${content}}$$`
        });
      }
    }
  }
  
  for (let i = filloutReplacements.length - 1; i >= 0; i--) {
    const r = filloutReplacements[i];
    processed = processed.substring(0, r.start) + r.replacement + processed.substring(r.end);
  }

  return processed;
}

/**
 * 处理答案文本
 * @param {string|Array} text - 原始答案文本（可能是字符串或数组）
 * @returns {string} 处理后的文本
 */
export function processAnswerText(text) {
  if (!text) return '';
  
  // 如果是数组，转换为字符串（用逗号分隔）
  if (Array.isArray(text)) {
    text = text.join(', ');
  }
  
  // 确保是字符串
  if (typeof text !== 'string') {
    text = String(text);
  }

  let processed = text;

  // 处理 \pickout{A} -> (A)（支持嵌套花括号）
  const pickoutRegex = /\\pickout\{/g;
  const pickoutReplacements = [];
  pickoutRegex.lastIndex = 0; // 重置正则表达式
  let match;
  
  while ((match = pickoutRegex.exec(processed)) !== null) {
    const startIndex = match.index;
    const braceStart = startIndex + 8; // '\\pickout'.length = 8
    if (braceStart - 1 < processed.length && processed[braceStart - 1] === '{') {
      const content = matchNestedBraces(processed, braceStart - 1);
      if (content !== null) {
        pickoutReplacements.push({
          start: startIndex,
          end: braceStart + content.length + 1,
          replacement: `(${content})`
        });
      }
    }
  }
  
  // 从后往前替换
  for (let i = pickoutReplacements.length - 1; i >= 0; i--) {
    const r = pickoutReplacements[i];
    processed = processed.substring(0, r.start) + r.replacement + processed.substring(r.end);
  }

  // 处理 \[ ... \] -> $$ ... $$
  processed = processed.replace(/\\\[/g, '$$');
  processed = processed.replace(/\\\]/g, '$$');

  return processed;
}

