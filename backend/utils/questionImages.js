/**
 * Structured question images vs legacy HTML / <image> tags in stems.
 */

const IMAGE_TAG_RE = /<image\s+([^>]+)\s*\/?>/gi;
const IMG_TAG_RE = /<img\s+([^>]+)\s*\/?>/gi;
const ANCHOR_MEDIA_RE = /<a\s+[^>]*href=["']([^"']+\.(?:pdf|png|jpe?g|gif|webp))["'][^>]*>([\s\S]*?)<\/a>/gi;

function parseImageTagAttrs(attrs) {
  const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
  const idMatch = attrs.match(/id=["']([^"']+)["']/i);
  const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
  const url = (hrefMatch && hrefMatch[1]) || (srcMatch && srcMatch[1]) || '';
  let label = '';
  if (idMatch) {
    label = idMatch[1].replace(/^fig:/, '');
  }
  return { url: url.trim(), label, caption: '', width: '' };
}

function normalizeImageEntry(entry) {
  if (!entry || !entry.url) return null;
  return {
    url: String(entry.url).trim(),
    caption: entry.caption ? String(entry.caption).trim() : '',
    label: entry.label ? String(entry.label).trim().replace(/^fig:/, '') : '',
    width: entry.width ? String(entry.width).trim() : '',
  };
}

/**
 * Remove legacy image markup from stem; return structured images (merge with existing).
 */
function extractImagesFromStem(stem, existingImages = []) {
  if (!stem) {
    return { stem: '', images: (existingImages || []).map(normalizeImageEntry).filter(Boolean) };
  }
  let text = stem;
  const found = [];

  text = text.replace(IMAGE_TAG_RE, (match, attrs) => {
    found.push(parseImageTagAttrs(attrs));
    return '';
  });

  text = text.replace(IMG_TAG_RE, (match, attrs) => {
    found.push(parseImageTagAttrs(attrs));
    return '';
  });

  text = text.replace(ANCHOR_MEDIA_RE, (match, href) => {
    found.push({ url: href, label: '', caption: '', width: '' });
    return '';
  });

  const merged = [...(existingImages || []).map(normalizeImageEntry).filter(Boolean)];
  for (const f of found) {
    const n = normalizeImageEntry(f);
    if (n && !merged.some((m) => m.url === n.url && m.label === n.label)) {
      merged.push(n);
    }
  }

  return {
    stem: text.replace(/\n{3,}/g, '\n\n').trim(),
    images: merged,
  };
}

function comparableImages(images) {
  return (images || []).map(normalizeImageEntry).filter(Boolean);
}

function imagesEqualIgnoringIds(a, b) {
  return JSON.stringify(comparableImages(a)) === JSON.stringify(comparableImages(b));
}

module.exports = {
  extractImagesFromStem,
  normalizeImageEntry,
  parseImageTagAttrs,
  comparableImages,
  imagesEqualIgnoringIds,
};
