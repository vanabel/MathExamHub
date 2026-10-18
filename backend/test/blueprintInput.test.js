const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeBlueprintBody,
  formatBlueprintValidationError,
} = require('../utils/blueprintInput');

describe('blueprintInput', () => {
  it('maps questionType and scorePerQuestion aliases', () => {
    const body = normalizeBlueprintBody({
      title: 't',
      sections: [{
        questionType: '判断题',
        scorePerQuestion: 2,
        count: 3,
      }],
    });
    assert.equal(body.sections[0].type, '判断题');
    assert.equal(body.sections[0].scoreEach, 2);
    assert.equal(body.sections[0].questionType, undefined);
  });

  it('formats mongoose validation as structured 400 payload', () => {
    const err = {
      name: 'ValidationError',
      errors: {
        'sections.0.type': { message: 'Path `type` is required.', kind: 'required' },
      },
    };
    const formatted = formatBlueprintValidationError(err);
    assert.ok(formatted);
    assert.equal(formatted.error, '蓝图字段校验失败');
    assert.equal(formatted.fieldErrors.length, 1);
    assert.ok(formatted.aliasesAccepted.questionType);
  });
});
