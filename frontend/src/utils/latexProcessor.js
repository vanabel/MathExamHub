/**
 * LaTeX 文本处理工具
 * 用于在前端显示时处理 LaTeX 命令
 */

import axios from 'axios';

/**
 * 检查字符串是否在数学公式环境中（$...$, $$...$$, \[...\], \(...\), \begin{equation}...\end{equation}）
 */
function isInMathEnvironment(text, index) {
  const beforeText = text.substring(0, index);
  
  // 检查是否在 $...$ 中
  let dollarCount = 0;
  for (let i = 0; i < index; i++) {
    if (text[i] === '$' && (i === 0 || text[i - 1] !== '\\')) {
      dollarCount++;
    }
  }
  if (dollarCount % 2 === 1) return true;

  // 检查是否在 $$...$$ 中（连续两个$）
  const doubleDollarMatches = beforeText.match(/\$\$/g);
  if (doubleDollarMatches && doubleDollarMatches.length % 2 === 1) return true;

  // 检查是否在 \[...\] 中
  const openBrackets = (beforeText.match(/\\\[/g) || []).length;
  const closeBrackets = (beforeText.match(/\\\]/g) || []).length;
  if (openBrackets > closeBrackets) return true;

  // 检查是否在 \(...\) 中（行内数学公式）
  const openParens = (beforeText.match(/\\\(/g) || []).length;
  const closeParens = (beforeText.match(/\\\)/g) || []).length;
  if (openParens > closeParens) return true;

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
  let result = parts.map(part => {
    if (part.type === 'html') {
      // 处理自定义标签：<image> 和 <a>
      let content = part.content;
      
      // 处理 <image> 标签，转换为 <img> 或 <embed> 标签（PDF 使用 embed）
      const imageRegex = /<image\s+([^>]+)\s*\/?>/gi;
      content = content.replace(imageRegex, (match, attrs) => {
        // 解析属性
        const hrefMatch = attrs.match(/href=["']([^"']+)["']/);
        const idMatch = attrs.match(/id=["']([^"']+)["']/);
        const href = hrefMatch ? hrefMatch[1] : '';
        const id = idMatch ? idMatch[1] : '';
        
        // 构建文件 URL（假设文件在 /uploads/ 目录下）
        // 对文件名进行 URL 编码，确保中文字符正确处理
        // 使用完整的后端 URL，因为 PDF.js 需要完整的 URL
        const backendBaseURL = axios.defaults.baseURL || 'http://localhost:3000';
        const fileUrl = href ? `${backendBaseURL}/uploads/${encodeURIComponent(href)}` : '';
        
        // 检查是否是 PDF 文件
        const isPdf = href && /\.pdf$/i.test(href);
        
        if (isPdf) {
          // PDF 文件使用 PDF.js 渲染
          // 创建一个容器，使用 data 属性标记，稍后在 Vue 组件中初始化
          // 清理 ID，移除无效的 CSS 选择器字符（如冒号）
          let cleanId = (id || `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`).replace(/[^a-zA-Z0-9_-]/g, '-');
          const uniqueId = cleanId;
          return `
            <div class="pdf-container" data-pdf-url="${fileUrl}" data-pdf-id="${uniqueId}" style="width: 100%; border: 1px solid #ddd; border-radius: 4px; padding: 10px; background: #f5f5f5; margin: 10px 0;">
              <canvas id="pdf-canvas-${uniqueId}" class="pdf-canvas" style="max-width: 100%; display: block; margin: 0 auto;"></canvas>
              <div style="text-align: center; margin-top: 10px;">
                <a href="${fileUrl}" target="_blank" class="btn btn-sm btn-outline-primary" style="text-decoration: none;">
                  <i class="bi bi-download"></i> 下载/在新窗口打开 PDF
                </a>
              </div>
            </div>
          `;
        } else {
          // 图片文件使用 <img> 标签
          // 也使用完整的后端 URL，确保跨域访问正常
          const imgUrl = href ? `${backendBaseURL}/uploads/${encodeURIComponent(href)}` : '';
          return `<img src="${imgUrl}" id="${id}" alt="图片" class="latex-figure" style="max-width: 100%; height: auto;" />`;
        }
      });
      
      return content;
    } else {
      // 处理文本中的 LaTeX 命令
      return processQuestionText(part.content);
    }
  }).join('');
  
  // 处理 <a> 标签中的 href，确保链接正确
  // 注意：<a> 标签可能已经在文本中，需要确保它们被正确处理
  result = result.replace(/<a\s+href=["']#fig:([^"']+)["']>([^<]+)<\/a>/g, (match, id, text) => {
    // 保持链接格式，但确保 id 正确
    return `<a href="#fig:${id}" class="latex-ref">${text}</a>`;
  });
  
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

  // 1. 处理 \pickout{A} -> $\text{(A)}$（支持嵌套花括号）
  // 使用 \text{} 明确告诉 MathJax 这是文本，不是数学公式
  const pickoutRegex = /\\pickout\{/g;
  const pickoutReplacements = [];
  pickoutRegex.lastIndex = 0; // 重置正则表达式
  let match;
  
  while ((match = pickoutRegex.exec(processed)) !== null) {
    const startIndex = match.index;
    const braceStart = startIndex + 8; // '\\pickout'.length = 8
    if (braceStart < processed.length && processed[braceStart] === '{') {
      const content = matchNestedBraces(processed, braceStart);
      if (content !== null) {
        // 检查是否已经在数学环境中
        const inMath = isInMathEnvironment(processed, startIndex);
        if (!inMath) {
          pickoutReplacements.push({
            start: startIndex,
            end: braceStart + content.length + 2, // +2 因为要包含 { 和 }
            replacement: `$\\text{(${content})}$`
          });
        } else {
          // 如果已经在数学环境中，只使用 \text{}
          pickoutReplacements.push({
            start: startIndex,
            end: braceStart + content.length + 2,
            replacement: `\\text{(${content})}`
          });
        }
      }
    }
  }
  
  // 从后往前替换
  for (let i = pickoutReplacements.length - 1; i >= 0; i--) {
    const r = pickoutReplacements[i];
    processed = processed.substring(0, r.start) + r.replacement + processed.substring(r.end);
  }

  // 2. 处理 \( ... \) 行内数学公式 -> $ ... $
  processed = processed.replace(/\\\(/g, '$');
  processed = processed.replace(/\\\)/g, '$');

  // 3. 处理 \[ ... \] 数学公式 -> $$ ... $$
  processed = processed.replace(/\\\[/g, '$$');
  processed = processed.replace(/\\\]/g, '$$');

  // 4. 处理 \fillin{...}，移除内容中的 $，然后确保在数学环境中
  const fillinRegex = /\\fillin\{/g;
  const replacements = [];
  fillinRegex.lastIndex = 0; // 重置正则表达式
  
  while ((match = fillinRegex.exec(processed)) !== null) {
    const startIndex = match.index;
    // 检查是否在数学环境中
    const inMath = isInMathEnvironment(processed, startIndex);
    // 使用 matchNestedBraces 来正确匹配嵌套花括号
    const braceStart = startIndex + 7; // '\\fillin'.length = 7
    if (braceStart < processed.length && processed[braceStart] === '{') {
      const content = matchNestedBraces(processed, braceStart);
      if (content !== null) {
        // 检查内容是否包含 $...$ 模式（可能后面还有其他字符）
        let cleanContent = content;
        
        // 检查是否以 $ 开头（单个 $，不是 $$）
        if (content.trim().startsWith('$') && !content.trim().startsWith('$$')) {
          // 找到第一个 $ 后的匹配 $（不在转义序列中）
          let dollarStart = -1;
          let dollarEnd = -1;
          for (let i = 0; i < content.length; i++) {
            if (content[i] === '\\' && i + 1 < content.length) {
              i++; // 跳过转义字符
              continue;
            }
            if (content[i] === '$') {
              if (dollarStart === -1) {
                dollarStart = i;
              } else {
                dollarEnd = i;
                break;
              }
            }
          }
          
          if (dollarStart !== -1 && dollarEnd !== -1) {
            // 提取 $...$ 之间的内容，保留前后的字符
            const mathContent = content.substring(dollarStart + 1, dollarEnd);
            const beforeMath = content.substring(0, dollarStart);
            const afterMath = content.substring(dollarEnd + 1);
            cleanContent = beforeMath + mathContent + afterMath;
          }
        } else if (content.trim().startsWith('$$') && content.trim().endsWith('$$')) {
          // 处理 $$...$$ 的情况
          const contentTrimmed = content.trim();
          cleanContent = contentTrimmed.substring(2, contentTrimmed.length - 2);
        }
        
        // 如果命令已经在数学环境中，直接使用清理后的内容；否则添加 $
        replacements.push({
          start: startIndex,
          end: braceStart + content.length + 2, // +2 因为要包含 { 和 }
          replacement: inMath ? `\\fillin{${cleanContent}}` : `$\\fillin{${cleanContent}}$`
        });
      }
    }
  }
  
  // 从后往前替换，避免索引变化
  for (let i = replacements.length - 1; i >= 0; i--) {
    const r = replacements[i];
    processed = processed.substring(0, r.start) + r.replacement + processed.substring(r.end);
  }

  // 5. 处理 \fillout{...}，移除内容中的 $，然后确保在数学环境中
  const filloutRegex = /\\fillout\{/g;
  const filloutReplacements = [];
  filloutRegex.lastIndex = 0; // 重置正则表达式
  
  while ((match = filloutRegex.exec(processed)) !== null) {
    const startIndex = match.index;
    const inMath = isInMathEnvironment(processed, startIndex);
    // 使用 matchNestedBraces 来正确匹配嵌套花括号
    const braceStart = startIndex + 8; // '\\fillout'.length
    if (braceStart < processed.length && processed[braceStart] === '{') {
      const content = matchNestedBraces(processed, braceStart);
      if (content !== null) {
        // 检查内容是否包含 $...$ 模式（可能后面还有其他字符）
        let cleanContent = content;
        
        // 检查是否以 $ 开头（单个 $，不是 $$）
        if (content.trim().startsWith('$') && !content.trim().startsWith('$$')) {
          // 找到第一个 $ 后的匹配 $（不在转义序列中）
          let dollarStart = -1;
          let dollarEnd = -1;
          for (let i = 0; i < content.length; i++) {
            if (content[i] === '\\' && i + 1 < content.length) {
              i++; // 跳过转义字符
              continue;
            }
            if (content[i] === '$') {
              if (dollarStart === -1) {
                dollarStart = i;
              } else {
                dollarEnd = i;
                break;
              }
            }
          }
          
          if (dollarStart !== -1 && dollarEnd !== -1) {
            // 提取 $...$ 之间的内容，保留前后的字符
            const mathContent = content.substring(dollarStart + 1, dollarEnd);
            const beforeMath = content.substring(0, dollarStart);
            const afterMath = content.substring(dollarEnd + 1);
            cleanContent = beforeMath + mathContent + afterMath;
          }
        } else if (content.trim().startsWith('$$') && content.trim().endsWith('$$')) {
          // 处理 $$...$$ 的情况
          const contentTrimmed = content.trim();
          cleanContent = contentTrimmed.substring(2, contentTrimmed.length - 2);
        }
        
        // 如果命令已经在数学环境中，直接使用清理后的内容；否则添加 $
        filloutReplacements.push({
          start: startIndex,
          end: braceStart + content.length + 2, // +2 因为要包含 { 和 }
          replacement: inMath ? `\\fillout{${cleanContent}}` : `$\\fillout{${cleanContent}}$`
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

  // 处理 \pickout{A} -> A（答案中只保留内容，不添加括号）
  // 题目文本中的 \pickout{A} 会在 processQuestionText 中转换为 (A)
  const pickoutRegex = /\\pickout\{/g;
  const pickoutReplacements = [];
  pickoutRegex.lastIndex = 0; // 重置正则表达式
  let match;
  
  while ((match = pickoutRegex.exec(processed)) !== null) {
    const startIndex = match.index;
    const braceStart = startIndex + 8; // '\\pickout'.length = 8
    if (braceStart < processed.length && processed[braceStart] === '{') {
      const content = matchNestedBraces(processed, braceStart);
      if (content !== null) {
        pickoutReplacements.push({
          start: startIndex,
          end: braceStart + content.length + 2, // +2 因为要包含 { 和 }
          replacement: content // 答案中只保留内容，不添加括号
        });
      }
    }
  }
  
  // 从后往前替换
  for (let i = pickoutReplacements.length - 1; i >= 0; i--) {
    const r = pickoutReplacements[i];
    processed = processed.substring(0, r.start) + r.replacement + processed.substring(r.end);
  }

  // 处理 \fillin{...} 和 \fillout{...}
  // MathJax 已经定义了这些命令为 \underline{#1}，所以只需要确保它们在数学环境中
  // 如果内容已经在 $...$ 中，移除内容中的 $，然后确保整个命令在数学环境中
  const fillinRegex = /\\fillin\{/g;
  const fillinReplacements = [];
  fillinRegex.lastIndex = 0;
  
  while ((match = fillinRegex.exec(processed)) !== null) {
    const startIndex = match.index;
    const braceStart = startIndex + 7; // '\\fillin'.length = 7
    if (braceStart < processed.length && processed[braceStart] === '{') {
      const content = matchNestedBraces(processed, braceStart);
      if (content !== null) {
        // 检查命令本身是否已经在数学环境中
        const commandInMath = isInMathEnvironment(processed, startIndex);
        // 检查内容是否包含 $...$ 模式（可能后面还有其他字符）
        let cleanContent = content;
        
        // 检查是否以 $ 开头（单个 $，不是 $$）
        if (content.trim().startsWith('$') && !content.trim().startsWith('$$')) {
          // 找到第一个 $ 后的匹配 $（不在转义序列中）
          let dollarStart = -1;
          let dollarEnd = -1;
          for (let i = 0; i < content.length; i++) {
            if (content[i] === '\\' && i + 1 < content.length) {
              i++; // 跳过转义字符
              continue;
            }
            if (content[i] === '$') {
              if (dollarStart === -1) {
                dollarStart = i;
              } else {
                dollarEnd = i;
                break;
              }
            }
          }
          
          if (dollarStart !== -1 && dollarEnd !== -1) {
            // 提取 $...$ 之间的内容，保留前后的字符
            const mathContent = content.substring(dollarStart + 1, dollarEnd);
            const beforeMath = content.substring(0, dollarStart);
            const afterMath = content.substring(dollarEnd + 1);
            cleanContent = beforeMath + mathContent + afterMath;
          }
        } else if (content.trim().startsWith('$$') && content.trim().endsWith('$$')) {
          // 处理 $$...$$ 的情况
          const contentTrimmed = content.trim();
          cleanContent = contentTrimmed.substring(2, contentTrimmed.length - 2);
        }
        
        // 如果命令已经在数学环境中，直接使用清理后的内容；否则添加 $
        fillinReplacements.push({
          start: startIndex,
          end: braceStart + content.length + 2,
          replacement: commandInMath ? `\\fillin{${cleanContent}}` : `$\\fillin{${cleanContent}}$`
        });
      }
    }
  }
  
  for (let i = fillinReplacements.length - 1; i >= 0; i--) {
    const r = fillinReplacements[i];
    processed = processed.substring(0, r.start) + r.replacement + processed.substring(r.end);
  }

  const filloutRegex = /\\fillout\{/g;
  const filloutReplacements = [];
  filloutRegex.lastIndex = 0;
  
  while ((match = filloutRegex.exec(processed)) !== null) {
    const startIndex = match.index;
    const braceStart = startIndex + 8; // '\\fillout'.length = 8
    if (braceStart < processed.length && processed[braceStart] === '{') {
      const content = matchNestedBraces(processed, braceStart);
      if (content !== null) {
        // 检查命令本身是否已经在数学环境中
        const commandInMath = isInMathEnvironment(processed, startIndex);
        // 检查内容是否包含 $...$ 模式（可能后面还有其他字符）
        let cleanContent = content;
        
        // 检查是否以 $ 开头（单个 $，不是 $$）
        if (content.trim().startsWith('$') && !content.trim().startsWith('$$')) {
          // 找到第一个 $ 后的匹配 $（不在转义序列中）
          let dollarStart = -1;
          let dollarEnd = -1;
          for (let i = 0; i < content.length; i++) {
            if (content[i] === '\\' && i + 1 < content.length) {
              i++; // 跳过转义字符
              continue;
            }
            if (content[i] === '$') {
              if (dollarStart === -1) {
                dollarStart = i;
              } else {
                dollarEnd = i;
                break;
              }
            }
          }
          
          if (dollarStart !== -1 && dollarEnd !== -1) {
            // 提取 $...$ 之间的内容，保留前后的字符
            const mathContent = content.substring(dollarStart + 1, dollarEnd);
            const beforeMath = content.substring(0, dollarStart);
            const afterMath = content.substring(dollarEnd + 1);
            cleanContent = beforeMath + mathContent + afterMath;
          }
        } else if (content.trim().startsWith('$$') && content.trim().endsWith('$$')) {
          // 处理 $$...$$ 的情况
          const contentTrimmed = content.trim();
          cleanContent = contentTrimmed.substring(2, contentTrimmed.length - 2);
        }
        
        // 如果命令已经在数学环境中，直接使用清理后的内容；否则添加 $
        filloutReplacements.push({
          start: startIndex,
          end: braceStart + content.length + 2,
          replacement: commandInMath ? `\\fillout{${cleanContent}}` : `$\\fillout{${cleanContent}}$`
        });
      }
    }
  }
  
  for (let i = filloutReplacements.length - 1; i >= 0; i--) {
    const r = filloutReplacements[i];
    processed = processed.substring(0, r.start) + r.replacement + processed.substring(r.end);
  }

  // 处理 \( ... \) -> $ ... $
  processed = processed.replace(/\\\(/g, '$');
  processed = processed.replace(/\\\)/g, '$');

  // 处理 \[ ... \] -> $$ ... $$
  // 需要匹配完整的 \[...\] 块，避免破坏嵌套结构
  // 使用非贪婪匹配，但要处理嵌套的情况
  // 注意：需要处理可能包含换行符的情况
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (match, content) => {
    return `$$${content}$$`;
  });

  // 注意：答案不需要添加括号，保持原样
  // 题目文本中的 \pickout{A} 会在 processQuestionText 中转换为 (A)

  // 如果答案包含数学符号（如负号、分数、LaTeX 命令等）且不在数学环境中，包装为行内数学公式
  // 检查是否已经在数学环境中（$...$ 或 $$...$$ 或 \[...\] 或 \begin{align*}...\end{align*}）
  // MathJax 原生支持块级数学环境，不需要转换
  const trimmed = processed.trim();
  
  // 检查是否以 $$ 开头和结尾（块级数学公式）
  // 注意：需要检查开头和结尾，即使中间有换行符
  const startsWithDoubleDollar = trimmed.startsWith('$$');
  const endsWithDoubleDollar = trimmed.endsWith('$$');
  const isBlockMath = startsWithDoubleDollar && endsWithDoubleDollar;
  
  // 检查是否以 $ 开头和结尾（行内数学公式），但不是 $$
  const startsWithDollar = trimmed.startsWith('$');
  const endsWithDollar = trimmed.endsWith('$');
  const isInlineMath = startsWithDollar && endsWithDollar && !isBlockMath;
  
  // 检查是否还包含未处理的 \[ 或 \]
  const hasUnprocessedBrackets = processed.includes('\\[') || processed.includes('\\]');
  
  // 检查是否包含块级数学环境（MathJax 原生支持，不需要转换）
  // 支持的块级环境：align, alignat, aligned, equation, eqnarray, gather, multline, split
  const blockMathEnvs = ['align', 'alignat', 'aligned', 'equation', 'eqnarray', 'gather', 'multline', 'split'];
  const hasBlockMathEnv = blockMathEnvs.some(env => {
    return processed.includes(`\\begin{${env}`) || processed.includes(`\\begin{${env}*`);
  });
  
  // 检查文本中是否包含 $$ 或单个 $（即使不是整个文本）
  // 如果文本中包含任何 $ 符号，说明已经有数学公式标记，不需要再添加
  const containsDoubleDollar = processed.includes('$$');
  const containsSingleDollar = processed.includes('$');
  
  // 如果文本中包含 $$ 或整个文本已经被 $ 包围，就不需要再添加
  // 注意：如果文本中包含任何 $ 符号或块级数学环境，说明已经有数学公式，不需要再添加
  // 重要：只要包含任何 $ 符号（包括 $$ 或单个 $），就认为已经在数学环境中，不要添加额外的 $
  const isInMathEnv = isBlockMath || isInlineMath || hasUnprocessedBrackets || hasBlockMathEnv || containsDoubleDollar || containsSingleDollar;
  
  // 如果不在数学环境中，检查是否包含数学符号
  // 但是，如果答案已经包含任何 $ 符号（包括单个 $），不要添加额外的 $
  // 这是最后的检查，确保不会添加多余的 $
  if (!isInMathEnv) {
    // 检查是否包含数学符号：负号、分数、指数、LaTeX 命令等
    // 注意：在字符类 [] 中，某些字符不需要转义
    const hasMathSymbols = /[-+*/^_=<>()[\]\\]/.test(processed) || /\\[a-zA-Z]/.test(processed);
    
    if (hasMathSymbols) {
      // 包装为行内数学公式
      processed = `$${processed}$`;
    }
  }
  
  // 最后的安全检查：如果文本以 $$ $ 结尾（不应该出现），移除多余的 $
  // 这可以防止某些边缘情况
  const trimmedFinal = processed.trim();
  if (trimmedFinal.endsWith('$$ $')) {
    processed = processed.replace(/\$\$ \$$/, '$$');
  }

  return processed;
}

