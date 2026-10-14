<template>
  <div>
    <button
      type="button"
      class="btn btn-outline-light btn-sm"
      :disabled="!bankId || loading"
      @click="openModal"
    >
      试卷头
    </button>

    <div v-if="showModal" class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,.45)">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">题库 LaTeX 试卷头默认值</h5>
            <button type="button" class="btn-close" @click="closeModal"></button>
          </div>
          <div class="modal-body">
            <p class="text-muted small">
              导入 .tex 时会自动填充空缺项；导出时作为默认值（可被蓝图/试卷/表单覆盖）。
            </p>
            <div class="row g-2">
              <div class="col-md-6" v-for="field in fields" :key="field.key">
                <label class="form-label small mb-0">{{ field.label }}</label>
                <input v-model="form[field.key]" class="form-control form-control-sm" />
              </div>
              <div class="col-12">
                <label class="form-label small mb-0">宏包选项（逗号分隔）</label>
                <input v-model="packageOptionsText" class="form-control form-control-sm" placeholder="nospace,showans" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary btn-sm" @click="closeModal">取消</button>
            <button type="button" class="btn btn-primary btn-sm" :disabled="saving" @click="save">
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

const FIELD_DEFS = [
  { key: 'university', label: '学校' },
  { key: 'school', label: '学院' },
  { key: 'course', label: '课程' },
  { key: 'AorB', label: 'A/B 卷' },
  { key: 'finalmiddle', label: '期中期末' },
  { key: 'totaltime', label: '考试时长(分钟)' },
  { key: 'openclose', label: '开闭卷' },
  { key: 'degree', label: '层次' },
  { key: 'major', label: '专业' },
  { key: 'grade', label: '年级' },
  { key: 'examiner', label: '命题人' },
  { key: 'director', label: '审题' },
  { key: 'dean', label: '院长' },
];

export default {
  name: 'BankLatexMetadataEditor',
  props: {
    bankId: { type: String, default: '' },
  },
  data() {
    return {
      showModal: false,
      loading: false,
      saving: false,
      form: {},
      packageOptionsText: 'nospace',
      fields: FIELD_DEFS,
    };
  },
  methods: {
    blankForm() {
      const f = {};
      FIELD_DEFS.forEach(({ key }) => { f[key] = ''; });
      return f;
    },
    async openModal() {
      if (!this.bankId) return;
      this.showModal = true;
      this.loading = true;
      try {
        const { data } = await axios.get(`/banks/${this.bankId}/latex-metadata`);
        const meta = data.latexExamMetadata || {};
        this.form = { ...this.blankForm(), ...meta };
        this.packageOptionsText = (meta.packageOptions || ['nospace']).join(',');
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
      this.saving = true;
      try {
        const packageOptions = this.packageOptionsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const payload = { ...this.form, packageOptions };
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
