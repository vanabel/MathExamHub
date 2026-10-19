<template>
  <div class="app-page app-container container-xl py-4">
    <page-header
      title="题库统计"
      subtitle="题目分布、知识点覆盖与蓝图抽题缺口（与 examGenerator 规则一致；CSV 含缺口 listQuery 列）。"
      icon="bi-bar-chart"
      test-id="bank-stats-header"
    >
      <template #actions>
        <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="!stats" @click="exportCsv">
          导出 CSV
        </button>
      </template>
    </page-header>

    <div v-if="loading" class="text-muted">加载中…</div>
    <template v-else-if="stats">
      <div class="row g-3 mb-4">
        <div class="col-md-3">
          <div class="card shadow-sm">
            <div class="card-body">
              <div class="text-muted small">题目总数</div>
              <div class="display-6">{{ stats.totalQuestions }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3">
        <div class="col-lg-6">
          <div class="card shadow-sm">
            <div class="card-header">按题型</div>
            <div class="card-body">
              <div v-for="row in stats.byType" :key="row.type" class="mb-2">
                <div class="d-flex justify-content-between small mb-1">
                  <span>{{ row.type }}</span><span>{{ row.count }}</span>
                </div>
                <div class="progress" style="height: 8px">
                  <div
                    class="progress-bar bg-primary"
                    role="progressbar"
                    :style="{ width: barPct(row.count, maxTypeCount) + '%' }"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-lg-6">
          <div class="card shadow-sm">
            <div class="card-header">按难度</div>
            <div class="card-body">
              <div v-for="(count, diff) in stats.byDifficulty" :key="diff" class="mb-2">
                <div class="d-flex justify-content-between small mb-1">
                  <span>{{ diff }}</span><span>{{ count }}</span>
                </div>
                <div class="progress" style="height: 8px">
                  <div
                    class="progress-bar bg-secondary"
                    role="progressbar"
                    :style="{ width: barPct(count, maxDifficultyCount) + '%' }"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card shadow-sm mt-3">
        <div class="card-header">知识点 Top 10</div>
        <div class="card-body">
          <p v-if="!topKnowledgePoints.length" class="text-muted small mb-0 app-empty__hint">
            暂无已标注知识点的题目。导入知识点并为题目打标后，此处会显示 Top 10。
          </p>
          <div v-for="row in topKnowledgePoints" :key="row.knowledgePointId" class="mb-2">
            <div class="d-flex justify-content-between small mb-1">
              <span class="text-truncate me-2">{{ row.path }}</span><span>{{ row.count }}</span>
            </div>
            <div class="progress" style="height: 6px">
              <div
                class="progress-bar bg-info"
                role="progressbar"
                :style="{ width: barPct(row.count, maxKpCount) + '%' }"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="card shadow-sm mt-3">
        <div class="card-header">蓝图覆盖缺口</div>
        <p v-if="!stats.blueprintCoverageGaps.length" class="card-body text-muted mb-0">暂无缺口（或尚无蓝图）。</p>
        <div v-else class="table-responsive">
          <table class="table table-sm mb-0">
            <thead>
              <tr>
                <th>蓝图</th>
                <th>Section</th>
                <th>题型</th>
                <th>说明</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(g, i) in stats.blueprintCoverageGaps" :key="i">
                <td>{{ g.blueprintTitle }}</td>
                <td>#{{ (g.sectionIndex ?? 0) + 1 }}<span v-if="g.slot != null"> · 槽 {{ g.slot + 1 }}</span></td>
                <td>{{ g.type }}</td>
                <td class="small">{{ g.message || formatGapMeta(g) }}</td>
                <td>
                  <router-link
                    v-if="g.listQuery"
                    class="btn btn-sm btn-outline-primary"
                    :to="{ name: 'question-list', query: g.listQuery }"
                  >
                    筛选
                  </router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import axios from 'axios';
import PageHeader from '@/components/ui/PageHeader.vue';

export default {
  name: 'BankStatsView',
  components: { PageHeader },
  data() {
    return { stats: null, loading: false };
  },
  computed: {
    maxTypeCount() {
      return Math.max(1, ...(this.stats?.byType || []).map((r) => r.count));
    },
    maxDifficultyCount() {
      const vals = Object.values(this.stats?.byDifficulty || {});
      return Math.max(1, ...vals, 0);
    },
    maxKpCount() {
      return Math.max(1, ...(this.topKnowledgePoints || []).map((r) => r.count));
    },
    topKnowledgePoints() {
      return (this.stats?.byKnowledgePoint || []).slice(0, 10);
    },
  },
  mounted() {
    this.load();
  },
  methods: {
    barPct(value, max) {
      return Math.min(100, Math.round((Number(value) / Number(max)) * 100));
    },
    async exportCsv() {
      try {
        const res = await axios.get('/questions/stats/dashboard.csv', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bank-stats.csv';
        a.click();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        alert(err.response?.data?.error || '导出失败');
      }
    },
    formatGapMeta(g) {
      const parts = [];
      if (g.neededDifficulty) parts.push(`难度 ${g.neededDifficulty}`);
      if (g.scoreEach != null) parts.push(`分值≈${g.scoreEach}`);
      return parts.join(' · ') || '—';
    },
    async load() {
      this.loading = true;
      try {
        const { data } = await axios.get('/questions/stats/dashboard');
        this.stats = data;
      } catch (err) {
        alert(err.response?.data?.error || '加载统计失败');
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>
