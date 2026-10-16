<template>
  <div class="container py-4">
    <div class="page-header mb-4">
      <h1 class="h3 mb-1"><i class="bi bi-clock-history"></i> 组卷历史</h1>
      <p class="text-muted mb-0">按蓝图 / 卷别查看；A/B 成对展示，可回到向导继续编辑</p>
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
          <select v-model="filterVariant" class="form-select form-select-sm" @change="onFilterChange">
            <option value="">全部</option>
            <option value="single">单卷</option>
            <option value="ab">A/B 双卷组</option>
            <option value="A">仅 A 卷</option>
            <option value="B">仅 B 卷</option>
          </select>
        </div>
        <div class="col-md-2">
          <button type="button" class="btn btn-sm btn-outline-primary w-100" @click="loadPapers">刷新</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="text-center py-5 text-muted">加载中…</div>
    <div v-else-if="!pairs.length && !singles.length" class="alert alert-secondary">暂无组卷记录。</div>
    <template v-else>
      <div v-if="pairs.length" class="mb-4">
        <h2 class="h6 text-muted mb-2">A/B 卷组</h2>
        <div v-for="group in pairs" :key="group.variantGroupId" class="card shadow-sm mb-3">
          <div class="card-body">
            <div class="d-flex justify-content-between flex-wrap gap-2 mb-2">
              <div>
                <strong>{{ group.blueprintTitle || '未命名蓝图' }}</strong>
                <span class="text-muted small ms-2">{{ formatDate(group.createdAt) }}</span>
              </div>
            </div>
            <div class="d-flex flex-wrap gap-2">
              <div v-for="p in group.papers" :key="p._id" class="border rounded p-2 flex-grow-1" style="min-width: 200px">
                <span class="badge bg-primary me-1">{{ p.variantLabel || '?' }} 卷</span>
                {{ p.title }} · {{ p.questionIds?.length || 0 }} 题
                <div class="mt-2 btn-group btn-group-sm">
                  <button type="button" class="btn btn-outline-secondary" @click="openDetail(p._id)">查看</button>
                  <router-link
                    class="btn btn-outline-primary"
                    :to="wizardLink(p)"
                  >
                    打开向导
                  </router-link>
                  <button type="button" class="btn btn-success" :disabled="exportingId === p._id" @click="reExport(p)">
                    导出
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="singles.length">
        <h2 class="h6 text-muted mb-2">单卷</h2>
        <div class="table-responsive">
          <table class="table table-hover align-middle">
            <thead class="table-light">
              <tr>
                <th>试卷</th>
                <th>蓝图</th>
                <th>题量</th>
                <th>时间</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in singles" :key="p._id">
                <td>{{ p.title }}</td>
                <td class="small text-muted">{{ p.blueprintTitle || '—' }}</td>
                <td>{{ p.questionIds?.length || 0 }}</td>
                <td class="small">{{ formatDate(p.createdAt) }}</td>
                <td class="text-end text-nowrap">
                  <button type="button" class="btn btn-sm btn-outline-secondary me-1" @click="openDetail(p._id)">查看</button>
                  <router-link class="btn btn-sm btn-outline-primary me-1" :to="wizardLink(p)">向导</router-link>
                  <button type="button" class="btn btn-sm btn-success" :disabled="exportingId === p._id" @click="reExport(p)">ZIP</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="d-flex justify-content-between align-items-center mt-2">
        <span class="text-muted small">共 {{ total }} 条记录</span>
        <div class="btn-group btn-group-sm">
          <button type="button" class="btn btn-outline-secondary" :disabled="offset <= 0" @click="prevPage">上一页</button>
          <button type="button" class="btn btn-outline-secondary" :disabled="offset + limit >= total" @click="nextPage">下一页</button>
        </div>
      </div>
    </template>

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
              </li>
            </ul>
          </div>
          <div class="modal-footer">
            <router-link class="btn btn-primary me-auto" :to="wizardLink(detail.paper)" @click="detail = null">
              在组卷向导中打开
            </router-link>
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
      pairs: [],
      singles: [],
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
    wizardLink(paper) {
      const q = { paperId: paper._id };
      if (paper.blueprintId) q.blueprintId = paper.blueprintId;
      return { name: 'exam-wizard', query: q };
    },
    formatDate(iso) {
      if (!iso) return '—';
      return new Date(iso).toLocaleString('zh-CN');
    },
    onFilterChange() {
      this.offset = 0;
      this.loadPapers();
    },
    async loadBlueprints() {
      const { data } = await axios.get('/exam-blueprints');
      this.blueprints = data;
    },
    buildParams() {
      const params = { limit: this.limit, offset: this.offset, groupAb: 'true' };
      if (this.filterBlueprintId) params.blueprintId = this.filterBlueprintId;
      if (this.filterVariant === 'A' || this.filterVariant === 'B') {
        params.variantLabel = this.filterVariant;
      } else if (this.filterVariant === 'single') {
        params.variantScope = 'single';
      } else if (this.filterVariant === 'ab') {
        params.variantScope = 'ab';
      }
      return params;
    },
    async loadPapers() {
      this.loading = true;
      try {
        const { data } = await axios.get('/exams/papers', { params: this.buildParams() });
        this.pairs = data.pairs || [];
        this.singles = data.singles || [];
        this.total = data.totalEntries ?? data.total ?? 0;
      } catch (e) {
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
      const { data } = await axios.get(`/exams/papers/${id}`);
      const order = data.paper.questionIds || [];
      const byId = new Map((data.questions || []).map((q) => [String(q._id), q]));
      data.questions = order.map((oid) => byId.get(String(oid))).filter(Boolean);
      this.detail = data;
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
