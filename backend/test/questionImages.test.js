const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { extractImagesFromStem } = require('../utils/questionImages');

describe('questionImages', () => {
  it('moves img tags from stem into images array', () => {
    const stem = '题干<img src="fig1.png" />后续';
    const { stem: cleaned, images } = extractImagesFromStem(stem, []);
    assert.match(cleaned, /题干/);
    assert.doesNotMatch(cleaned, /<img/i);
    assert.equal(images.length, 1);
    assert.equal(images[0].url, 'fig1.png');
  });

  it('is idempotent when images already structured', () => {
    const existing = [{ url: 'a.pdf', caption: '', label: '1', width: '' }];
    const first = extractImagesFromStem('<img src="a.pdf" />', existing);
    const second = extractImagesFromStem(first.stem, first.images);
    assert.deepEqual(second.images, first.images);
    assert.equal(second.stem, first.stem);
  });
});
