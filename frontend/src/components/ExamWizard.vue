<template>
  <div class="exam-wizard-container">
    <div class="container py-4">
      <div class="page-header mb-4">
        <nav aria-label="breadcrumb" class="mb-3">
          <ol class="breadcrumb">
            <li class="breadcrumb-item">
              <router-link to="/question-list">题目列表</router-link>
            </li>
            <li class="breadcrumb-item active">组卷向导</li>
          </ol>
        </nav>
        <h1 class="h3 mb-1"><i class="bi bi-magic"></i> 自动组卷向导</h1>
        <p class="text-muted mb-0">编辑蓝图 → 约束抽题 → 页内预览 → 换题微调 → 导出 LaTeX</p>
      </div>

      <ul class="nav nav-pills mb-4">
        <li class="nav-item">
          <button type="button" class="nav-link" :class="{ active: step === 1 }" @click="step = 1">
            1. 蓝图
          </button>
        </li>
        <li class="nav-item">
          <button type="button" class="nav-link" :class="{ active: step === 2 }" :disabled="!paperQuestions.length" @click="step = 2">
            2. 预览
          </button>
        </li>
        <li class="nav-item">
          <button type="button" class="nav-link" :class="{ active: step === 3 }" :disabled="!paperQuestions.length" @click="step = 3">
            3. 导出
          </button>
        </li>
      </ul>

      <!-- Step 1 -->
      <div v-show="step === 1" class="row g-4">
        <div class="col-lg-7">
          <div class="card shadow-sm">
            <div class="card-header bg-light d-flex justify-content-between align-items-center">
              <span class="fw-semibold">组卷蓝图</span>
              <select v-model="selectedBlueprintId" class="form-select form-select-sm w-auto" @change="loadBlueprint">
                <option value="">新建蓝图</option>
                <option v-for="bp in blueprints" :key="bp._id" :value="bp._id">{{ bp.title }}</option>
              </select>
            </div>
            <div class="card-body">
              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label class="form-label">试卷标题</label>
                  <input v-model="blueprint.title" class="form-control" placeholder="例如：高等代数期中" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">科目</label>
                  <input v-model="blueprint.subject" class="form-control" placeholder="例如：高等代数" />
                </div>
                <div class="col-md-4">
                  <label class="form-label">目标总分</label>
                  <input v-model.number="blueprint.totalScore" type="number" min="0" class="form-control" />
                </div>
                <div class="col-md-4">
                  <label class="form-label">随机种子</label>
                  <input v-model.number="blueprint.randomSeed" type="number" class="form-control" />
                </div>
                <div class="col-md-4 d-flex align-items-end">
                  <div class="form-check">
                    <input id="allowRelax" v-model="blueprint.allowRelaxation" class="form-check-input" type="checkbox" />
                    <label class="form-check-label" for="allowRelax">允许自动放宽约束</label>
                  </div>
                </div>
                <div class="col-md-4">
                  <label class="form-label">A/B 重合率上限（%）</label>
                  <input
                    v-model.number="maxOverlapPctUi"
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    class="form-control"
                  />
                </div>
                <div class="col-md-4 d-flex align-items-end">
                  <div class="form-check">
                    <input id="genAb" v-model="generateAbPair" class="form-check-input" type="checkbox" />
                    <label class="form-check-label" for="genAb">同时生成 A/B 双卷</label>
                  </div>
                </div>
              </div>

              <div v-for="(section, idx) in blueprint.sections" :key="idx" class="border rounded p-3 mb-3 bg-light-subtle">
                <div class="d-flex justify-content-between mb-2">
                  <strong>大题 {{ idx + 1 }}</strong>
                  <button v-if="blueprint.sections.length > 1" type="button" class="btn btn-sm btn-outline-danger" @click="removeSection(idx)">
                    删除
                  </button>
                </div>
                <div class="row g-2">
                  <div class="col-md-4">
                    <label class="form-label small">题型</label>
                    <select v-model="section.type" class="form-select form-select-sm">
                      <option v-for="t in questionTypes" :key="t" :value="t">{{ t }}</option>
                    </select>
                  </div>
                  <div class="col-md-2">
                    <label class="form-label small">题量</label>
                    <input v-model.number="section.count" type="number" min="1" class="form-control form-control-sm" />
                  </div>
                  <div class="col-md-3">
                    <label class="form-label small">每题分值</label>
                    <input v-model.number="section.scoreEach" type="number" min="0" step="0.5" class="form-control form-control-sm" />
                  </div>
                  <div class="col-md-3">
                    <label class="form-label small">难度（易/中/难，可留空）</label>
                    <div class="input-group input-group-sm">
                      <input v-model.number="section.difficultyMix.易" type="number" min="0" class="form-control" placeholder="易" />
                      <input v-model.number="section.difficultyMix.中" type="number" min="0" class="form-control" placeholder="中" />
                      <input v-model.number="section.difficultyMix.难" type="number" min="0" class="form-control" placeholder="难" />
                    </div>
                  </div>
                </div>
              </div>
              <button type="button" class="btn btn-outline-primary btn-sm" @click="addSection">
                <i class="bi bi-plus-lg"></i> 添加大题
              </button>
            </div>
            <div class="card-footer d-flex gap-2 flex-wrap">
              <button type="button" class="btn btn-secondary" :disabled="savingBlueprint" @click="saveBlueprint">
                {{ savingBlueprint ? '保存中…' : '保存蓝图' }}
              </button>
              <button type="button" class="btn btn-primary" :disabled="generating" @click="generateExam">
                {{ generating ? '生成中…' : (generateAbPair ? '生成 A/B 卷' : '生成试卷') }}
              </button>
            </div>
          </div>
        </div>
        <div class="col-lg-5">
          <div v-if="relaxations.length || warnings.length || shortfalls.length" class="card border-warning shadow-sm mb-3">
            <div class="card-header bg-warning-subtle text-warning-emphasis">
              <i class="bi bi-exclamation-triangle"></i> 放宽与警告
            </div>
            <ul class="list-group list-group-flush small">
              <li v-for="(r, i) in relaxations" :key="'r' + i" class="list-group-item">
                <span class="badge bg-warning text-dark me-1">放宽</span>
                {{ r.message || r.step }}
                <span v-if="r.sectionIndex != null" class="text-muted">（大题 {{ r.sectionIndex + 1 }}）</span>
              </li>
              <li v-for="(w, i) in warnings" :key="'w' + i" class="list-group-item">
                <span class="badge bg-info me-1">提示</span>{{ w }}
              </li>
              <li v-for="(s, i) in shortfalls" :key="'s' + i" class="list-group-item text-danger">
                <span class="badge bg-danger me-1">缺口</span>{{ s.message || JSON.stringify(s) }}
              </li>
            </ul>
          </div>
          <div v-if="generateStats" class="card shadow-sm">
            <div class="card-header bg-light">生成统计</div>
            <div class="card-body small">
              <p class="mb-1">实际总分：<strong>{{ generateStats.totalScore }}</strong></p>
              <p class="mb-0 text-muted">按题型：{{ formatMap(generateStats.byType) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 2 -->
      <div v-show="step === 2">
        <div v-if="!paperQuestions.length" class="alert alert-secondary">请先在「蓝图」步骤生成试卷。</div>
        <div v-else>
          <div v-if="variants.A && variants.B" class="d-flex flex-wrap align-items-center gap-3 mb-3">
            <div class="btn-group" role="group">
              <button
                type="button"
                class="btn btn-sm"
                :class="activeVariant === 'A' ? 'btn-primary' : 'btn-outline-primary'"
                @click="switchVariant('A')"
              >
                A 卷
              </button>
              <button
                type="button"
                class="btn btn-sm"
                :class="activeVariant === 'B' ? 'btn-primary' : 'btn-outline-primary'"
                @click="switchVariant('B')"
              >
                B 卷
              </button>
            </div>
            <span class="text-muted small">
              题目重合率：{{ (variantOverlapRatio * 100).toFixed(1) }}%（上限 {{ maxOverlapPctUi }}%）
            </span>
          </div>
          <div class="row g-3">
          <div v-for="(item, index) in paperQuestions" :key="item._id + '-' + index" class="col-12">
            <div class="card shadow-sm">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <span class="badge bg-primary me-1">{{ item.type }}</span>
                    <span class="badge bg-secondary me-1">{{ item.difficulty }}</span>
                    <span class="badge bg-info">{{ item.totalScore }} 分</span>
                    <span v-if="item.usageCount != null" class="badge bg-light text-dark ms-1">已用 {{ item.usageCount }} 次</span>
                    <span v-if="item.lastUsedAt" class="badge bg-light text-muted ms-1">{{ formatLastUsed(item.lastUsedAt) }}</span>
                    <span class="text-muted small ms-2">第 {{ index + 1 }} 题 · 大题 {{ item.sectionIndex + 1 }}</span>
                  </div>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-primary"
                    :disabled="item.swapping"
                    @click="swapQuestion(item)"
                  >
                    {{ item.swapping ? '换题中…' : '换一题' }}
                  </button>
                </div>
                <div
                  class="question-preview"
                  v-html="processQuestionTextToHTML(item.questionText, item.originalLaTeX)"
                ></div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      <!-- Step 3 -->
      <div v-show="step === 3">
        <div class="card shadow-sm max-w-600">
          <div class="card-body">
            <p class="text-muted">
              将当前{{ activeVariant && activeVariant !== 'single' ? ` ${activeVariant} 卷` : '' }}预览中的
              {{ paperQuestions.length }} 道题导出为 mathexam LaTeX ZIP（含试卷与答案）。
            </p>
            <button type="button" class="btn btn-success" :disabled="exporting || !paperQuestions.length" @click="exportZip">
              {{ exporting ? '导出中…' : '下载 LaTeX ZIP' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { processQuestionTextToHTML } from '../utils/latexProcessor';

const defaultSection = () => ({
  type: '填空题',
  count: 3,
  scoreEach: 4,
  difficultyMix: { 易: 0, 中: 0, 难: 0 },
  knowledgePointIds: [],
});

export default {
  name: 'ExamWizard',
  data() {
    return {
      step: 1,
      questionTypes: ['判断题', '单选题', '多选题', '填空题', '简答题', '解答题', '计算题', '证明题', '作图题'],
      blueprints: [],
      selectedBlueprintId: '',
      blueprint: {
        title: '自动组卷试卷',
        subject: '',
        totalScore: 100,
        randomSeed: 42,
        allowRelaxation: true,
        maxVariantOverlapPct: 0.2,
        sections: [defaultSection()],
      },
      generateAbPair: false,
      maxOverlapPctUi: 20,
      activeVariant: 'single',
      variants: { A: null, B: null },
      variantOverlapRatio: 0,
      savedBlueprintId: null,
      paperId: null,
      paperQuestions: [],
      relaxations: [],
      warnings: [],
      shortfalls: [],
      generateStats: null,
      savingBlueprint: false,
      generating: false,
      exporting: false,
      swapSeed: 100,
    };
  },
  mounted() {
    this.loadBlueprintList();
  },
  methods: {
    processQuestionTextToHTML,
    formatLastUsed(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '';
      return `最近使用 ${d.toLocaleDateString('zh-CN')}`;
    },
    formatMap(obj) {
      if (!obj) return '—';
      return Object.entries(obj).map(([k, v]) => `${k}:${v}`).join('，');
    },
    addSection() {
      this.blueprint.sections.push(defaultSection());
    },
    removeSection(idx) {
      this.blueprint.sections.splice(idx, 1);
    },
    async loadBlueprintList() {
      try {
        const { data } = await axios.get('/exam-blueprints');
        this.blueprints = data;
      } catch (e) {
        console.error(e);
      }
    },
    loadBlueprint() {
      if (!this.selectedBlueprintId) {
        this.savedBlueprintId = null;
        return;
      }
      const bp = this.blueprints.find((b) => b._id === this.selectedBlueprintId);
      if (bp) {
        this.blueprint = JSON.parse(JSON.stringify(bp));
        this.savedBlueprintId = bp._id;
        if (typeof bp.maxVariantOverlapPct === 'number') {
          this.maxOverlapPctUi = Math.round(bp.maxVariantOverlapPct * 100);
        }
      }
    },
    async saveBlueprint() {
      this.savingBlueprint = true;
      try {
        const payload = {
          ...this.blueprint,
          maxVariantOverlapPct: Math.min(1, Math.max(0, this.maxOverlapPctUi / 100)),
        };
        if (this.savedBlueprintId) {
          const { data } = await axios.put(`/exam-blueprints/${this.savedBlueprintId}`, payload);
          this.blueprint = data;
        } else {
          const { data } = await axios.post('/exam-blueprints', payload);
          this.savedBlueprintId = data._id;
          this.selectedBlueprintId = data._id;
          await this.loadBlueprintList();
        }
      } catch (e) {
        alert(e.response?.data?.error || '保存蓝图失败');
      } finally {
        this.savingBlueprint = false;
      }
    },
    buildFlatQuestions(sections, questions) {
      const byId = new Map(questions.map((q) => [String(q._id), q]));
      const flat = [];
      (sections || []).forEach((sec, sectionIndex) => {
        (sec.questionIds || []).forEach((id, slotIndex) => {
          const q = byId.get(String(id));
          if (q) {
            flat.push({ ...q, sectionIndex, slotIndex, swapping: false });
          }
        });
      });
      if (!flat.length && questions.length) {
        questions.forEach((q, index) => {
          flat.push({ ...q, sectionIndex: 0, slotIndex: index, swapping: false });
        });
      }
      return flat;
    },
    applyGeneratePayload(data, variantKey = 'single') {
      this.relaxations = data.relaxations || [];
      this.warnings = data.warnings || [];
      this.shortfalls = data.shortfalls || [];
      this.generateStats = data.stats || null;
      this.paperId = data.paperId;
      this.paperQuestions = this.buildFlatQuestions(data.sections, data.questions || []);
      if (variantKey === 'A' || variantKey === 'B') {
        this.variants[variantKey] = data;
      }
    },
    switchVariant(label) {
      if (!this.variants[label]) return;
      this.activeVariant = label;
      this.applyGeneratePayload(this.variants[label], label);
      this.$nextTick(() => {
        if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise();
      });
    },
    async generateExam() {
      this.generating = true;
      this.relaxations = [];
      this.warnings = [];
      this.shortfalls = [];
      this.variants = { A: null, B: null };
      this.activeVariant = 'single';
      try {
        if (!this.savedBlueprintId) {
          await this.saveBlueprint();
        }
        const maxVariantOverlapPct = Math.min(1, Math.max(0, this.maxOverlapPctUi / 100));
        if (this.generateAbPair) {
          const { data } = await axios.post('/exams/generate-variants', {
            blueprintId: this.savedBlueprintId,
            maxVariantOverlapPct,
          });
          this.variantOverlapRatio = data.overlapRatio ?? 0;
          if (data.warnings?.length) {
            this.warnings = data.warnings;
          }
          this.variants.A = data.variants.A;
          this.variants.B = data.variants.B;
          this.activeVariant = 'A';
          this.applyGeneratePayload(data.variants.A, 'A');
        } else {
          const { data } = await axios.post('/exams/generate', {
            blueprintId: this.savedBlueprintId,
          });
          this.applyGeneratePayload(data);
        }
        if (this.paperQuestions.length) {
          this.step = 2;
          this.$nextTick(() => {
            if (window.MathJax?.typesetPromise) {
              window.MathJax.typesetPromise();
            }
          });
        } else {
          alert('未能抽到题目，请检查题库或放宽设置。');
        }
      } catch (e) {
        alert(e.response?.data?.error || '生成失败');
      } finally {
        this.generating = false;
      }
    },
    occupiedIds(excludeId) {
      return this.paperQuestions
        .map((q) => q._id)
        .filter((id) => String(id) !== String(excludeId));
    },
    async swapQuestion(item) {
      item.swapping = true;
      this.swapSeed += 1;
      try {
        const { data } = await axios.post('/exams/swap-question', {
          blueprintId: this.savedBlueprintId,
          sectionIndex: item.sectionIndex,
          replaceQuestionId: item._id,
          occupiedQuestionIds: this.occupiedIds(item._id),
          randomSeed: this.swapSeed,
        });
        const rep = data.replacement;
        const idx = this.paperQuestions.indexOf(item);
        if (idx >= 0) {
          this.paperQuestions[idx] = {
            ...rep,
            sectionIndex: item.sectionIndex,
            slotIndex: item.slotIndex,
            swapping: false,
          };
        }
        this.$nextTick(() => {
          if (window.MathJax?.typesetPromise) {
            window.MathJax.typesetPromise();
          }
        });
      } catch (e) {
        alert(e.response?.data?.error || '换题失败');
      } finally {
        item.swapping = false;
      }
    },
    async exportZip() {
      this.exporting = true;
      try {
        const questionIds = this.paperQuestions.map((q) => q._id);
        const response = await axios.post(
          '/questions/export/latex',
          {
            questionIds,
            blueprintId: this.savedBlueprintId,
            paperId: this.paperId,
            metadata: {
              exportMode: 'both',
              AorB: this.activeVariant === 'B' ? 'B' : 'A',
            },
          },
          { responseType: 'blob' },
        );
        let filename = `${this.blueprint.title || 'mathexam'}.zip`;
        const cd = response.headers['content-disposition'];
        if (cd) {
          const m = cd.match(/filename\*=UTF-8''([^;]+)/i);
          if (m) {
            try {
              filename = decodeURIComponent(m[1]);
            } catch {
              /* ignore */
            }
          }
        }
        if (!filename.endsWith('.zip')) filename = filename.replace(/\.tex$/, '') + '.zip';
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);
      } catch (e) {
        alert('导出失败');
      } finally {
        this.exporting = false;
      }
    },
  },
};
</script>

<style scoped>
.question-preview {
  line-height: 1.6;
  word-break: break-word;
}
.max-w-600 {
  max-width: 36rem;
}
</style>
