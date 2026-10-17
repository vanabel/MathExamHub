<template>
  <div class="container py-4">
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li class="breadcrumb-item">
          <router-link to="/knowledge-points">章节 / 知识点</router-link>
        </li>
        <li class="breadcrumb-item active">Excel 导入</li>
      </ol>
    </nav>

    <h1 class="h4 mb-3"><i class="bi bi-file-earmark-spreadsheet"></i> 知识图谱 Excel 导入</h1>
    <p class="text-muted small">
      工作表「课程知识点」：一级…七级知识点列（空单元格继承上级），以及前置/后置/关联、标签、认知维度等。
    </p>

    <div class="card mb-3">
      <div class="card-body row g-3">
        <div class="col-md-4">
          <label class="form-label">科目（可覆盖 Excel 标题推断）</label>
          <input v-model="subject" class="form-control" placeholder="解析几何" />
        </div>
        <div class="col-md-8">
          <label class="form-label">Excel 文件 (.xls / .xlsx)</label>
          <input
            type="file"
            class="form-control"
            accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            data-testid="kp-import-file"
            @change="onFileChange"
          />
        </div>
        <div class="col-12 d-flex gap-2 flex-wrap">
          <button
            type="button"
            class="btn btn-outline-primary"
            data-testid="kp-import-preview"
            :disabled="!file || previewLoading"
            @click="runPreview"
          >
            {{ previewLoading ? '分析中…' : 'Dry-run 预览' }}
          </button>
          <button
            type="button"
            class="btn btn-primary"
            data-testid="kp-import-apply"
            :disabled="!file || applyLoading || !preview"
            @click="runApply"
          >
            {{ applyLoading ? '导入中…' : '确认合并导入' }}
          </button>
          <button
            type="button"
            class="btn btn-outline-secondary"
            :disabled="!subject.trim() || exportLoading"
            @click="exportExcel"
          >
            {{ exportLoading ? '导出中…' : '导出当前科目 Excel' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-if="preview" class="card mb-3">
      <div class="card-header">预览 diff（{{ preview.subject }}）</div>
      <div class="card-body">
        <p class="mb-2">
          解析 {{ preview.diff.totalParsed }} 节点 · 已有 {{ preview.diff.existingCount }} ·
          新增 {{ preview.diff.toCreate }} · 更新 {{ preview.diff.toUpdate }} ·
          不变 {{ preview.diff.unchanged }}
        </p>
        <div class="row">
          <div class="col-md-6">
            <h6 class="small text-muted">将新增（前 20）</h6>
            <ul class="small">
              <li v-for="(row, i) in preview.diff.preview.create" :key="'c' + i">{{ row.path }}</li>
            </ul>
          </div>
          <div class="col-md-6">
            <h6 class="small text-muted">将更新（前 20）</h6>
            <ul class="small">
              <li v-for="(row, i) in preview.diff.preview.update" :key="'u' + i">{{ row.path }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div v-if="applyResult" class="alert alert-success">
      导入完成：新建 {{ applyResult.created }}，更新 {{ applyResult.updated }}。
      <span v-if="applyResult.unresolvedRelations?.length">
        未解析关联名 {{ applyResult.unresolvedRelations.length }} 条（见控制台）。
      </span>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'KnowledgePointImportView',
  data() {
    return {
      subject: '解析几何',
      file: null,
      preview: null,
      previewLoading: false,
      applyLoading: false,
      exportLoading: false,
      applyResult: null,
      error: '',
    };
  },
  methods: {
    onFileChange(e) {
      this.file = e.target.files?.[0] || null;
      this.preview = null;
      this.applyResult = null;
      this.error = '';
    },
    formData() {
      const fd = new FormData();
      fd.append('file', this.file);
      if (this.subject.trim()) fd.append('subject', this.subject.trim());
      return fd;
    },
    async runPreview() {
      this.previewLoading = true;
      this.error = '';
      try {
        const { data } = await axios.post('/knowledge-points/import/preview', this.formData(), {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        this.preview = data;
        if (data.subject) this.subject = data.subject;
      } catch (e) {
        this.error = e.response?.data?.error || e.message || '预览失败';
      } finally {
        this.previewLoading = false;
      }
    },
    async runApply() {
      if (!confirm('将按 path 合并导入/更新知识点（不删除已有节点）。继续？')) return;
      this.applyLoading = true;
      this.error = '';
      try {
        const { data } = await axios.post('/knowledge-points/import/apply', this.formData(), {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        this.applyResult = data;
        if (data.unresolvedRelations?.length) {
          console.warn('Unresolved KP relation names', data.unresolvedRelations);
        }
        await this.runPreview();
      } catch (e) {
        this.error = e.response?.data?.error || e.message || '导入失败';
      } finally {
        this.applyLoading = false;
      }
    },
    async exportExcel() {
      this.exportLoading = true;
      this.error = '';
      try {
        const res = await axios.get('/knowledge-points/export/excel', {
          params: { subject: this.subject.trim() },
          responseType: 'blob',
        });
        const url = URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.subject.trim()}-课程知识点.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        this.error = e.response?.data?.error || '导出失败';
      } finally {
        this.exportLoading = false;
      }
    },
  },
};
</script>
