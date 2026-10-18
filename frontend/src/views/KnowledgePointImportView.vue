<template>
  <div class="app-page app-container container-xl py-4">
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li class="breadcrumb-item">
          <router-link to="/knowledge-points">章节 / 知识点</router-link>
        </li>
        <li class="breadcrumb-item active">知识图谱工作流</li>
      </ol>
    </nav>

    <h1 class="h4 mb-2"><i class="bi bi-diagram-3"></i> 知识图谱工作流</h1>
    <p class="text-muted small mb-3">
      上传 Excel → 预览合并知识点树 →（可选）对本题库该科目下未打标题目 LLM 建议知识点，审核后写入。
    </p>

    <ul class="nav nav-pills mb-3">
      <li class="nav-item">
        <button type="button" class="nav-link" :class="{ active: step === 1 }" @click="step = 1">1. Excel 导入</button>
      </li>
      <li class="nav-item">
        <button
          type="button"
          class="nav-link"
          :class="{ active: step === 2 }"
          :disabled="!subject.trim()"
          data-testid="kp-workflow-step-2"
          @click="step = 2"
        >
          2. LLM 打标
        </button>
      </li>
    </ul>

    <div v-show="step === 1" class="card mb-3">
      <div class="card-header">步骤 1：导入 / 合并知识点树</div>
      <div class="card-body row g-3">
        <div class="col-md-4">
          <label class="form-label">科目</label>
          <input v-model="subject" class="form-control" placeholder="解析几何" @change="loadKpTree" />
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
            {{ applyLoading ? '合并中…' : '确认合并到题库' }}
          </button>
          <button
            type="button"
            class="btn btn-outline-secondary"
            :disabled="!subject.trim() || exportLoading"
            @click="exportExcel"
          >
            {{ exportLoading ? '导出中…' : '导出 Excel' }}
          </button>
          <button
            v-if="treeReady"
            type="button"
            class="btn btn-success ms-auto"
            @click="step = 2"
          >
            下一步：LLM 打标 →
          </button>
        </div>
      </div>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-if="preview && step === 1" class="card mb-3">
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
        <div v-if="preview.unresolvedRelationNames?.length" class="alert alert-warning small mt-2" data-testid="kp-import-unresolved">
          导入后可能无法解析的关联名（前 {{ preview.unresolvedRelationNames.length }} 条）：
          <ul class="mb-0">
            <li v-for="(u, i) in preview.unresolvedRelationNames.slice(0, 10)" :key="'u' + i">
              {{ u.path }} → {{ u.name }}
            </li>
          </ul>
        </div>
        <div v-if="preview.treePreview?.length" class="mt-3">
          <h6 class="small text-muted">树预览（前 {{ preview.treePreview.length }} 节点）</h6>
          <ul class="small mb-0" data-testid="kp-import-tree-preview">
            <li v-for="(n, i) in preview.treePreview" :key="'t' + i">
              <code>{{ n.path }}</code>
              <span v-for="tag in n.tags || []" :key="tag" class="badge text-bg-secondary ms-1">{{ tag }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div v-if="applyResult && step === 1" class="alert alert-success">
      合并完成：新建 {{ applyResult.created }}，更新 {{ applyResult.updated }}。
      <span v-if="applyResult.unresolvedRelations?.length">
        未解析关联名 {{ applyResult.unresolvedRelations.length }} 条（见控制台）。
      </span>
    </div>

    <div v-show="step === 2">
      <kp-tag-job-list
        ref="jobList"
        :selected-job-id="selectedReviewJobId"
        @select="selectedReviewJobId = String($event)"
      />
      <kp-tag-job-review-panel
        v-if="step === 2"
        :subject="subject"
        :kp-tree="kpTree"
        :job-id="selectedReviewJobId"
        :auto-load-latest="!selectedReviewJobId"
        @applied="onJobApplied"
        @job-started="onJobStarted"
        @job-loaded="onJobLoaded"
      />
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import KpTagJobReviewPanel from '../components/KpTagJobReviewPanel.vue';
import KpTagJobList from '../components/KpTagJobList.vue';

export default {
  name: 'KnowledgePointImportView',
  components: { KpTagJobReviewPanel, KpTagJobList },
  data() {
    return {
      step: 1,
      selectedReviewJobId: '',
      subject: '解析几何',
      file: null,
      preview: null,
      previewLoading: false,
      applyLoading: false,
      exportLoading: false,
      applyResult: null,
      error: '',
      kpTree: [],
    };
  },
  computed: {
    treeReady() {
      return this.kpTree.length > 0;
    },
  },
  mounted() {
    this.loadKpTree();
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
    async loadKpTree() {
      if (!this.subject.trim()) return;
      try {
        const { data } = await axios.get('/knowledge-points/tree', {
          params: { subject: this.subject.trim() },
        });
        this.kpTree = data.nodes || [];
      } catch {
        this.kpTree = [];
      }
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
        await this.loadKpTree();
      } catch (e) {
        this.error = e.response?.data?.error || e.message || '导入失败';
      } finally {
        this.applyLoading = false;
      }
    },
    onJobStarted(jobId) {
      this.selectedReviewJobId = String(jobId);
      this.$refs.jobList?.refresh();
    },
    onJobLoaded(job) {
      if (job?._id) this.selectedReviewJobId = String(job._id);
    },
    onJobApplied() {
      this.loadKpTree();
      this.$refs.jobList?.refresh();
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
