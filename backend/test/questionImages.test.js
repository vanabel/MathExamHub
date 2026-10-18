const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { extractImagesFromStem, imagesEqualIgnoringIds } = require('../utils/questionImages');

describe('questionImages', () => {
  it('moves img tags from stem into images array', () => {
    const stem = '题干<img src="fig1.png" />后续';
    const { stem: cleaned, images } = extractImagesFromStem(stem, []);
    assert.match(cleaned, /题干/);
    assert.doesNotMatch(cleaned, /<img/i);
    assert.equal(images.length, 1);
    assert.equal(images[0].url, 'fig1.png');
  });

  it('imagesEqualIgnoringIds ignores Mongo subdocument _id', () => {
    const normalized = [{ url: 'a.pdf', caption: '', label: '1', width: '' }];
    const withIds = normalized.map((e) => ({ ...e, _id: '507f1f77bcf86cd799439011' }));
    assert.equal(imagesEqualIgnoringIds(normalized, withIds), true);
  });

  it('is idempotent when images already structured', () => {
    const existing = [{ url: 'a.pdf', caption: '', label: '1', width: '' }];
    const first = extractImagesFromStem('<img src="a.pdf" />', existing);
    const second = extractImagesFromStem(first.stem, first.images);
    assert.deepEqual(second.images, first.images);
    assert.equal(second.stem, first.stem);
  });
});
