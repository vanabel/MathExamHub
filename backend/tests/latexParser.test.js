const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { LatexParser, LatexGenerator } = require('../utils/latexParser');

const fixturesDir = path.join(__dirname, 'fixtures/mathexam');

function loadFixture(name) {
  return fs.readFileSync(path.join(fixturesDir, name), 'utf8');
}

function testPackageExamplesParse() {
  const parser = new LatexParser();
  const questions = parser.parse(loadFixture('package-examples.tex'));
  assert.strictEqual(questions.length, 4, '应解析出 4 道题');
  assert.strictEqual(questions[0].type, '判断题');
  assert.strictEqual(questions[0].correctAnswer, '对');
  assert.strictEqual(questions[1].type, '单选题');
  assert.strictEqual(questions[1].correctAnswer, 'C');
  assert.ok(questions[1].options.C.includes('5'));
  assert.strictEqual(questions[2].type, '填空题');
  assert.strictEqual(questions[2].correctAnswer, '5');
  assert.strictEqual(questions[3].type, '计算题');
  assert.ok(questions[3].solution.includes('勾股定理'));
  assert.deepStrictEqual(parser.documentMetadata.packageOptions, ['nospace']);
  assert.strictEqual(parser.documentMetadata.head.course, '高等代数');
}

function testFillinOptionalWidth() {
  const parser = new LatexParser();
  const questions = parser.parse(loadFixture('fillin-optional-width.tex'));
  assert.strictEqual(questions.length, 1);
  assert.strictEqual(questions[0].correctAnswer.length, 2);
  assert.ok(questions[0].correctAnswer.includes('$x$'));
  assert.ok(questions[0].correctAnswer.includes('$y$'));
  assert.ok(parser.documentMetadata.packageOptions.includes('showans'));
}

function testRoundTripPreservesOriginalLatex() {
  const parser = new LatexParser();
  const questions = parser.parse(loadFixture('package-examples.tex'));
  const generator = new LatexGenerator();
  const exam = generator.generateDocument(questions, {
    course: '高等代数',
    packageOptions: ['nospace'],
  }, 'exam');
  assert.ok(exam.includes('\\usepackage[nospace]{mathexam}'));
  assert.ok(exam.includes('\\makehead'));
  assert.ok(exam.includes('\\true'));
  assert.ok(exam.includes('\\pickout{C}'));
  assert.ok(exam.includes('\\fillin{5}'));
  assert.ok(!exam.includes('showans'));
  const answer = generator.generateDocument(questions, {
    course: '高等代数',
    packageOptions: ['nospace'],
  }, 'answer');
  assert.ok(answer.includes('showans'));
}

function run() {
  testPackageExamplesParse();
  testFillinOptionalWidth();
  testRoundTripPreservesOriginalLatex();
  console.log('latexParser tests: OK');
}

run();
