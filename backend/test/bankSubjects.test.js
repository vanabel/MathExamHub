const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { listDistinctSubjectsForBank } = require('../utils/bankSubjects');

describe('listDistinctSubjectsForBank', () => {
  const bankId = '507f1f77bcf86cd799439011';

  it('returns empty array when bank has no subjects', async () => {
    const distinct = async () => [];
    const subjects = await listDistinctSubjectsForBank({ distinct }, bankId);
    assert.deepEqual(subjects, []);
  });

  it('returns sorted distinct subjects trimming blanks', async () => {
    const distinct = async (_field, filter) => {
      assert.equal(String(filter.bankId), String(bankId));
      return [' 解析几何 ', '高等代数', '', '解析几何', '  线性代数II'];
    };
    const subjects = await listDistinctSubjectsForBank({ distinct }, bankId);
    assert.deepEqual(subjects, ['高等代数', '解析几何', '线性代数II']);
  });
});
