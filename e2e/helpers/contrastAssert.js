/**
 * WCAG relative luminance contrast check (computed styles).
 */

function parseRgb(color) {
  if (!color || color === 'transparent') return null;
  let m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) {
    return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
  }
  return null;
}

function relativeLuminance({ r, g, b }) {
  const channel = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(fg, bg) {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function effectiveBackground(el) {
  let node = el;
  while (node && node !== document.documentElement) {
    const bg = parseRgb(getComputedStyle(node).backgroundColor);
    if (bg) return bg;
    node = node.parentElement;
  }
  return parseRgb(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255 };
}

/**
 * Minimum contrast ratio between an element's text color and its effective background.
 * @param {import('@playwright/test').Page} page
 * @param {string} rootSelector
 * @param {number} minRatio
 */
async function assertMinContrastIn(page, rootSelector, minRatio = 4.5) {
  const result = await page.evaluate(
    ({ rootSel, min }) => {
      function parseRgbInner(color) {
        if (!color || color === 'transparent') return null;
        const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (m) return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
        return null;
      }
      function lum(rgb) {
        const channel = (c) => {
          const s = c / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
      }
      function ratio(fg, bg) {
        const l1 = lum(fg);
        const l2 = lum(bg);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
      }
      function effectiveBg(el) {
        let node = el;
        while (node && node !== document.documentElement) {
          const bg = parseRgbInner(getComputedStyle(node).backgroundColor);
          if (bg) return bg;
          node = node.parentElement;
        }
        return parseRgbInner(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255 };
      }

      const root = document.querySelector(rootSel);
      if (!root) return { ok: false, reason: `missing ${rootSel}` };

      const samples = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const text = n.textContent?.trim();
        if (!text) continue;
        const el = n.parentElement;
        if (!el) continue;
        if (el.closest('.text-muted, .form-text, .btn-close, [aria-hidden="true"]')) continue;
        const fg = parseRgbInner(getComputedStyle(el).color);
        if (!fg) continue;
        const bg = effectiveBg(el);
        samples.push({ text: text.slice(0, 40), ratio: ratio(fg, bg) });
      }

      if (!samples.length) {
        const fg = parseRgbInner(getComputedStyle(root).color);
        const bg = effectiveBg(root);
        if (fg && bg) {
          samples.push({ text: rootSel, ratio: ratio(fg, bg) });
        }
      }

      const worst = samples.reduce((a, b) => (a.ratio < b.ratio ? a : b), { ratio: Infinity, text: '' });
      return {
        ok: worst.ratio >= min,
        minFound: worst.ratio,
        sample: worst.text,
        count: samples.length,
      };
    },
    { rootSel: rootSelector, min: minRatio },
  );

  if (!result.ok) {
    throw new Error(
      `[contrast] ${rootSelector} min ratio ${result.minFound?.toFixed(2) ?? 'n/a'} `
        + `< ${minRatio} (sample: "${result.sample}")`,
    );
  }
  return result;
}

module.exports = {
  assertMinContrastIn,
  contrastRatio,
  parseRgb,
  relativeLuminance,
};
