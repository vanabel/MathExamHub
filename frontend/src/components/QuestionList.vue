<template>
  <div class="question-list-container">
    <div class="container">
      <div class="page-header mb-4">
        <div class="list-header-row list-header-row--top">
          <div>
            <h1 class="page-title mb-1">
              <i class="bi bi-list-ul"></i> 试题列表
            </h1>
            <p class="text-muted mb-0">
              <i class="bi bi-bar-chart"></i> 共 {{ totalCount }} 道题目
              <span v-if="totalCount > questions.length" class="ms-1">（本页 {{ questions.length }}）</span>
            </p>
          </div>
          <div class="list-header-actions d-flex gap-2 align-items-center flex-shrink-0">
            <button
              type="button"
              class="btn btn-outline-secondary btn-sm d-md-none"
              data-testid="question-list-toggle-filters"
              @click="filtersOpen = !filtersOpen"
            >
              <i class="bi bi-funnel"></i> 筛选
            </button>
            <div class="dropdown">
              <button
                class="btn btn-outline-secondary btn-sm dropdown-toggle"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                data-testid="question-list-more-menu"
              >
                导入 / 导出
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><router-link class="dropdown-item" to="/latex-import">LaTeX 导入</router-link></li>
                <li><router-link class="dropdown-item" to="/latex-export">LaTeX 导出</router-link></li>
              </ul>
            </div>
            <kp-graph-nav-link link-class="btn btn-outline-secondary btn-sm">
              知识图谱
            </kp-graph-nav-link>
            <router-link to="/question-add" class="btn btn-primary btn-sm" data-testid="question-list-add">
              <i class="bi bi-plus-lg"></i> 添加题目
            </router-link>
          </div>
        </div>

        <div
          class="filter-toolbar mt-3"
          :class="{ 'd-none d-md-flex': !filtersOpen, 'd-flex': filtersOpen }"
          data-testid="question-list-filters"
        >
          <div class="filter-toolbar__search">
            <div class="input-group input-group-sm filter-control">
              <span class="input-group-text bg-white"><i class="bi bi-search"></i></span>
              <input
                v-model="searchQuery"
                type="search"
                class="form-control"
                placeholder="搜索题目…"
                data-testid="question-list-search"
                @input="handleSearch"
              />
            </div>
          </div>
          <select
            v-model="subjectFilter"
            class="form-select form-select-sm filter-control filter-toolbar__select filter-toolbar__subject"
            data-testid="question-list-subject"
            @change="onFilterChange"
          >
            <option value="">全部科目</option>
            <option v-for="s in facetSubjects" :key="s.value" :value="s.value">
              {{ s.value }}{{ facetSuffix('subject', s.value) }}
            </option>
          </select>
          <select
            v-model="typeFilter"
            class="form-select form-select-sm filter-control filter-toolbar__select"
            data-testid="question-list-type"
            @change="onFilterChange"
          >
            <option value="">全部题型</option>
            <option v-for="t in questionTypes" :key="t" :value="t">
              {{ t }}{{ facetSuffix('type', t) }}
            </option>
          </select>
          <select
            v-model="difficultyFilter"
            class="form-select form-select-sm filter-control filter-toolbar__select"
            data-testid="question-list-difficulty"
            @change="onFilterChange"
          >
            <option value="">全部难度</option>
            <option v-for="d in difficultyOptions" :key="d" :value="d">
              {{ d }}{{ facetSuffix('difficulty', d) }}
            </option>
          </select>
          <div class="filter-toolbar__score input-group input-group-sm filter-control">
            <span class="input-group-text">分值</span>
            <input
              v-model="minScoreFilter"
              type="number"
              min="0"
              class="form-control form-control-sm filter-toolbar__score-input"
              placeholder="最小"
              data-testid="question-list-min-score"
              @change="onScoreFilterChange"
            />
            <span class="input-group-text px-1">–</span>
            <input
              v-model="maxScoreFilter"
              type="number"
              min="0"
              class="form-control form-control-sm filter-toolbar__score-input"
              placeholder="最大"
              data-testid="question-list-max-score"
              @change="onScoreFilterChange"
            />
          </div>
          <select
            v-model="kpFilter"
            class="form-select form-select-sm filter-control filter-toolbar__select filter-toolbar__kp"
            data-testid="question-list-kp"
            @change="onFilterChange"
          >
            <option value="">全部知识点</option>
            <option v-for="kp in kpTreeFlat" :key="kp._id" :value="kp._id">
              {{ kpTreeIndent(kp.depth) }}{{ kp.path || kp.name }}
            </option>
          </select>
        </div>

        <div
          v-if="activeFilterChips.length"
          class="filter-chips mt-2 d-flex flex-wrap align-items-center gap-2"
          data-testid="question-list-filter-chips"
        >
          <span
            v-for="chip in activeFilterChips"
            :key="chip.key"
            class="badge rounded-pill text-bg-light border filter-chip"
          >
            {{ chip.label }}
            <button type="button" class="btn-close btn-close-sm ms-1" :aria-label="'移除' + chip.label" @click="removeFilterChip(chip.key)"></button>
          </span>
          <button type="button" class="btn btn-link btn-sm p-0" data-testid="question-list-clear-filters" @click="clearFilters">
            清除筛选
          </button>
        </div>
      </div>

      <div v-if="gapBatchActive" class="alert alert-warning d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div class="small">
          <strong>覆盖缺口批量查看</strong>
          <span v-if="gapBatchSeed != null" class="text-muted ms-1">（种子 {{ gapBatchSeed }}）</span>
          — 第 {{ gapBatchIndex + 1 }} / {{ gapBatchGaps.length }} 项：
          {{ currentGapLabel }}
        </div>
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="gapBatchIndex <= 0" @click="prevGapBatch">
            上一缺口
          </button>
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary"
            :disabled="gapBatchIndex >= gapBatchGaps.length - 1"
            @click="nextGapBatch"
          >
            下一缺口
          </button>
          <button type="button" class="btn btn-sm btn-outline-dark" @click="clearGapBatch">
            退出
          </button>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="text-center py-5" data-testid="question-list-loading">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">加载中...</span>
        </div>
        <p class="text-muted small mt-2 mb-0">正在加载题目…</p>
      </div>

      <!-- 搜索结果提示 -->
      <div
        v-if="searchQuery && questions.length === 0 && !loading"
        class="alert alert-info"
        data-testid="question-list-search-empty"
      >
        <i class="bi bi-info-circle"></i> 未找到匹配的题目，请尝试其他关键词
        <button type="button" class="btn btn-link btn-sm p-0 ms-2" @click="clearFilters">清除筛选</button>
      </div>

      <div
        v-if="!loading && questions.length === 0 && !searchQuery && hasActiveFilters"
        class="alert alert-secondary text-center py-4"
        data-testid="question-list-filter-empty"
      >
        <i class="bi bi-funnel display-6 d-block mb-2 text-muted"></i>
        <p class="mb-2">当前筛选条件下没有题目</p>
        <button type="button" class="btn btn-sm btn-outline-primary" data-testid="question-list-clear-filters-empty" @click="clearFilters">
          清除全部筛选
        </button>
      </div>

      <div
        v-if="totalCount > 0"
        class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 pagination-bar"
        data-testid="question-list-pagination"
      >
        <div class="d-flex align-items-center gap-2 flex-wrap">
          <label class="small text-muted mb-0">每页</label>
          <select
            v-model.number="pageSize"
            class="form-select form-select-sm"
            style="width: auto"
            data-testid="question-list-page-size"
            @change="onPageSizeChange"
          >
            <option v-for="n in pageSizeOptions" :key="n" :value="n">{{ n }}</option>
          </select>
          <span class="small text-muted">
            第 {{ rangeStart }}–{{ rangeEnd }} 条，共 {{ totalCount }} 条
          </span>
        </div>
        <div class="d-flex align-items-center gap-2 flex-wrap">
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary"
            data-testid="question-list-prev-page"
            :disabled="currentPage <= 1"
            @click="goToPage(currentPage - 1)"
          >
            上一页
          </button>
          <span class="small text-muted">第 {{ currentPage }} / {{ totalPages }} 页</span>
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary"
            data-testid="question-list-next-page"
            :disabled="currentPage >= totalPages"
            @click="goToPage(currentPage + 1)"
          >
            下一页
          </button>
          <div class="input-group input-group-sm" style="width: 7rem">
            <input
              v-model.number="pageJumpInput"
              type="number"
              min="1"
              :max="totalPages"
              class="form-control"
              data-testid="question-list-page-jump"
            />
            <button type="button" class="btn btn-outline-secondary" @click="jumpToPage">跳转</button>
          </div>
        </div>
      </div>

      <!-- 题目列表 -->
      <div v-if="!loading && questions.length > 0" class="row g-4">
        <div
          v-for="question in questions"
          :key="question._id"
          class="col-12 col-md-6 col-lg-4"
        >
          <div class="card question-card h-100">
            <div class="card-body">
              <!-- 题目头部信息 -->
              <div class="question-header mb-3">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <span class="badge bg-primary">{{ question.subject }}</span>
                  <span class="badge" :class="getDifficultyClass(question.difficulty)">
                    {{ question.difficulty }}
                  </span>
                </div>
                <span class="badge bg-secondary">{{ question.type }}</span>
                <span class="badge bg-info ms-2">{{ question.totalScore }} 分</span>
                <span
                  v-if="question.qualityIssues && question.qualityIssues.includes('step_score_mismatch')"
                  class="badge bg-warning text-dark ms-1"
                  title="逐步 \\score 之和与总分不一致"
                >步骤分不一致</span>
                <span v-if="question.usageCount" class="badge bg-light text-dark ms-1">已用 {{ question.usageCount }} 次</span>
              </div>

              <!-- 题目内容：先转成 HTML，再由 MathJax / PDF.js 排版 -->
              <div class="question-content mb-3">
                <div
                  class="question-text-content"
                  v-html="processQuestionTextToHTML(question.questionText, question.originalLaTeX, questionRenderOptions(question))"
                ></div>
                <div
                  v-if="question.images && question.images.length"
                  class="question-images mt-2"
                  v-html="renderQuestionImagesHtml(question.images)"
                ></div>
              </div>

              <!-- 选项（如果是选择题） -->
              <div v-if="question.type === '单选题' || question.type === '多选题'" class="question-options mb-3">
                <ChoiceOptionsList :options="question.options">
                  <template #default="{ entry }">
                    <div v-html="processQuestionTextToHTML(entry.text)"></div>
                  </template>
                </ChoiceOptionsList>
              </div>

              <!-- 答案 -->
              <div v-if="showAnswerBlock(question)" class="question-answer">
                <strong>答案：</strong>
                <div class="answer-text-content" v-html="renderAnswer(answerForDisplay(question))"></div>
              </div>
              <div v-if="showSolutionBlock(question)" class="question-solution mt-2">
                <strong>解答：</strong>
                <div class="solution-text-content" v-html="renderAnswer(question.solution)"></div>
              </div>

              <!-- 操作按钮 -->
              <div class="question-actions mt-3 pt-3 border-top">
                <router-link
                  :to="`/question-edit/${question._id}`"
                  class="btn btn-sm btn-outline-primary"
                >
                  <i class="bi bi-pencil"></i> 编辑
                </router-link>
                <button
                  @click="deleteQuestion(question._id)"
                  class="btn btn-sm btn-outline-danger ms-2"
                >
                  <i class="bi bi-trash"></i> 删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态（无筛选、题库为空） -->
      <div
        v-else-if="!loading && questions.length === 0 && !searchQuery && !hasActiveFilters"
        class="empty-state text-center py-5"
        data-testid="question-list-empty-bank"
      >
        <i class="bi bi-inbox display-1 text-muted"></i>
        <p class="text-muted mt-3">暂无题目，点击上方"添加题目"开始创建</p>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import {
  processQuestionTextToHTML,
  processAnswerTextToHTML,
  renderQuestionImagesHtml,
} from "../utils/latexProcessor";
import ChoiceOptionsList from "./ChoiceOptionsList.vue";
import { shouldUseChoiceOptionLabels } from "../utils/choiceOptions";
import { answerForDisplay, showAnswerBlock, showSolutionBlock } from "../utils/questionAnswerDisplay";
import {
  loadCoverageGapBatch,
  COVERAGE_GAP_BATCH_KEY,
} from "../utils/coverageGapBatch";
import { flattenKnowledgePointTree, kpTreeIndent } from "../utils/knowledgePointTree";
import KpGraphNavLink from "./KpGraphNavLink.vue";

export default {
  name: "QuestionList",
  components: { ChoiceOptionsList, KpGraphNavLink },
  data() {
    return {
      questions: [],
      loading: true,
      searchQuery: "",
      knowledgePoints: [],
      kpFilter: "",
      subjectFilter: "",
      typeFilter: "",
      difficultyFilter: "",
      exactScoreFilter: "",
      minScoreFilter: "",
      maxScoreFilter: "",
      questionTypes: ['判断题', '单选题', '多选题', '填空题', '简答题', '解答题', '计算题', '证明题', '作图题'],
      difficultyOptions: ['易', '中', '难'],
      pageSizeOptions: [10, 20, 50, 100],
      totalCount: 0,
      pageSize: 20,
      currentPage: 1,
      pageJumpInput: 1,
      facets: { subject: [], type: [], difficulty: [] },
      filtersOpen: false,
      searchTimer: null,
      routeSyncToken: 0,
      gapBatchGaps: [],
      gapBatchIndex: 0,
      gapBatchSeed: null,
    };
  },
  computed: {
    gapBatchActive() {
      return this.gapBatchGaps.length > 0;
    },
    currentGapLabel() {
      const g = this.gapBatchGaps[this.gapBatchIndex];
      if (!g) return '';
      return g.message || g.sectionType || '缺口';
    },
    kpTreeFlat() {
      return flattenKnowledgePointTree(this.knowledgePoints);
    },
    facetSubjects() {
      return this.facets.subject || [];
    },
    totalPages() {
      return Math.max(1, Math.ceil(this.totalCount / this.pageSize) || 1);
    },
    rangeStart() {
      if (!this.totalCount) return 0;
      return (this.currentPage - 1) * this.pageSize + 1;
    },
    rangeEnd() {
      return Math.min(this.currentPage * this.pageSize, this.totalCount);
    },
    activeFilterChips() {
      const chips = [];
      if (this.searchQuery.trim()) {
        chips.push({ key: 'q', label: `搜索：${this.searchQuery.trim()}` });
      }
      if (this.subjectFilter.trim()) {
        chips.push({ key: 'subject', label: `科目：${this.subjectFilter.trim()}` });
      }
      if (this.typeFilter) chips.push({ key: 'type', label: `题型：${this.typeFilter}` });
      if (this.difficultyFilter) chips.push({ key: 'difficulty', label: `难度：${this.difficultyFilter}` });
      if (this.kpFilter) {
        chips.push({ key: 'kp', label: `知识点：${this.kpPathLabel(this.kpFilter)}` });
      }
      if (this.exactScoreFilter !== '' && this.exactScoreFilter != null) {
        chips.push({ key: 'score', label: `分值 = ${this.exactScoreFilter}` });
      } else {
        if (this.minScoreFilter !== '' && this.minScoreFilter != null) {
          chips.push({ key: 'minScore', label: `分值 ≥ ${this.minScoreFilter}` });
        }
        if (this.maxScoreFilter !== '' && this.maxScoreFilter != null) {
          chips.push({ key: 'maxScore', label: `分值 ≤ ${this.maxScoreFilter}` });
        }
      }
      return chips;
    },
    hasActiveFilters() {
      return this.activeFilterChips.length > 0;
    },
  },
  mounted() {
    this.initGapBatchFromRoute();
    this.readFiltersFromRoute();
    this.loadKnowledgePoints();
    this.pushFiltersToRoute();
  },
  watch: {
    '$route.query': {
      handler() {
        if (this.routeSyncToken > 0) return;
        this.readFiltersFromRoute();
        this.fetchQuestionList();
      },
      deep: true,
    },
    '$route.query.gapBatch'() {
      this.initGapBatchFromRoute();
    },
    currentPage(val) {
      this.pageJumpInput = val;
    },
  },
  updated() {
    this.$nextTick(() => {
      setTimeout(() => {
        this.renderMathJax();
        const rendering = document.querySelectorAll('.pdf-canvas[data-rendering="true"]').length > 0;
        if (!rendering) this.renderPDFs();
      }, 80);
    });
  },
  methods: {
    processQuestionTextToHTML,
    processAnswerTextToHTML,
    renderQuestionImagesHtml,
    showAnswerBlock,
    showSolutionBlock,
    answerForDisplay,
    questionRenderOptions(question) {
      const opts = question && question.options;
      const hasOptions = opts && typeof opts === 'object' && Object.keys(opts).length > 0;
      return {
        hasOptions,
        mode: 'question',
        questionType: question?.type || '',
        choiceOptionLabels: shouldUseChoiceOptionLabels({
          questionType: question?.type,
          hasOptions,
          questionText: question?.questionText,
          originalLaTeX: question?.originalLaTeX,
        }),
      };
    },
    renderAnswer(content) {
      return processAnswerTextToHTML(this.answerToText(content));
    },
    renderMathJax() {
      if (window.MathJax && window.MathJax.Hub) {
        window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub, this.$el]);
      }
    },
    renderPDFs() {
      if (typeof window.pdfjsLib === "undefined") return;
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      this.$el.querySelectorAll(".pdf-container[data-pdf-url]").forEach((container) => {
        const pdfUrl = container.getAttribute("data-pdf-url");
        const canvas = container.querySelector(".pdf-canvas");
        if (!canvas || !pdfUrl || canvas.dataset.rendered === "true" || canvas.dataset.rendering === "true") {
          return;
        }
        canvas.dataset.rendering = "true";
        window.pdfjsLib.getDocument({ url: pdfUrl, withCredentials: true }).promise
          .then((pdf) => pdf.getPage(1))
          .then((page) => {
            const viewport = page.getViewport({ scale: 1.2 });
            const maxWidth = container.clientWidth || 640;
            const scale = Math.min(1.2, maxWidth / viewport.width);
            const fitted = page.getViewport({ scale });
            canvas.height = fitted.height;
            canvas.width = fitted.width;
            return page.render({ canvasContext: canvas.getContext("2d"), viewport: fitted }).promise;
          })
          .then(() => {
            canvas.dataset.rendered = "true";
            canvas.dataset.rendering = "false";
          })
          .catch((error) => {
            canvas.dataset.rendering = "false";
            if (error && error.name === "RenderingCancelledException") return;
            console.error("PDF 加载错误:", error);
          });
      });
    },
    initGapBatchFromRoute() {
      if (this.$route.query?.gapBatch !== '1') {
        return;
      }
      const batch = loadCoverageGapBatch();
      if (!batch) return;
      this.gapBatchGaps = batch.gaps;
      this.gapBatchSeed = batch.seed ?? null;
      this.gapBatchIndex = 0;
      this.applyGapListQuery(this.gapBatchGaps[0]?.listQuery);
    },
    kpTreeIndent,
    facetSuffix(dimension, value) {
      const rows = this.facets[dimension] || [];
      const hit = rows.find((r) => r.value === value);
      return hit ? ` (${hit.count})` : '';
    },
    applyGapListQuery(listQuery) {
      if (!listQuery) return;
      this.typeFilter = listQuery.type ? String(listQuery.type) : '';
      this.difficultyFilter = listQuery.difficulty ? String(listQuery.difficulty) : '';
      this.kpFilter = listQuery.knowledgePointId ? String(listQuery.knowledgePointId) : '';
      this.subjectFilter = listQuery.subject ? String(listQuery.subject) : '';
      this.exactScoreFilter = '';
      this.minScoreFilter = listQuery.minScore != null && listQuery.minScore !== ''
        ? Number(listQuery.minScore)
        : '';
      this.maxScoreFilter = listQuery.maxScore != null && listQuery.maxScore !== ''
        ? Number(listQuery.maxScore)
        : '';
      this.currentPage = 1;
    },
    prevGapBatch() {
      if (this.gapBatchIndex <= 0) return;
      this.gapBatchIndex -= 1;
      this.applyGapListQuery(this.gapBatchGaps[this.gapBatchIndex]?.listQuery);
      this.pushFiltersToRoute();
    },
    nextGapBatch() {
      if (this.gapBatchIndex >= this.gapBatchGaps.length - 1) return;
      this.gapBatchIndex += 1;
      this.applyGapListQuery(this.gapBatchGaps[this.gapBatchIndex]?.listQuery);
      this.pushFiltersToRoute();
    },
    clearGapBatch() {
      this.gapBatchGaps = [];
      this.gapBatchIndex = 0;
      this.gapBatchSeed = null;
      sessionStorage.removeItem(COVERAGE_GAP_BATCH_KEY);
      const q = { ...this.$route.query };
      delete q.gapBatch;
      this.$router.replace({ query: q });
    },
    readFiltersFromRoute() {
      const q = this.$route.query || {};
      if (q.gapBatch === '1' && this.gapBatchGaps.length) {
        this.applyGapListQuery(this.gapBatchGaps[this.gapBatchIndex]?.listQuery);
        return;
      }
      this.searchQuery = q.q ? String(q.q) : '';
      this.subjectFilter = q.subject ? String(q.subject) : '';
      this.typeFilter = q.type ? String(q.type) : '';
      this.difficultyFilter = q.difficulty ? String(q.difficulty) : '';
      this.kpFilter = q.knowledgePointId ? String(q.knowledgePointId) : '';
      this.exactScoreFilter = q.score != null && q.score !== '' ? Number(q.score) : '';
      this.minScoreFilter = q.minScore != null && q.minScore !== '' ? Number(q.minScore) : '';
      this.maxScoreFilter = q.maxScore != null && q.maxScore !== '' ? Number(q.maxScore) : '';
      const ps = parseInt(q.pageSize, 10);
      this.pageSize = this.pageSizeOptions.includes(ps) ? ps : 20;
      this.currentPage = Math.max(parseInt(q.page, 10) || 1, 1);
      this.pageJumpInput = this.currentPage;
    },
    buildRouteQuery() {
      const q = {};
      if (this.searchQuery.trim()) q.q = this.searchQuery.trim();
      if (this.subjectFilter.trim()) q.subject = this.subjectFilter.trim();
      if (this.typeFilter) q.type = this.typeFilter;
      if (this.difficultyFilter) q.difficulty = this.difficultyFilter;
      if (this.kpFilter) q.knowledgePointId = this.kpFilter;
      if (this.exactScoreFilter !== '' && this.exactScoreFilter != null) {
        q.score = String(this.exactScoreFilter);
      } else {
        if (this.minScoreFilter !== '' && this.minScoreFilter != null) q.minScore = String(this.minScoreFilter);
        if (this.maxScoreFilter !== '' && this.maxScoreFilter != null) q.maxScore = String(this.maxScoreFilter);
      }
      q.page = String(this.currentPage);
      q.pageSize = String(this.pageSize);
      if (this.$route.query?.gapBatch === '1') q.gapBatch = '1';
      return q;
    },
    pushFiltersToRoute() {
      const next = this.buildRouteQuery();
      const cur = this.$route.query || {};
      const runFetch = () => this.fetchQuestionList();
      if (JSON.stringify(next) === JSON.stringify(cur)) {
        runFetch();
        return;
      }
      this.routeSyncToken += 1;
      this.$router.replace({ query: next }).finally(() => {
        this.$nextTick(() => {
          this.routeSyncToken = Math.max(0, this.routeSyncToken - 1);
          runFetch();
        });
      });
    },
    kpPathLabel(id) {
      const hit = this.kpTreeFlat.find((k) => String(k._id) === String(id));
      return hit?.path || hit?.name || id;
    },
    removeFilterChip(key) {
      const map = {
        q: () => { this.searchQuery = ''; },
        subject: () => { this.subjectFilter = ''; },
        type: () => { this.typeFilter = ''; },
        difficulty: () => { this.difficultyFilter = ''; },
        kp: () => { this.kpFilter = ''; },
        score: () => { this.exactScoreFilter = ''; },
        minScore: () => { this.minScoreFilter = ''; },
        maxScore: () => { this.maxScoreFilter = ''; },
      };
      map[key]?.();
      this.currentPage = 1;
      this.pushFiltersToRoute();
    },
    clearFilters() {
      this.searchQuery = '';
      this.subjectFilter = '';
      this.typeFilter = '';
      this.difficultyFilter = '';
      this.kpFilter = '';
      this.exactScoreFilter = '';
      this.minScoreFilter = '';
      this.maxScoreFilter = '';
      this.currentPage = 1;
      this.pushFiltersToRoute();
    },
    async loadKnowledgePoints() {
      try {
        const { data } = await axios.get("/knowledge-points/tree");
        this.knowledgePoints = data.nodes || [];
      } catch (e) {
        console.error("加载知识点失败", e);
      }
    },
    onFilterChange() {
      this.currentPage = 1;
      this.pushFiltersToRoute();
    },
    onScoreFilterChange() {
      if (this.exactScoreFilter !== '' && this.exactScoreFilter != null) {
        this.minScoreFilter = '';
        this.maxScoreFilter = '';
      }
      this.onFilterChange();
    },
    onPageSizeChange() {
      this.currentPage = 1;
      this.pushFiltersToRoute();
    },
    goToPage(page) {
      const p = Math.min(Math.max(page, 1), this.totalPages);
      if (p === this.currentPage) return;
      this.currentPage = p;
      this.pushFiltersToRoute();
    },
    jumpToPage() {
      const p = parseInt(this.pageJumpInput, 10);
      if (Number.isNaN(p)) return;
      this.goToPage(p);
    },
    listRequestParams() {
      const params = {
        page: this.currentPage,
        pageSize: this.pageSize,
        facets: 'true',
        includeQuality: 'true',
      };
      if (this.kpFilter) {
        params.knowledgePointId = this.kpFilter;
        params.subtree = 'true';
      }
      if (this.subjectFilter.trim()) params.subject = this.subjectFilter.trim();
      if (this.typeFilter) params.type = this.typeFilter;
      if (this.difficultyFilter) params.difficulty = this.difficultyFilter;
      if (this.exactScoreFilter !== '' && this.exactScoreFilter != null) {
        params.score = this.exactScoreFilter;
      } else {
        if (this.minScoreFilter !== '' && this.minScoreFilter != null) params.minScore = this.minScoreFilter;
        if (this.maxScoreFilter !== '' && this.maxScoreFilter != null) params.maxScore = this.maxScoreFilter;
      }
      if (this.searchQuery.trim()) params.q = this.searchQuery.trim();
      return params;
    },
    async fetchQuestionList() {
      this.loading = true;
      try {
        const response = await axios.get('/questions/list', { params: this.listRequestParams() });
        const data = response.data;
        if (Array.isArray(data)) {
          this.questions = data;
          this.totalCount = data.length;
          this.facets = { subject: [], type: [], difficulty: [] };
        } else {
          this.questions = data.questions || [];
          this.totalCount = data.total ?? this.questions.length;
          if (data.page) this.currentPage = data.page;
          if (data.facets) this.facets = data.facets;
        }
        if (this.currentPage > this.totalPages) {
          this.currentPage = this.totalPages;
          this.pushFiltersToRoute();
        }
      } catch (error) {
        console.error('Failed to retrieve question list:', error);
      } finally {
        this.loading = false;
      }
    },
    handleSearch() {
      this.currentPage = 1;
      if (this.searchTimer) clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this.pushFiltersToRoute();
      }, 350);
    },
    answerToText(content) {
      if (content == null) return "";
      if (typeof content === "string") return content;
      if (Array.isArray(content)) return content.map((part) => this.answerToText(part)).join("；");
      if (typeof content === "object") {
        return Object.keys(content)
          .sort((a, b) => Number(a) - Number(b))
          .map((key) => this.answerToText(content[key]))
          .join("；");
      }
      return String(content);
    },
    getDifficultyClass(difficulty) {
      const classes = {
        易: "bg-success",
        中: "bg-warning",
        难: "bg-danger",
        简单: "bg-success",
        中等: "bg-warning",
        较难: "bg-danger",
      };
      return classes[difficulty] || "bg-secondary";
    },
    async deleteQuestion(id) {
      if (!confirm("确定要删除这道题目吗？")) {
        return;
      }

      try {
        await axios.delete(`/questions/${id}/delete`);
        await this.fetchQuestionList();
      } catch (error) {
        console.error("删除失败:", error);
        alert("删除失败，请稍后重试");
      }
    },
  },
};
</script>

<style scoped>
.question-list-container {
  padding: 2rem 0;
}

.page-header {
  background: white;
  padding: 1.5rem 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.page-title {
  color: #333;
  font-weight: 700;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.page-title i {
  font-size: 1.5rem;
}

.question-text-content,
.answer-text-content,
.option-item {
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.question-text-content :deep(img),
.answer-text-content :deep(img) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0.75rem auto;
}

.question-card {
  transition: all 0.3s ease;
  border: 1px solid #e9ecef;
}

.question-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.question-header {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.badge {
  padding: 0.5rem 0.75rem;
  font-weight: 500;
  border-radius: 6px;
}

.question-content {
  min-height: 60px;
  color: #333;
  font-size: 1rem;
  line-height: 1.6;
}

.question-options {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
}

.option-item {
  margin-bottom: 0.5rem;
  color: #555;
}

.question-answer {
  background: #e7f3ff;
  padding: 0.75rem;
  border-radius: 8px;
  border-left: 3px solid #667eea;
  font-size: 0.95rem;
}

.question-solution {
  background: #f0fdf4;
  padding: 0.75rem;
  border-radius: 8px;
  border-left: 3px solid #22c55e;
  font-size: 0.95rem;
}

.question-actions {
  display: flex;
  gap: 0.5rem;
}

.empty-state {
  background: white;
  padding: 4rem 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.list-header-row--top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-toolbar {
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  background: #f8f9fa;
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
}

.filter-toolbar__search {
  flex: 1 1 220px;
  min-width: 220px;
}

.filter-toolbar__select {
  flex: 0 0 auto;
  width: 130px;
  max-width: 130px;
}

.filter-toolbar__subject {
  width: 130px;
  max-width: 130px;
}

.filter-toolbar__kp {
  width: 200px;
  max-width: 200px;
}

.filter-toolbar__score {
  flex: 0 0 auto;
  width: 180px;
  max-width: 180px;
}

.filter-toolbar__score-input {
  min-width: 0;
  flex: 1 1 60px;
}

.filter-toolbar__score input[type="number"]::-webkit-outer-spin-button,
.filter-toolbar__score input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.filter-toolbar__score input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.filter-control .input-group-text {
  font-size: 0.8125rem;
  padding-left: 0.45rem;
  padding-right: 0.45rem;
}

.filter-toolbar .form-select-sm,
.filter-toolbar .filter-control .form-control-sm {
  line-height: 1.5;
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
}

.filter-toolbar .form-select-sm {
  width: 100%;
}

.filter-chip {
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.55rem;
}

.filter-chip .btn-close {
  font-size: 0.55rem;
}

.pagination-bar {
  background: white;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

@media (min-width: 768px) {
  .filter-toolbar__search {
    flex: 1 1 220px;
  }
}

@media (max-width: 767.98px) {
  .question-list-container {
    padding: 1rem 0;
  }

  .page-header {
    padding: 1.5rem;
  }

  .filter-toolbar.d-flex {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-toolbar__search,
  .filter-toolbar__select,
  .filter-toolbar__kp,
  .filter-toolbar__score {
    width: 100%;
    max-width: none;
  }
}
</style>
