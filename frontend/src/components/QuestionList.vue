<template>
  <div class="question-list-container">
    <div class="container">
      <!-- 页面头部：标题 + 搜索 + 统计 -->
      <div class="page-header mb-4">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <h1 class="page-title mb-1">
              <i class="bi bi-list-ul"></i> 试题列表
            </h1>
            <p class="text-muted mb-0">
              <i class="bi bi-bar-chart"></i> 共 {{ totalCount }} 道题目
              <span v-if="totalCount > questions.length" class="ms-1">（本页 {{ questions.length }}）</span>
            </p>
          </div>
          <div class="d-flex gap-2 flex-wrap">
            <div class="input-group" style="max-width: 300px;">
              <span class="input-group-text bg-white">
                <i class="bi bi-search"></i>
              </span>
              <input
                type="text"
                class="form-control"
                v-model="searchQuery"
                placeholder="搜索题目..."
                @input="handleSearch"
              />
            </div>
            <input
              v-model="subjectFilter"
              type="text"
              class="form-control"
              style="max-width: 140px"
              placeholder="科目"
              @change="onFilterChange"
            />
            <select v-model="typeFilter" class="form-select" style="max-width: 130px" @change="onFilterChange">
              <option value="">全部题型</option>
              <option v-for="t in questionTypes" :key="t" :value="t">{{ t }}</option>
            </select>
            <select v-model="difficultyFilter" class="form-select" style="max-width: 100px" @change="onFilterChange">
              <option value="">难度</option>
              <option value="易">易</option>
              <option value="中">中</option>
              <option value="难">难</option>
            </select>
            <select v-model="kpFilter" class="form-select" style="max-width: 220px" @change="onFilterChange">
              <option value="">全部知识点</option>
              <option v-for="kp in knowledgePoints" :key="kp._id" :value="kp._id">
                {{ kp.path }}
              </option>
            </select>
            <router-link to="/question-add" class="btn btn-primary">
              <i class="bi bi-plus-lg"></i> 添加题目
            </router-link>
          </div>
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
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">加载中...</span>
        </div>
      </div>

      <!-- 搜索结果提示 -->
      <div v-if="searchQuery && questions.length === 0 && !loading" class="alert alert-info">
        <i class="bi bi-info-circle"></i> 未找到匹配的题目，请尝试其他关键词
      </div>

      <div v-if="totalCount > pageSize" class="d-flex justify-content-end gap-2 mb-3">
        <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="pageOffset <= 0" @click="prevPage">
          上一页
        </button>
        <span class="align-self-center small text-muted">
          {{ pageOffset + 1 }}–{{ Math.min(pageOffset + pageSize, totalCount) }} / {{ totalCount }}
        </span>
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary"
          :disabled="pageOffset + pageSize >= totalCount"
          @click="nextPage"
        >
          下一页
        </button>
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
                <span v-if="question.usageCount" class="badge bg-light text-dark ms-1">已用 {{ question.usageCount }} 次</span>
              </div>

              <!-- 题目内容：先转成 HTML，再由 MathJax / PDF.js 排版 -->
              <div class="question-content mb-3">
                <div
                  class="question-text-content"
                  v-html="processQuestionTextToHTML(question.questionText, question.originalLaTeX, questionRenderOptions(question))"
                ></div>
              </div>

              <!-- 选项（如果是选择题） -->
              <div v-if="question.type === '单选题' || question.type === '多选题'" class="question-options mb-3">
                <ol class="option-list">
                  <li v-for="(option, index) in question.options" :key="index" class="option-item">
                    <div v-html="processQuestionTextToHTML(option)"></div>
                  </li>
                </ol>
              </div>

              <!-- 答案 -->
              <div class="question-answer">
                <strong>答案：</strong>
                <div class="answer-text-content" v-html="renderAnswer(question.correctAnswer)"></div>
              </div>
              <div v-if="question.solution" class="question-solution mt-2">
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

      <!-- 空状态 -->
      <div v-else class="empty-state text-center py-5">
        <i class="bi bi-inbox display-1 text-muted"></i>
        <p class="text-muted mt-3">暂无题目，点击上方"添加题目"开始创建</p>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import { processQuestionTextToHTML, processAnswerTextToHTML } from "../utils/latexProcessor";
import {
  loadCoverageGapBatch,
  COVERAGE_GAP_BATCH_KEY,
} from "../utils/coverageGapBatch";

export default {
  name: "QuestionList",
  data() {
    return {
      questions: [],
      allQuestions: [], // 保存所有题目用于搜索
      loading: true,
      searchQuery: "",
      knowledgePoints: [],
      kpFilter: "",
      subjectFilter: "",
      typeFilter: "",
      difficultyFilter: "",
      minScoreFilter: "",
      maxScoreFilter: "",
      questionTypes: ['判断题', '单选题', '多选题', '填空题', '简答题', '解答题', '计算题', '证明题', '作图题'],
      totalCount: 0,
      pageSize: 50,
      pageOffset: 0,
      searchTimer: null,
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
  },
  mounted() {
    this.initGapBatchFromRoute();
    this.applyRouteQuery();
    this.loadKnowledgePoints();
    this.getQuestionList();
  },
  watch: {
    '$route.query.gapBatch'() {
      this.initGapBatchFromRoute();
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
    questionRenderOptions(question) {
      const opts = question && question.options;
      const hasOptions = opts && typeof opts === 'object' && Object.keys(opts).length > 0;
      return { hasOptions, mode: 'question' };
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
        window.pdfjsLib.getDocument(pdfUrl).promise
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
    applyGapListQuery(listQuery) {
      if (!listQuery) return;
      this.typeFilter = listQuery.type ? String(listQuery.type) : '';
      this.difficultyFilter = listQuery.difficulty ? String(listQuery.difficulty) : '';
      this.kpFilter = listQuery.knowledgePointId ? String(listQuery.knowledgePointId) : '';
      this.subjectFilter = listQuery.subject ? String(listQuery.subject) : '';
      this.minScoreFilter = listQuery.minScore != null && listQuery.minScore !== ''
        ? Number(listQuery.minScore)
        : '';
      this.maxScoreFilter = listQuery.maxScore != null && listQuery.maxScore !== ''
        ? Number(listQuery.maxScore)
        : '';
      this.pageOffset = 0;
    },
    prevGapBatch() {
      if (this.gapBatchIndex <= 0) return;
      this.gapBatchIndex -= 1;
      this.applyGapListQuery(this.gapBatchGaps[this.gapBatchIndex]?.listQuery);
      this.getQuestionList();
    },
    nextGapBatch() {
      if (this.gapBatchIndex >= this.gapBatchGaps.length - 1) return;
      this.gapBatchIndex += 1;
      this.applyGapListQuery(this.gapBatchGaps[this.gapBatchIndex]?.listQuery);
      this.getQuestionList();
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
    applyRouteQuery() {
      const q = this.$route.query || {};
      if (q.gapBatch === '1' && this.gapBatchGaps.length) {
        this.applyGapListQuery(this.gapBatchGaps[this.gapBatchIndex]?.listQuery);
        return;
      }
      if (q.type) this.typeFilter = String(q.type);
      if (q.difficulty) this.difficultyFilter = String(q.difficulty);
      if (q.knowledgePointId) this.kpFilter = String(q.knowledgePointId);
      if (q.subject) this.subjectFilter = String(q.subject);
      if (q.minScore != null && q.minScore !== "") this.minScoreFilter = Number(q.minScore);
      if (q.maxScore != null && q.maxScore !== "") this.maxScoreFilter = Number(q.maxScore);
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
      this.pageOffset = 0;
      this.getQuestionList();
    },
    prevPage() {
      this.pageOffset = Math.max(0, this.pageOffset - this.pageSize);
      this.getQuestionList();
    },
    nextPage() {
      if (this.pageOffset + this.pageSize < this.totalCount) {
        this.pageOffset += this.pageSize;
        this.getQuestionList();
      }
    },
    async getQuestionList() {
      this.loading = true;
      try {
        const params = {
          limit: this.pageSize,
          offset: this.pageOffset,
        };
        if (this.kpFilter) {
          params.knowledgePointId = this.kpFilter;
          params.subtree = "true";
        }
        if (this.subjectFilter.trim()) params.subject = this.subjectFilter.trim();
        if (this.typeFilter) params.type = this.typeFilter;
        if (this.difficultyFilter) params.difficulty = this.difficultyFilter;
        if (this.minScoreFilter !== "" && this.minScoreFilter != null) params.minScore = this.minScoreFilter;
        if (this.maxScoreFilter !== "" && this.maxScoreFilter != null) params.maxScore = this.maxScoreFilter;
        if (this.searchQuery.trim()) params.q = this.searchQuery.trim();
        const response = await axios.get("/questions/list", { params });
        const data = response.data;
        if (Array.isArray(data)) {
          this.allQuestions = data;
          this.questions = data;
          this.totalCount = data.length;
        } else {
          this.allQuestions = data.questions || [];
          this.questions = data.questions || [];
          this.totalCount = data.total ?? this.questions.length;
        }
      } catch (error) {
        console.error("Failed to retrieve question list:", error);
      } finally {
        this.loading = false;
      }
    },
    handleSearch() {
      this.pageOffset = 0;
      if (this.searchTimer) clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this.getQuestionList();
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
        // 同时更新 allQuestions 和 questions
        this.allQuestions = this.allQuestions.filter((q) => q._id !== id);
        this.questions = this.questions.filter((q) => q._id !== id);
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

.option-list {
  margin: 0;
  padding-left: 1.5rem;
  list-style: upper-alpha;
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

@media (max-width: 768px) {
  .question-list-container {
    padding: 1rem 0;
  }

  .page-header {
    padding: 1.5rem;
  }
}
</style>
