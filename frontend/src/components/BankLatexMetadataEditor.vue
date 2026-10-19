<template>
  <div>
    <button
      type="button"
      class="btn btn-outline-light btn-sm bank-header-btn"
      :class="{ 'bank-header-btn--navbar': variant === 'navbar' }"
      :disabled="!bankId || loading"
      :title="'编辑当前题库的 LaTeX 试卷头默认值'"
      data-testid="navbar-bank-header-btn"
      @click="openModal"
    >
      试卷头
    </button>

    <div v-if="showModal" class="modal fade show d-block bank-latex-modal-root" tabindex="-1">
      <div class="modal-dialog modal-xl modal-dialog-scrollable bank-latex-modal-dialog">
        <div class="modal-content bank-latex-modal-content">
          <div class="modal-header bank-latex-modal-header sticky-top">
            <h5 class="modal-title">题库 LaTeX 试卷头默认值</h5>
            <button type="button" class="btn-close" aria-label="关闭" @click="closeModal"></button>
          </div>
          <div class="modal-body bank-latex-modal-body">
            <p class="text-muted small mb-3">
              导入 .tex 时会自动填充空缺项；导出时作为默认值（可被蓝图/试卷/表单覆盖）。
            </p>
            <div class="row g-4">
              <div class="col-lg-7">
                <section class="bank-latex-section">
                  <h6 class="bank-latex-section-title">学校信息</h6>
                  <div class="row g-2">
                    <div class="col-md-6">
                      <label class="form-label">学校</label>
                      <input v-model="form.university" class="form-control form-control-sm" placeholder="例：西南大学" />
                    </div>
                    <div class="col-md-6">
                      <label class="form-label">学院</label>
                      <input v-model="form.school" class="form-control form-control-sm" placeholder="例：数学与统计学院" />
                    </div>
                    <div class="col-md-6">
                      <label class="form-label">专业</label>
                      <input v-model="form.major" class="form-control form-control-sm" placeholder="数学与应用数学" />
                    </div>
                    <div class="col-md-6">
                      <label class="form-label">年级</label>
                      <input v-model="form.grade" class="form-control form-control-sm" placeholder="2024" />
                    </div>
                    <div class="col-md-6">
                      <label class="form-label">层次</label>
                      <input v-model="form.degree" class="form-control form-control-sm" placeholder="本科" />
                    </div>
                  </div>
                </section>

                <section class="bank-latex-section">
                  <h6 class="bank-latex-section-title">考试信息</h6>
                  <div class="row g-2">
                    <div class="col-md-6">
                      <label class="form-label">课程</label>
                      <input v-model="form.course" class="form-control form-control-sm" placeholder="高等代数" />
                    </div>
                    <div class="col-md-6">
                      <label class="form-label">期中期末</label>
                      <select v-model="form.finalmiddle" class="form-select form-select-sm">
                        <option value="">请选择</option>
                        <option v-for="o in finalmiddleOptions" :key="o" :value="o">{{ o }}</option>
                      </select>
                    </div>
                    <div class="col-md-4">
                      <label class="form-label">A / B 卷</label>
                      <select v-model="form.AorB" class="form-select form-select-sm">
                        <option value="">请选择</option>
                        <option v-for="o in aorBOptions" :key="o" :value="o">{{ o }}</option>
                      </select>
                    </div>
                    <div class="col-md-4">
                      <label class="form-label">开闭卷</label>
                      <select v-model="form.openclose" class="form-select form-select-sm">
                        <option value="">请选择</option>
                        <option v-for="o in opencloseOptions" :key="o" :value="o">{{ o }}</option>
                      </select>
                    </div>
                    <div class="col-md-4">
                      <label class="form-label">考试时长</label>
                      <div class="input-group input-group-sm">
                        <input v-model="form.totaltime" type="number" min="0" class="form-control" placeholder="120" />
                        <span class="input-group-text">分钟</span>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <label class="form-label">考试日期</label>
                      <input
                        v-model="form.examDate"
                        type="date"
                        class="form-control form-control-sm"
                        data-testid="bank-header-exam-date"
                      />
                      <p class="small text-muted mb-0 mt-1">
                        用于导出 <code>\examdate</code>；试卷头学年按<strong>9 月 1 日</strong>起算
                        <span v-if="suggestedAcademicYear">（当前日期 → {{ suggestedAcademicYear }}）</span>
                      </p>
                    </div>
                    <div class="col-12">
                      <div class="border rounded p-2 bg-light-subtle">
                        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                          <span class="small fw-semibold">学年覆盖（可选）</span>
                          <button
                            type="button"
                            class="btn btn-link btn-sm p-0"
                            data-testid="bank-header-clear-academic-year"
                            :disabled="!form.academicYearStart && !form.academicYearEnd"
                            @click="clearAcademicYearOverride"
                          >
                            使用自动学年
                          </button>
                        </div>
                        <div class="row g-2">
                          <div class="col-md-3">
                            <label class="form-label small mb-0">学年起</label>
                            <input
                              v-model="form.academicYearStart"
                              type="number"
                              class="form-control form-control-sm"
                              placeholder="留空=自动"
                              min="1900"
                              max="2100"
                              data-testid="bank-header-academic-year-start"
                            />
                          </div>
                          <div class="col-md-3">
                            <label class="form-label small mb-0">学年止</label>
                            <input
                              v-model="form.academicYearEnd"
                              type="number"
                              class="form-control form-control-sm"
                              placeholder="留空=自动"
                              min="1900"
                              max="2100"
                              data-testid="bank-header-academic-year-end"
                            />
                          </div>
                        </div>
                        <p v-if="academicYearError" class="small text-danger mb-0 mt-2" data-testid="bank-header-year-error">
                          {{ academicYearError }}
                        </p>
                        <p v-else class="small text-muted mb-0 mt-2">
                          两者都留空时导出仅写 <code>\examdate</code>，由 mathexam 按考试日期推算学年；填写则导出 <code>\academicyear</code> 并优先显示。
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section class="bank-latex-section">
                  <h6 class="bank-latex-section-title">命审</h6>
                  <div class="row g-2">
                    <div class="col-md-4">
                      <label class="form-label">命题人</label>
                      <input v-model="form.examiner" class="form-control form-control-sm" />
                    </div>
                    <div class="col-md-4">
                      <label class="form-label">审题</label>
                      <input v-model="form.director" class="form-control form-control-sm" />
                    </div>
                    <div class="col-md-4">
                      <label class="form-label">院长</label>
                      <input v-model="form.dean" class="form-control form-control-sm" />
                    </div>
                  </div>
                </section>

                <section class="bank-latex-section">
                  <h6 class="bank-latex-section-title">高级</h6>
                  <label class="form-label">宏包选项</label>
                  <div class="d-flex flex-wrap gap-1 mb-2">
                    <button
                      v-for="tag in packageSuggestions"
                      :key="tag"
                      type="button"
                      class="btn btn-sm"
                      :class="packageTags.includes(tag) ? 'btn-primary' : 'btn-outline-secondary'"
                      @click="togglePackageTag(tag)"
                    >
                      {{ tag }}
                    </button>
                  </div>
                  <input
                    v-model="packageOptionsText"
                    class="form-control form-control-sm"
                    placeholder="nospace, showans"
                    data-testid="bank-header-package-input"
                  />
                  <p class="small text-muted mb-0 mt-1">点击上方常用选项或手动输入逗号分隔列表。</p>
                </section>
              </div>

              <div class="col-lg-5">
                <div class="bank-latex-preview-pane sticky-lg-top" data-testid="bank-header-preview-pane">
                  <h6 class="bank-latex-section-title">预览</h6>
                  <div class="exam-header-preview card mb-3" v-html="headerHtmlPreview"></div>
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="small text-muted">导言区命令</span>
                    <button
                      type="button"
                      class="btn btn-link btn-sm p-0"
                      data-testid="bank-header-toggle-preamble"
                      @click="showPreamble = !showPreamble"
                    >
                      {{ showPreamble ? '隐藏' : '查看 generated LaTeX preamble' }}
                    </button>
                  </div>
                  <pre v-if="showPreamble" class="bank-latex-preamble small" data-testid="bank-header-preamble">{{ preamblePreview }}</pre>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer bank-latex-modal-footer sticky-bottom">
            <button type="button" class="btn btn-secondary btn-sm" @click="closeModal">取消</button>
            <button type="button" class="btn btn-primary btn-sm" data-testid="bank-header-save" :disabled="saving" @click="save">
              {{ saving ? '保存中…' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import {
  buildExamHeaderHtmlPreview,
  buildExamHeaderPreamblePreview,
  PACKAGE_SUGGESTIONS,
} from '../utils/examHeaderPreview';
import {
  normalizeAcademicYearOverride,
  suggestedAcademicYearLabel,
} from '../utils/latexExamDateForm';

const FIELD_KEYS = [
  'university', 'school', 'course', 'AorB', 'finalmiddle', 'totaltime',
  'examDate', 'academicYearStart', 'academicYearEnd',
  'openclose', 'degree', 'major', 'grade', 'examiner', 'director', 'dean',
];

export default {
  name: 'BankLatexMetadataEditor',
  props: {
    bankId: { type: String, default: '' },
    variant: { type: String, default: 'default' },
  },
  data() {
    return {
      showModal: false,
      loading: false,
      saving: false,
      showPreamble: false,
      form: {},
      packageOptionsText: 'nospace',
      finalmiddleOptions: ['期末', '期中', '补考', '缓考'],
      aorBOptions: ['A', 'B'],
      opencloseOptions: ['闭卷', '开卷', '半开卷'],
      packageSuggestions: PACKAGE_SUGGESTIONS,
      academicYearError: '',
    };
  },
  computed: {
    suggestedAcademicYear() {
      return suggestedAcademicYearLabel(this.form.examDate);
    },
    previewMeta() {
      const packageOptions = this.packageOptionsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return { ...this.form, packageOptions };
    },
    headerHtmlPreview() {
      return buildExamHeaderHtmlPreview(this.previewMeta);
    },
    preamblePreview() {
      return buildExamHeaderPreamblePreview(this.previewMeta);
    },
    packageTags() {
      return this.packageOptionsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    },
  },
  methods: {
    blankForm() {
      const f = {};
      FIELD_KEYS.forEach((key) => { f[key] = ''; });
      return f;
    },
    clearAcademicYearOverride() {
      this.form.academicYearStart = '';
      this.form.academicYearEnd = '';
      this.academicYearError = '';
    },
    togglePackageTag(tag) {
      const set = new Set(this.packageTags);
      if (set.has(tag)) set.delete(tag);
      else set.add(tag);
      this.packageOptionsText = [...set].join(', ');
    },
    async openModal() {
      if (!this.bankId) return;
      this.showModal = true;
      this.showPreamble = false;
      this.loading = true;
      try {
        const { data } = await axios.get(`/banks/${this.bankId}/latex-metadata`);
        const meta = data.latexExamMetadata || {};
        this.form = { ...this.blankForm(), ...meta };
        this.packageOptionsText = (meta.packageOptions || ['nospace']).join(', ');
      } catch (e) {
        console.error(e);
        alert('加载试卷头失败');
        this.closeModal();
      } finally {
        this.loading = false;
      }
    },
    closeModal() {
      this.showModal = false;
    },
    async save() {
      const yearNorm = normalizeAcademicYearOverride(
        this.form.academicYearStart,
        this.form.academicYearEnd,
      );
      this.academicYearError = yearNorm.error || '';
      if (yearNorm.error) return;

      this.saving = true;
      try {
        const packageOptions = this.packageOptionsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const payload = {
          ...this.form,
          academicYearStart: yearNorm.academicYearStart,
          academicYearEnd: yearNorm.academicYearEnd,
          packageOptions,
        };
        const { data } = await axios.patch(`/banks/${this.bankId}/latex-metadata`, payload);
        sessionStorage.setItem('latexExportDefaults', JSON.stringify(data.latexExamMetadata || {}));
        this.closeModal();
      } catch (e) {
        console.error(e);
        alert('保存失败');
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>

<style scoped>
.bank-latex-modal-root {
  background: rgba(0, 0, 0, 0.45);
}

.bank-latex-modal-dialog {
  max-width: min(1100px, 96vw);
}

.bank-latex-modal-header,
.bank-latex-modal-footer {
  background: #fff;
  z-index: 2;
}

.bank-latex-modal-body {
  scroll-padding-top: 1.25rem;
}

.bank-latex-section {
  margin-bottom: 1.25rem;
}

.bank-latex-section-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-primary, #2563eb);
  margin-bottom: 0.65rem;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid #e9ecef;
}

.bank-latex-preview-pane {
  top: 0.5rem;
}

.bank-latex-preamble {
  background: #1e1e2e;
  color: #e2e8f0;
  border-radius: 8px;
  padding: 0.75rem;
  max-height: 220px;
  overflow: auto;
  white-space: pre-wrap;
}

.bank-header-btn {
  white-space: nowrap;
  flex-shrink: 0;
}

.bank-header-btn--navbar {
  --bs-btn-padding-y: 0.25rem;
  --bs-btn-padding-x: 0.65rem;
  font-size: 0.875rem;
  line-height: 1.25;
  border-radius: 6px;
  border-color: rgba(255, 255, 255, 0.55);
}

:deep(.exam-header-preview-inner) {
  padding: 1rem;
  text-align: center;
  font-family: 'Noto Serif SC', 'Songti SC', serif;
}

:deep(.exam-header-preview-title) {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

:deep(.exam-header-preview-course) {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

:deep(.exam-header-preview-table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

:deep(.exam-header-preview-table td) {
  border: 1px solid #333;
  padding: 0.35rem 0.5rem;
}
</style>
