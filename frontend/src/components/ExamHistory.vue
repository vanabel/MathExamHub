<template>
  <div class="container py-4">
    <div class="page-header mb-4">
      <h1 class="h3 mb-1"><i class="bi bi-clock-history"></i> 组卷历史</h1>
      <p class="text-muted mb-0">按蓝图 / A·B 卷查看已生成试卷，支持再次导出 LaTeX</p>
    </div>

    <div class="card shadow-sm mb-4">
      <div class="card-body row g-3 align-items-end">
        <div class="col-md-4">
          <label class="form-label small">蓝图</label>
          <select v-model="filterBlueprintId" class="form-select form-select-sm" @change="loadPapers">
            <option value="">全部蓝图</option>
            <option v-for="bp in blueprints" :key="bp._id" :value="bp._id">{{ bp.title }}</option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label small">卷别</label>
          <select v-model="filterVariant" class="form-select form-select-sm" @change="loadPapers">
            <option value="">全部</option>
            <option value="A">A 卷</option>
            <option value="B">B 卷</option>
            <option value="single">单卷（无 A/B 标记）</option>
          </select>
        </div>
        <div class="col-md-2">
          <button type="button" class="btn btn-sm btn-outline-primary w-100" @click="loadPapers">刷新</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="text-center py-5 text-muted">加载中…</div>
    <div v-else-if="!papers.length" class="alert alert-secondary">暂无组卷记录，请先在组卷向导生成试卷。</div>
    <div v-else class="table-responsive">
      <table class="table table-hover align-middle">
        <thead class="table-light">
          <tr>
            <th>试卷</th>
            <th>蓝图</th>
            <th>卷别</th>
            <th>题量</th>
            <th>生成时间</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in papers" :key="p._id">
            <td>{{ p.title }}</td>
            <td class="small text-muted">{{ p.blueprintTitle || '—' }}</td>
            <td>
              <span v-if="p.variantLabel" class="badge bg-primary">{{ p.variantLabel }} 卷</span>
              <span v-else class="badge bg-secondary">单卷</span>
            </td>
            <td>{{ p.questionIds?.length || 0 }}</td>
            <td class="small">{{ formatDate(p.createdAt) }}</td>
            <td class="text-end">
              <button type="button" class="btn btn-sm btn-outline-secondary me-1" @click="openDetail(p._id)">查看</button>
              <button type="button" class="btn btn-sm btn-success" :disabled="exportingId === p._id" @click="reExport(p)">
                {{ exportingId === p._id ? '导出中…' : '导出 ZIP' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="d-flex justify-content-between align-items-center mt-2">
        <span class="text-muted small">共 {{ total }} 条</span>
        <div class="btn-group btn-group-sm">
          <button type="button" class="btn btn-outline-secondary" :disabled="offset <= 0" @click="prevPage">上一页</button>
          <button type="button" class="btn btn-outline-secondary" :disabled="offset + limit >= total" @click="nextPage">下一页</button>
        </div>
      </div>
    </div>

    <div v-if="detail" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.45)">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ detail.paper.title }}</h5>
            <button type="button" class="btn-close" @click="detail = null"></button>
          </div>
          <div class="modal-body">
            <p class="small text-muted mb-3">
              蓝图：{{ detail.blueprint?.title || '—' }}
              · 种子 {{ detail.paper.randomSeed }}
              <span v-if="detail.paper.variantLabel"> · {{ detail.paper.variantLabel }} 卷</span>
            </p>
            <ul class="list-group list-group-flush small">
              <li v-for="(q, i) in detail.questions" :key="q._id" class="list-group-item">
                <span class="badge bg-secondary me-1">{{ i + 1 }}</span>
                {{ q.type }} · {{ q.totalScore }} 分
                <span v-if="q.usageCount != null" class="text-muted"> · 已用 {{ q.usageCount }} 次</span>
              </li>
            </ul>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-success" @click="reExport(detail.paper)">导出 LaTeX ZIP</button>
            <button type="button" class="btn btn-secondary" @click="detail = null">关闭</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'ExamHistory',
  data() {
    return {
      blueprints: [],
      papers: [],
      total: 0,
      limit: 20,
      offset: 0,
      loading: false,
      filterBlueprintId: '',
      filterVariant: '',
      detail: null,
      exportingId: null,
    };
  },
  mounted() {
    this.loadBlueprints();
    this.loadPapers();
  },
  methods: {
    formatDate(iso) {
      if (!iso) return '—';
      return new Date(iso).toLocaleString('zh-CN');
    },
    async loadBlueprints() {
      try {
        const { data } = await axios.get('/exam-blueprints');
        this.blueprints = data;
      } catch (e) {
        console.error(e);
      }
    },
    buildParams() {
      const params = { limit: this.limit, offset: this.offset };
      if (this.filterBlueprintId) params.blueprintId = this.filterBlueprintId;
      if (this.filterVariant === 'A' || this.filterVariant === 'B') {
        params.variantLabel = this.filterVariant;
      }
      return params;
    },
    async loadPapers() {
      this.loading = true;
      try {
        const { data } = await axios.get('/exams/papers', { params: this.buildParams() });
        let list = data.papers || [];
        if (this.filterVariant === 'single') {
          list = list.filter((p) => !p.variantLabel);
        }
        this.papers = list;
        this.total = this.filterVariant === 'single' ? list.length : (data.total || 0);
      } catch (e) {
        console.error(e);
        alert(e.response?.data?.error || '加载失败');
      } finally {
        this.loading = false;
      }
    },
    prevPage() {
      this.offset = Math.max(0, this.offset - this.limit);
      this.loadPapers();
    },
    nextPage() {
      this.offset += this.limit;
      this.loadPapers();
    },
    async openDetail(id) {
      try {
        const { data } = await axios.get(`/exams/papers/${id}`);
        const order = data.paper.questionIds || [];
        const byId = new Map((data.questions || []).map((q) => [String(q._id), q]));
        data.questions = order.map((oid) => byId.get(String(oid))).filter(Boolean);
        this.detail = data;
      } catch (e) {
        alert(e.response?.data?.error || '加载详情失败');
      }
    },
    async reExport(paperRow) {
      const id = paperRow._id;
      this.exportingId = id;
      try {
        let paperDoc = paperRow;
        if (!paperDoc.questionIds?.length) {
          const { data } = await axios.get(`/exams/papers/${id}`);
          paperDoc = data.paper;
        }
        const response = await axios.post(
          '/questions/export/latex',
          {
            questionIds: paperDoc.questionIds,
            blueprintId: paperDoc.blueprintId,
            paperId: paperDoc._id,
            metadata: {
              exportMode: 'both',
              AorB: paperDoc.variantLabel === 'B' ? 'B' : 'A',
            },
          },
          { responseType: 'blob' },
        );
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${paperDoc.title || 'mathexam'}.zip`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (e) {
        alert(e.response?.data?.error || '导出失败');
      } finally {
        this.exportingId = null;
      }
    },
  },
};
</script>
