/**
 * LaTeX 文本处理工具
 * 用于在前端显示时处理 LaTeX 命令
 */

const axios = { defaults: { baseURL: '/api' } };

/** Must match choiceOptions.formatChoiceOptionLabel — "(A)" not "A." */
function formatChoiceOptionLabel(letter) {
  const ch = String(letter ?? '').trim().toUpperCase();
  return ch ? `(${ch})` : '';
}

/** In JS String.replace, "$$" is one literal "$"; use "$$$$" for "$$". */
const DISPLAY_DOLLAR = '$$$$';

function escapeHtmlAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function stepScoreBadgeHtml(points) {
  const n = String(points).trim();
  return `<span class="step-score-line"><span class="step-score-badge">(${escapeHtmlAttr(n)}分)</span></span>`;
}

function backendUploadsBase() {
  const base = axios.defaults.baseURL || '/api';
  return `${String(base).replace(/\/$/, '')}/uploads`;
}

/**
 * Render structured question.images below the stem (list / detail / preview).
 */
export function renderQuestionImagesHtml(images) {
  if (!images || !images.length) return '';
  const base = backendUploadsBase();
  const blocks = images.map((img, index) => {
    const url = String(img?.url || '').trim();
    if (!url) return '';
    const fileUrl = `${base}/${encodeURIComponent(url)}`;
    const isPdf = /\.pdf$/i.test(url);
    const label = img.label ? String(img.label).replace(/^fig:/, '') : '';
    const caption = img.caption ? String(img.caption).trim() : '';
    const widthStyle = img.width ? `max-width:${escapeHtmlAttr(img.width)};` : 'max-width:100%;';
    let media = '';
    if (isPdf) {
      const uid = `pdf-${label || index}-${Date.now()}`;
      media = `<div class="pdf-container" data-pdf-url="${escapeHtmlAttr(fileUrl)}" data-pdf-id="${uid}" style="width:100%;border:1px solid #ddd;border-radius:4px;padding:10px;background:#f5f5f5;margin:10px 0;"><canvas id="pdf-canvas-${uid}" class="pdf-canvas" style="max-width:100%;display:block;margin:0 auto;"></canvas></div>`;
    } else {
      media = `<img src="${escapeHtmlAttr(fileUrl)}" alt="${escapeHtmlAttr(caption || label || '图片')}" class="latex-figure question-structured-image" style="${widthStyle}height:auto;display:block;margin:0.75rem auto;" />`;
    }
    const capHtml = caption
      ? `<div class="question-image-caption small text-muted text-center mt-1">${escapeHtmlAttr(caption)}</div>`
      : '';
    return `<figure class="question-structured-figure"${label ? ` id="fig:${escapeHtmlAttr(label)}"` : ''}>${media}${capHtml}</figure>`;
  }).filter(Boolean);
  if (!blocks.length) return '';
  return `<div class="question-structured-images">${blocks.join('')}</div>`;
}

/**
 * Convert \\[...\\] and \\(...\\) to $$ / $ delimiters (MathJax tex2jax style).
 */
export function convertLatexMathDelimiters(text) {
  if (!text) return '';
  let processed = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, content) => `$$${content}$$`);
  processed = processed.replace(/\\\(/g, '$');
  processed = processed.replace(/\\\)/g, '$');
  return processed;
}

/** Collapse stray single $ adjacent to display $$ pairs after delimiter conversion. */
function mergeStrayDisplayDollars(processed) {
  return processed
    .replace(/\$\$\s+\$/g, DISPLAY_DOLLAR)
    .replace(/\$\s+\$\$/g, DISPLAY_DOLLAR);
}

function imageTagFromIncludegraphicsFilename(filename) {
  const trimmed = String(filename || '').trim();
  if (!trimmed) return '';
  const nameWithoutExt = trimmed.replace(/\.(png|jpg|jpeg|gif|pdf)$/i, '');
  const fileExt = trimmed.match(/\.(png|jpg|jpeg|gif|pdf)$/i)?.[1] || 'pdf';
  const fullFileName = trimmed.includes('.') ? trimmed : `${trimmed}.${fileExt}`;
  return `<image href="${fullFileName}" id="fig:${nameWithoutExt}" />`;
}

/** figure / center / standalone \\includegraphics → custom <image> tags (before MathJax). */
function convertLatexGraphicsToImageTags(text) {
  if (!text) return '';
  let processed = text;

  processed = processed.replace(/\\begin\{figure\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{figure\}/gs, (match, content) => {
    const includegraphicsMatch = content.match(/\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/);
    const labelMatch = content.match(/\\label\{([^}]+)\}/);
    if (!includegraphicsMatch) return '';
    const tag = imageTagFromIncludegraphicsFilename(includegraphicsMatch[1]);
    if (labelMatch) {
      const label = labelMatch[1].replace(/^fig:/, '');
      return tag.replace(/id="[^"]*"/, `id="fig:${label}"`);
    }
    return tag;
  });

  processed = processed.replace(/\\begin\{center\}([\s\S]*?)\\end\{center\}/gs, (match, content) => {
    const includegraphicsMatch = content.match(/\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/);
    if (!includegraphicsMatch) return '';
    return imageTagFromIncludegraphicsFilename(includegraphicsMatch[1]);
  });

  processed = processed.replace(/\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g, (match, filename) => (
    imageTagFromIncludegraphicsFilename(filename)
  ));

  return processed;
}

function expandImageTagsToHtml(fragment) {
  if (!fragment || !/<image\s/i.test(fragment)) return fragment;
  const backendBaseURL = axios.defaults.baseURL || '/api';
  const imageRegex = /<image\s+([^>]+)\s*\/?>/gi;
  return fragment.replace(imageRegex, (match, attrs) => {
    const hrefMatch = attrs.match(/href=["']([^"']+)["']/);
    const idMatch = attrs.match(/id=["']([^"']+)["']/);
    const href = hrefMatch ? hrefMatch[1] : '';
    const id = idMatch ? idMatch[1] : '';
    const fileUrl = href ? `${backendBaseURL}/uploads/${encodeURIComponent(href)}` : '';
    const isPdf = href && /\.pdf$/i.test(href);
    if (isPdf) {
      let cleanId = (id || `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`).replace(/[^a-zA-Z0-9_-]/g, '-');
      return `
            <div class="pdf-container" data-pdf-url="${fileUrl}" data-pdf-id="${cleanId}" style="width: 100%; border: 1px solid #ddd; border-radius: 4px; padding: 10px; background: #f5f5f5; margin: 10px 0;">
              <canvas id="pdf-canvas-${cleanId}" class="pdf-canvas" style="max-width: 100%; display: block; margin: 0 auto;"></canvas>
              <div style="text-align: center; margin-top: 10px;">
                <a href="${fileUrl}" target="_blank" class="btn btn-sm btn-outline-primary" style="text-decoration: none;">
                  <i class="bi bi-download"></i> 下载/在新窗口打开 PDF
                </a>
              </div>
            </div>
          `;
    }
    const imgUrl = href ? `${backendBaseURL}/uploads/${encodeURIComponent(href)}` : '';
    return `<img src="${imgUrl}" id="${id}" alt="图片" class="latex-figure" style="max-width: 100%; height: auto;" />`;
  });
}

/**
 * Invoke fn on each substring that lies outside math delimiters ($...$, $$...$$).
 */
function mapOutsideMath(text, fn) {
  if (!text) return '';
  const parts = [];
  let i = 0;
  while (i < text.length) {
    if (text.startsWith('$$', i)) {
      const end = findClosingDoubleDollar(text, i + 2);
      if (end < 0) break;
      parts.push({ type: 'math', content: text.slice(i, end) });
      i = end;
      continue;
    }
    if (text[i] === '$' && text[i - 1] !== '\\') {
      const end = findClosingSingleDollar(text, i + 1);
      if (end < 0) {
        parts.push({ type: 'text', content: text.slice(i) });
        break;
      }
      parts.push({ type: 'math', content: text.slice(i, end) });
      i = end;
      continue;
    }
    const nextDd = text.indexOf('$$', i);
    const nextSd = text.indexOf('$', i);
    let next = text.length;
    if (nextDd >= 0) next = Math.min(next, nextDd);
    if (nextSd >= 0) next = Math.min(next, nextSd);
    if (next > i) {
      parts.push({ type: 'text', content: text.slice(i, next) });
    }
    i = next === i ? i + 1 : next;
  }
  return parts
    .map((p) => (p.type === 'math' ? p.content : fn(p.content)))
    .join('');
}

function findClosingDoubleDollar(text, from) {
  for (let j = from; j < text.length - 1; j++) {
    if (text[j] === '\\' && text[j + 1] === '$') {
      j++;
      continue;
    }
    if (text.startsWith('$$', j)) return j + 2;
  }
  return -1;
}

function findClosingSingleDollar(text, from) {
  for (let j = from; j < text.length; j++) {
    if (text[j] === '\\' && j + 1 < text.length) {
      j++;
      continue;
    }
    if (text[j] === '$' && !text.startsWith('$$', j)) return j + 1;
  }
  return -1;
}

function replaceTextCommand(text, command, htmlTag) {
  const open = `\\${command}{`;
  let result = '';
  let i = 0;
  while (i < text.length) {
    const idx = text.indexOf(open, i);
    if (idx < 0) {
      result += text.slice(i);
      break;
    }
    result += text.slice(i, idx);
    const braceStart = idx + open.length - 1;
    const inner = matchNestedBraces(text, braceStart);
    if (inner === null) {
      result += text.slice(idx, idx + open.length);
      i = idx + open.length;
      continue;
    }
    const end = braceStart + inner.length + 2;
    result += `<${htmlTag}>${inner}</${htmlTag}>`;
    i = end;
  }
  return result;
}

function applyTextModeFormatting(text) {
  return mapOutsideMath(text, (segment) => {
    let s = replaceTextCommand(segment, 'emph', 'em');
    s = replaceTextCommand(s, 'textbf', 'strong');
    return s;
  });
}

/**
 * Replace \\eqref{label} with numbered refs or Chinese fallback (never raw \\eqref / (???)).
 */
function processEqref(text) {
  if (!text || !/\\eqref\{/.test(text)) return text;
  const labelToNum = new Map();
  let eqNum = 0;
  text.replace(/\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g, (_, body) => {
    const labelMatch = body.match(/\\label\{([^}]+)\}/);
    if (labelMatch) {
      eqNum += 1;
      labelToNum.set(labelMatch[1], eqNum);
    }
    return _;
  });
  return text.replace(/\\eqref\{([^}]+)\}/g, (match, label) => {
    const num = labelToNum.get(label);
    if (num != null) return `$\\text{(${num})}$`;
    return '上式';
  });
}

function rangeContains(ranges, index) {
  return ranges.some((r) => index >= r.start && index < r.end);
}

/** Collect contiguous math spans ($$, $, and standalone ams envs not nested in $$). */
function collectMathRanges(processed) {
  const mathRanges = [];

  let i = 0;
  while (i < processed.length) {
    if (processed.startsWith('$$', i)) {
      const end = findClosingDoubleDollar(processed, i + 2);
      if (end < 0) break;
      mathRanges.push({ start: i, end, type: 'block' });
      i = end;
      continue;
    }
    i++;
  }

  const envRegex = /\\begin\{(align|alignat|aligned|equation|eqnarray|gather|multline|split)\*?\}/g;
  let envMatch;
  while ((envMatch = envRegex.exec(processed)) !== null) {
    if (rangeContains(mathRanges, envMatch.index)) continue;
    const envName = envMatch[1];
    const startIndex = envMatch.index;
    const endPattern = new RegExp(`\\\\end\\{${envName}\\*?\\}`, 'g');
    endPattern.lastIndex = startIndex + envMatch[0].length;
    const endMatch = endPattern.exec(processed);
    if (endMatch) {
      const endIndex = endMatch.index + endMatch[0].length;
      if (!rangeContains(mathRanges, startIndex)) {
        mathRanges.push({ start: startIndex, end: endIndex, type: 'env' });
      }
    }
  }

  for (let pos = 0; pos < processed.length; pos++) {
    if (processed.startsWith('$$', pos)) continue;
    if (processed[pos] !== '$') continue;
    if (rangeContains(mathRanges, pos)) continue;
    const end = findClosingSingleDollar(processed, pos + 1);
    if (end > pos + 1) {
      mathRanges.push({ start: pos, end, type: 'inline' });
      pos = end - 1;
    }
  }

  mathRanges.sort((a, b) => a.start - b.start);
  const merged = [];
  for (const r of mathRanges) {
    if (merged.length && r.start < merged[merged.length - 1].end) continue;
    merged.push(r);
  }
  return merged;
}

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

  // 检查是否在 \begin{align}...\end{align} 或 \begin{align*}...\end{align*} 中
  const beginAlign = (beforeText.match(/\\begin\{align\*?\}/g) || []).length;
  const endAlign = (beforeText.match(/\\end\{align\*?\}/g) || []).length;
  if (beginAlign > endAlign) return true;

  // 检查是否在 \begin{alignat}...\end{alignat} 中
  const beginAlignat = (beforeText.match(/\\begin\{alignat\*?\}/g) || []).length;
  const endAlignat = (beforeText.match(/\\end\{alignat\*?\}/g) || []).length;
  if (beginAlignat > endAlignat) return true;

  // 检查其他常见的数学环境
  const mathEnvs = ['gather', 'multline', 'split', 'eqnarray', 'aligned'];
  for (const env of mathEnvs) {
    const beginPattern = new RegExp(`\\\\begin\\{${env}\\*?\\}`, 'g');
    const endPattern = new RegExp(`\\\\end\\{${env}\\*?\\}`, 'g');
    const beginMatches = (beforeText.match(beginPattern) || []).length;
    const endMatches = (beforeText.match(endPattern) || []).length;
    if (beginMatches > endMatches) return true;
  }

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

const CHOICE_LIST_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function shouldRenderChoiceListLabels(opts, itemCount) {
  return opts.choiceOptionLabels && opts.depth === 0 && itemCount >= 2 && itemCount <= 8;
}

function buildChoiceListHtml(items, renderItem, childOpts) {
  const htmlItems = items
    .map((item, index) => {
      const label = CHOICE_LIST_LABELS[index] || String.fromCharCode(65 + index);
      const body = renderItem(item, childOpts) || item;
      const displayLabel = formatChoiceOptionLabel(label);
      return `<div class="mathexam-abcd-item latex-choice-option-item"><span class="mathexam-abcd-label choice-option-label">${displayLabel}</span> <span class="mathexam-abcd-body">${body}</span></div>`;
    })
    .join('');
  return `<div class="mathexam-abcd latex-choice-options">${htmlItems}</div>`;
}

/**
 * 解析 enumerate 环境并转换为 HTML 列表
 * 支持嵌套的 enumerate 环境
 * @param {string} text - 包含 enumerate 环境的文本
 * @param {{ choiceOptionLabels?: boolean, depth?: number }} opts
 * @returns {string} 转换后的文本（HTML 格式）
 */
function processEnumerate(text, opts = {}) {
  if (!text) return '';
  const depth = opts.depth ?? 0;
  const childOpts = { ...opts, depth: depth + 1 };
  
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
    
    if (items.length > 0) {
      let htmlList;
      if (shouldRenderChoiceListLabels({ ...opts, depth }, items.length)) {
        htmlList = buildChoiceListHtml(items, (item) => processEnumerate(item, childOpts));
      } else {
        htmlList = '<ol class="latex-enumerate">'
          + items.map((item) => {
            const processedItem = processEnumerate(item, childOpts);
            const finalItem = processedItem || item;
            return `<li>${finalItem}</li>`;
          }).join('')
          + '</ol>';
      }
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
 * Parse \\begin{itemize}…\\end{itemize} into HTML lists (answers / stems).
 */
function processItemize(text, opts = {}) {
  if (!text) return '';
  const depth = opts.depth ?? 0;
  const childOpts = { ...opts, depth: depth + 1 };

  function parseItemize(content, startPos) {
    const beginRegex = /\\begin\{itemize\}/g;
    beginRegex.lastIndex = startPos;
    const beginMatch = beginRegex.exec(content);
    if (!beginMatch) return null;

    const itemizeStart = beginMatch.index;
    const beginPattern = '\\begin{itemize}';
    const beginLen = beginPattern.length;
    let depth = 1;
    let i = itemizeStart + beginLen;
    const contentStart = i;

    while (i < content.length && depth > 0) {
      if (content.substring(i, i + beginLen) === beginPattern) {
        depth++;
        i += beginLen;
        continue;
      }
      const endPattern = '\\end{itemize}';
      if (content.substring(i, i + endPattern.length) === endPattern) {
        depth--;
        if (depth === 0) {
          return {
            start: itemizeStart,
            end: i + endPattern.length,
            content: content.substring(contentStart, i),
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
    const block = parseItemize(text, pos);
    if (!block) break;

    const itemRegex = /\\item\s*/g;
    const itemMatches = [];
    let itemMatch;
    while ((itemMatch = itemRegex.exec(block.content)) !== null) {
      itemMatches.push({ index: itemMatch.index, length: itemMatch[0].length });
    }

    const items = [];
    for (let k = 0; k < itemMatches.length; k++) {
      const itemStart = itemMatches[k].index + itemMatches[k].length;
      const itemEnd = k < itemMatches.length - 1 ? itemMatches[k + 1].index : block.content.length;
      const itemContent = block.content.substring(itemStart, itemEnd).trim();
      if (itemContent) items.push(itemContent);
    }

    if (items.length > 0) {
      let htmlList;
      if (shouldRenderChoiceListLabels({ ...opts, depth }, items.length)) {
        htmlList = buildChoiceListHtml(items, (item) => processItemize(item, childOpts));
      } else {
        htmlList = '<ul class="latex-itemize">'
          + items.map((item) => {
            const processedItem = processItemize(item, childOpts);
            return `<li>${processedItem || item}</li>`;
          }).join('')
          + '</ul>';
      }
      replacements.push({ start: block.start, end: block.end, replacement: htmlList });
    }

    pos = block.end;
  }

  let processed = text;
  for (let i = replacements.length - 1; i >= 0; i--) {
    const r = replacements[i];
    processed = processed.substring(0, r.start) + r.replacement + processed.substring(r.end);
  }
  return processed;
}

/**
 * mathexam 判断题 / 选择题选项环境 → HTML（MathJax 无法直接渲染的部分）
 */
function processMathexamEnvironments(text) {
  if (!text) return '';

  let processed = text;
  processed = processed.replace(/\\true\b/g, '<span class="mathexam-judgment mathexam-true" aria-label="正确">✓</span>');
  processed = processed.replace(/\\false\b/g, '<span class="mathexam-judgment mathexam-false" aria-label="错误">✗</span>');

  processed = processed.replace(/\\begin\{abcd\}(.*?)\\end\{abcd\}/gs, (match, content) => {
    const itemRegex = /\\item\s+(.*?)(?=\\item|$)/gs;
    const items = [];
    let itemMatch;
    while ((itemMatch = itemRegex.exec(content)) !== null) {
      const body = itemMatch[1].trim();
      if (body) items.push(body);
    }
    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
    const htmlItems = items
      .map((item, index) => {
        const label = labels[index] || String.fromCharCode(65 + index);
        const displayLabel = formatChoiceOptionLabel(label);
        return `<div class="mathexam-abcd-item"><span class="mathexam-abcd-label choice-option-label">${displayLabel}</span> <span class="mathexam-abcd-body">${item}</span></div>`;
      })
      .join('');
    return `<div class="mathexam-abcd">${htmlItems}</div>`;
  });

  return processed;
}

/**
 * 处理题目文本为 HTML（包含 enumerate 列表）
 * @param {string} text - 原始文本
 * @param {string} originalLaTeX - 原始 LaTeX 代码（可选，用于提取 \score 等命令）
 * @returns {string} 处理后的 HTML
 */
export function processQuestionTextToHTML(text, originalLaTeX = null, options = {}) {
  if (!text) return '';

  const {
    hasOptions = false,
    mode = 'question',
    choiceOptionLabels = false,
    questionType = '',
  } = options;
  const useChoiceLabels = choiceOptionLabels
    || (mode === 'question' && (questionType === '单选题' || questionType === '多选题'))
    || hasOptions
    || (originalLaTeX && /\\begin\{abcd\}/.test(originalLaTeX))
    || /\\pickout/.test(`${text || ''}${originalLaTeX || ''}`);
  const listRenderOpts = { choiceOptionLabels: useChoiceLabels, depth: 0 };

  // 先处理原始的 LaTeX 代码（\includegraphics 和 \ref）
  // 如果文本包含原始的 LaTeX 命令而不是 <image> 标签，需要先转换
  let processed = text;
  
  // 在分割 HTML 和文本之前，先处理 \score 命令
  // 这样可以确保 \score 命令不会被错误地分割到 HTML 标签中
  // 如果 questionText 中没有 \score 命令，但 originalLaTeX 中有，从 originalLaTeX 中提取
  // 注意：匹配 score{（可能没有反斜杠）或 \score{ 或 \\score{
  const hasScoreInText = /(\\*)?score\{/.test(processed);
  if (originalLaTeX && !hasScoreInText && /(\\*)?score\{/.test(originalLaTeX)) {
    // 从 originalLaTeX 中提取所有 \score 命令（匹配 score{ 或 \score{ 或 \\score{）
    const originalScoreRegex = /(\\*)?score\{([^}]+)\}/g;
    let originalScoreMatch;
    const scores = [];
    while ((originalScoreMatch = originalScoreRegex.exec(originalLaTeX)) !== null) {
      scores.push(originalScoreMatch[2]); // 第二个捕获组是内容
    }
    // 如果找到 score，在文本末尾添加（如果文本中没有）
    if (scores.length > 0) {
      // 添加所有找到的 score 命令（保持原始顺序）
      // 但只在文本末尾添加，避免重复
      const lastScore = scores[scores.length - 1];
      processed += ` \\score{${lastScore}}`;
    }
  }
  
  // 处理文本中的所有 \score 命令（包括刚从 originalLaTeX 中添加的）
  // 注意：需要在任何 HTML 标签处理之前完成
  // 匹配 score{...}（可能没有反斜杠，因为后端可能移除了）
  // 同时也匹配 \score{...} 或 \\score{...}（带反斜杠的情况）
  // 使用更灵活的正则表达式，匹配 "score{" 或 "\score{" 或 "\\score{"
  
  // 使用更直接的方法：先匹配所有可能的形式
  // 尝试匹配 \score{...} 或 score{...}
  let scoreRegex = /\\score\{([^}]+)\}/g;
  let scoreMatches = [];
  let scoreMatch;
  scoreRegex.lastIndex = 0;
  
  while ((scoreMatch = scoreRegex.exec(processed)) !== null) {
    scoreMatches.push({
      match: scoreMatch[0],
      start: scoreMatch.index,
      end: scoreMatch.index + scoreMatch[0].length,
      content: scoreMatch[1]
    });
  }
  
  // 如果没有匹配到，尝试匹配没有反斜杠的 score{...}
  if (scoreMatches.length === 0) {
    scoreRegex = /score\{([^}]+)\}/g;
    scoreRegex.lastIndex = 0;
    while ((scoreMatch = scoreRegex.exec(processed)) !== null) {
      // 检查前面是否有未闭合的 HTML 标签
      const beforeMatch = processed.substring(0, scoreMatch.index);
      const openTags = (beforeMatch.match(/<[^/][^>]*>/g) || []).length;
      const closeTags = (beforeMatch.match(/<\/[^>]+>/g) || []).length;
      const inHtmlTag = openTags > closeTags;
      
      // 如果不在 HTML 标签内，则处理
      if (!inHtmlTag) {
        // 检查前面不是反斜杠（避免重复匹配）
        if (scoreMatch.index === 0 || processed[scoreMatch.index - 1] !== '\\') {
          scoreMatches.push({
            match: scoreMatch[0],
            start: scoreMatch.index,
            end: scoreMatch.index + scoreMatch[0].length,
            content: scoreMatch[1]
          });
        }
      }
    }
  }
  
  // 从后往前替换，避免索引变化
  for (let i = scoreMatches.length - 1; i >= 0; i--) {
    const m = scoreMatches[i];
    const replacement = `<span class="score-fill" style="display: inline-block; width: 100%; white-space: nowrap;"><span class="score-dots" style="display: inline-block; width: calc(100% - 4em); overflow: hidden; vertical-align: bottom; border-bottom: 1px dotted #000; margin-right: 0.5em; height: 1.2em;"></span><span style="display: inline-block; white-space: normal;">$$(${m.content}')$$</span></span>`;
    processed = processed.substring(0, m.start) + replacement + processed.substring(m.end);
  }
  
  processed = convertLatexGraphicsToImageTags(processed);

  // 处理 \ref{fig:xxx} 命令
  const refRegex = /\\ref\{([^}]+)\}/g;
  processed = processed.replace(refRegex, (match, label) => {
    const labelPart = label.replace(/^fig:/, '');
    // 提取数字部分作为显示文本
    const numMatch = labelPart.match(/(\d+)/);
    const displayText = numMatch ? numMatch[1] : labelPart;
    return `<a href="#fig:${labelPart}">${displayText}</a>`;
  });

  processed = applyTextModeFormatting(processed);
  processed = processMathexamEnvironments(processed);
  if (originalLaTeX && !hasOptions && !processed.includes('mathexam-abcd')) {
    const abcdMatch = originalLaTeX.match(/\\begin\{abcd\}[\s\S]*?\\end\{abcd\}/);
    if (abcdMatch) {
      processed = `${processed}\n${processMathexamEnvironments(abcdMatch[0])}`;
    }
  }

  processed = processEnumerate(processed, listRenderOpts);
  processed = processItemize(processed, listRenderOpts);
  
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
      
      return expandImageTagsToHtml(content);
    } else {
      // 处理文本中的 LaTeX 命令
      let processedPart = processQuestionText(part.content, { mode });
      // 处理数学环境中的 score 标记
      // 将 \text{<score-in-math>5</score-in-math>} 替换为点填充 HTML
      processedPart = processedPart.replace(/\\text\{<score-in-math>([^<]+)<\/score-in-math>\}/g, (match, content) => {
        return `<span class="score-fill" style="display: inline-block; width: 100%; white-space: nowrap;"><span class="score-dots" style="display: inline-block; width: calc(100% - 4em); overflow: hidden; vertical-align: bottom; border-bottom: 1px dotted #000; margin-right: 0.5em; height: 1.2em;"></span><span style="display: inline-block; white-space: normal;">$$(${content}')$$</span></span>`;
      });
      return processedPart;
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
export function processQuestionText(text, options = {}) {
  if (!text) return '';

  const { mode = 'question' } = options;
  let processed = text;

  // 0. 先处理 \score{5} 命令（必须在数学公式转换之前处理）
  // 因为 \score 可能在数学公式环境中，需要先提取出来
  // 匹配单反斜杠或双反斜杠（因为文本可能被转义）
  const scoreRegex = /[\\]{1,2}score\{/g;
  const scoreReplacements = [];
  scoreRegex.lastIndex = 0;
  let match;
  
  while ((match = scoreRegex.exec(processed)) !== null) {
    const startIndex = match.index;
    const matchLength = match[0].length; // 实际匹配的长度（可能是 '\\score{' 或 '\\\score{'）
    const braceStart = startIndex + matchLength - 1; // 减去 '{' 的位置
    if (braceStart < processed.length && processed[braceStart] === '{') {
      const content = matchNestedBraces(processed, braceStart);
      if (content !== null) {
        // 检查是否在数学公式环境中（检查 \[, \], $$, $, \begin{align}, 等）
        const inMath = isInMathEnvironment(processed, startIndex);
        
        // 生成点填充 + $(分数')$ 
        // 如果在数学公式环境中，使用 LaTeX 的 \text 命令包装
        if (inMath) {
          // 在数学环境中，使用 \text 包装，但点填充效果需要在数学环境外实现
          // 所以我们需要将 \score 移到数学环境外
          // 但这样会很复杂，所以我们使用一个标记，稍后在 HTML 处理时替换
          // 暂时使用 \text 包装，但标记为需要特殊处理
          scoreReplacements.push({
            start: startIndex,
            end: braceStart + content.length + 2,
            replacement: `\\text{<score-marker>${content}</score-marker>}`
          });
        } else {
          // 不在数学环境中，使用 HTML 实现点填充
          scoreReplacements.push({
            start: startIndex,
            end: braceStart + content.length + 2,
            replacement: `<span class="score-fill" style="display: inline-block; width: 100%; white-space: nowrap;"><span class="score-dots" style="display: inline-block; width: calc(100% - 4em); overflow: hidden; vertical-align: bottom; border-bottom: 1px dotted #000; margin-right: 0.5em; height: 1.2em;"></span><span style="display: inline-block; white-space: normal;">$$(${content}')$$</span></span>`
          });
        }
      }
    }
  }
  
  // 从后往前替换
  for (let i = scoreReplacements.length - 1; i >= 0; i--) {
    const r = scoreReplacements[i];
    processed = processed.substring(0, r.start) + r.replacement + processed.substring(r.end);
  }

  // 1. 处理 \pickout{A}：题干预览隐藏答案，教师/答案模式可显示
  const pickoutRegex = /\\pickout\{/g;
  const pickoutReplacements = [];
  pickoutRegex.lastIndex = 0;

  match = null;
  while ((match = pickoutRegex.exec(processed)) !== null) {
    const startIndex = match.index;
    const braceStart = startIndex + 8;
    if (braceStart < processed.length && processed[braceStart] === '{') {
      const content = matchNestedBraces(processed, braceStart);
      if (content !== null) {
        const inMath = isInMathEnvironment(processed, startIndex);
        const showAnswer = mode === 'answer';
        const display = showAnswer ? content : '　　';
        const replacement = inMath
          ? `\\text{(${display})}`
          : `$\\text{(${display})}$`;
        pickoutReplacements.push({
          start: startIndex,
          end: braceStart + content.length + 2,
          replacement,
        });
      }
    }
  }
  
  // 从后往前替换
  for (let i = pickoutReplacements.length - 1; i >= 0; i--) {
    const r = pickoutReplacements[i];
    processed = processed.substring(0, r.start) + r.replacement + processed.substring(r.end);
  }

  // 2–3. 数学定界符
  processed = convertLatexMathDelimiters(processed);
  processed = mergeStrayDisplayDollars(processed);

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
        
        const fillBody = mode === 'question' ? '' : cleanContent;
        replacements.push({
          start: startIndex,
          end: braceStart + content.length + 2,
          replacement: inMath ? `\\fillin{${fillBody}}` : `$\\fillin{${fillBody}}$`,
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
        
        const fillBody = mode === 'question' ? '' : cleanContent;
        filloutReplacements.push({
          start: startIndex,
          end: braceStart + content.length + 2,
          replacement: inMath ? `\\fillout{${fillBody}}` : `$\\fillout{${fillBody}}$`,
        });
      }
    }
  }
  
  for (let i = filloutReplacements.length - 1; i >= 0; i--) {
    const r = filloutReplacements[i];
    processed = processed.substring(0, r.start) + r.replacement + processed.substring(r.end);
  }

  // 注意：\score 命令已经在步骤 0 中处理过了，这里不需要再次处理
  // 但需要处理数学环境中的 score 标记
  processed = processed.replace(/\\text\{<score-marker>([^<]+)<\/score-marker>\}/g, (match, content) => {
    // 将标记转换为可以在数学环境中使用的格式
    return `\\text{<score-in-math>${content}</score-in-math>}`;
  });

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

  processed = convertLatexMathDelimiters(processed);

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
  
  // 检查是否包含块级数学环境（MathJax 原生支持，不需要转换）
  // 支持的块级环境：align, alignat, aligned, equation, eqnarray, gather, multline, split
  const blockMathEnvs = [
    'align', 'alignat', 'aligned', 'equation', 'eqnarray', 'gather', 'multline', 'split',
    'pmatrix', 'bmatrix', 'vmatrix', 'matrix', 'cases', 'smallmatrix',
  ];
  const hasBlockMathEnv = blockMathEnvs.some(env => {
    return processed.includes(`\\begin{${env}`) || processed.includes(`\\begin{${env}*`);
  });
  const hasHtmlTags = /<[a-z][^>]*>/i.test(processed);

  // 检查文本中是否包含 $$ 或单个 $（即使不是整个文本）
  // 如果文本中包含任何 $ 符号，说明已经有数学公式标记，不需要再添加
  const containsDoubleDollar = processed.includes('$$');
  const containsSingleDollar = processed.includes('$');
  
  // 如果文本中包含 $$ 或整个文本已经被 $ 包围，就不需要再添加
  // 注意：如果文本中包含任何 $ 符号或块级数学环境，说明已经有数学公式，不需要再添加
  // 重要：只要包含任何 $ 符号（包括 $$ 或单个 $）或块级数学公式模式，就认为已经在数学环境中，不要添加额外的 $
  // 注意：containsSingleDollar 可能会误判（因为文本中可能有单个 $），所以优先检查块级公式模式
  if (!containsDoubleDollar && !containsSingleDollar && !isBlockMath && !isInlineMath && !hasHtmlTags) {
    const hasMathSymbols = /[-+*/^_=<>()[\]\\]/.test(processed) || /\\[a-zA-Z]/.test(processed);
    if (hasMathSymbols) {
      if (hasBlockMathEnv || /^\s*\\begin\{/.test(trimmed)) {
        processed = `$$${processed}$$`;
      } else {
        processed = `$${processed}$`;
      }
    }
  }

  processed = mergeStrayDisplayDollars(processed);

  return processed;
}

/**
 * 处理答案文本为 HTML（支持换行和格式）
 * @param {string|Array} text - 原始答案文本（可能是字符串或数组）
 * @returns {string} 处理后的 HTML
 */
export function processAnswerTextToHTML(text) {
  if (!text) return '';

  // 如果是数组，转换为字符串（用换行分隔）
  if (Array.isArray(text)) {
    text = text.join('\n');
  }
  
  // 确保是字符串
  if (typeof text !== 'string') {
    text = String(text);
  }

  let processed = text;

  processed = convertLatexGraphicsToImageTags(processed);
  processed = processMathexamEnvironments(processed);
  processed = processEqref(processed);
  processed = applyTextModeFormatting(processed);
  processed = processAnswerText(processed);
  processed = processEnumerate(processed);
  processed = processItemize(processed);

  // 先处理 \begin{rmk}...\end{rmk} 环境（必须在数学公式处理之前）
  // 这样可以确保 rmk 环境不会被 MathJax 误认为是数学公式
  const rmkRegex = /\\begin\{rmk\}(.*?)\\end\{rmk\}/gs;
  processed = processed.replace(rmkRegex, (match, content) => {
    // 清理 rmk 内容中的 LaTeX 命令，转换为纯文本
    let rmkText = content
      .replace(/\\ref\{([^}]+)\}/g, (m, ref) => ref)
      .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')  // 移除其他 LaTeX 命令但保留内容
      .replace(/\\[a-zA-Z]+/g, '')  // 移除单个命令
      .trim();
    // 转换为 "**注**. ..." 格式（Markdown 风格的加粗）
    return `<br><strong>注</strong>. ${rmkText}<br>`;
  });

  processed = processed.replace(/^\s*注：/gm, '<strong>注</strong>.');
  processed = mergeStrayDisplayDollars(processed);

  const parts = [];
  let lastIndex = 0;
  const mathRanges = collectMathRanges(processed);

  for (const mathRange of mathRanges) {
    if (mathRange.start > lastIndex) {
      parts.push({ type: 'text', content: processed.substring(lastIndex, mathRange.start) });
    }
    parts.push({
      type: 'math',
      content: processed.substring(mathRange.start, mathRange.end),
    });
    lastIndex = mathRange.end;
  }
  
  // 添加剩余的文本
  if (lastIndex < processed.length) {
    parts.push({ type: 'text', content: processed.substring(lastIndex) });
  }
  
  // 如果没有数学公式，整个都是文本
  if (parts.length === 0) {
    parts.push({ type: 'text', content: processed });
  }
  
  // 处理文本部分和数学公式部分
  let result = parts.map(part => {
    if (part.type === 'math') {
      // 在数学公式中处理 \score{...}
      // 将 \score{5} 替换为 \cdots\cdots$(5')$ (LaTeX 格式，保持公式完整)
      let mathContent = part.content;
      
      // 尝试匹配数学公式中的 \score{...} 或 score{...}
      const scoreInMathRegex = /(\\*)?score\{([^}]+)\}/g;
      let scoreMatch;
      const scoreMatches = [];
      
      // 对于数学环境（如 align*），直接匹配所有 score，不需要检查 $...$
      // 因为整个 part.content 已经是数学内容了
      while ((scoreMatch = scoreInMathRegex.exec(mathContent)) !== null) {
        scoreMatches.push({
          match: scoreMatch[0],
          start: scoreMatch.index,
          end: scoreMatch.index + scoreMatch[0].length,
          content: scoreMatch[2]
        });
      }
      
      // 从后往前替换
      for (let i = scoreMatches.length - 1; i >= 0; i--) {
        const m = scoreMatches[i];
        // 在数学公式中，使用 LaTeX 的点填充 + $(分数')$
        // 注意：在数学环境中，使用 \text{} 包装分数，避免与数学符号冲突
        const replacement = `\\score{${m.content}}`;
        mathContent = mathContent.substring(0, m.start) + replacement + mathContent.substring(m.end);
      }
      
      // 数学公式需要用 <span> 包装，以便 MathJax 能识别
      return `<span class="math-formula">${mathContent}</span>`;
    } else {
      let textContent = part.content.replace(/\n/g, '<br>');
      textContent = textContent.replace(/(<br>\s*)注：/g, '$1<strong>注</strong>.');
      
      // 尝试匹配文本中的 \score{...} 或 score{...}
      let textScoreRegex = /\\score\{([^}]+)\}/g;
      let textScoreMatches = [];
      let textScoreMatch;
      textScoreRegex.lastIndex = 0;
      
      while ((textScoreMatch = textScoreRegex.exec(textContent)) !== null) {
        textScoreMatches.push({
          match: textScoreMatch[0],
          start: textScoreMatch.index,
          end: textScoreMatch.index + textScoreMatch[0].length,
          content: textScoreMatch[1]
        });
      }
      
      // 如果没有匹配到，尝试匹配没有反斜杠的 score{...}
      if (textScoreMatches.length === 0) {
        textScoreRegex = /score\{([^}]+)\}/g;
        textScoreRegex.lastIndex = 0;
        while ((textScoreMatch = textScoreRegex.exec(textContent)) !== null) {
          // 检查前面不是反斜杠（避免重复匹配）
          if (textScoreMatch.index === 0 || textContent[textScoreMatch.index - 1] !== '\\') {
            textScoreMatches.push({
              match: textScoreMatch[0],
              start: textScoreMatch.index,
              end: textScoreMatch.index + textScoreMatch[0].length,
              content: textScoreMatch[1]
            });
          }
        }
      }
      
      // 从后往前替换文本中的 score
      for (let i = textScoreMatches.length - 1; i >= 0; i--) {
        const m = textScoreMatches[i];
        // 在文本中，使用 HTML 点填充效果（不换行，只在同一行添加点填充）
        // 使用 inline 或 inline-block 保持在同一行
        const replacement = stepScoreBadgeHtml(m.content);
        textContent = textContent.substring(0, m.start) + replacement + textContent.substring(m.end);
      }
      
      return textContent;
    }
  }).join('');

  return expandImageTagsToHtml(result);
}

export const renderAnswerHTML = processAnswerTextToHTML;

