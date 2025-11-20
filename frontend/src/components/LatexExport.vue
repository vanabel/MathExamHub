<template>
  <div class="latex-export-container">
    <div class="container">
      <!-- 页面头部 -->
      <div class="page-header mb-4">
        <nav aria-label="breadcrumb" class="mb-3">
          <ol class="breadcrumb">
            <li class="breadcrumb-item">
              <router-link to="/question-list" class="text-decoration-none">
                <i class="bi bi-house"></i> 题目列表
              </router-link>
            </li>
            <li class="breadcrumb-item active" aria-current="page">导出 LaTeX 文件</li>
          </ol>
        </nav>
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h1 class="page-title mb-1">
              <i class="bi bi-download"></i> 导出 LaTeX 文件
            </h1>
            <p class="text-muted mb-0">选择题目并导出为 LaTeX 格式的试卷文件</p>
          </div>
          <router-link to="/question-list" class="btn btn-outline-secondary">
            <i class="bi bi-arrow-left"></i> 返回列表
          </router-link>
        </div>
      </div>

      <div class="row">
        <!-- 题目选择区域 -->
        <div class="col-lg-8">
          <div class="card mb-4">
            <div class="card-header bg-light">
              <h5 class="mb-0">
                <i class="bi bi-list-check"></i> 选择题目
              </h5>
            </div>
            <div class="card-body">
              <!-- 搜索和筛选 -->
              <div class="row g-3 mb-3">
                <div class="col-md-4">
                  <label for="searchSubject" class="form-label">科目</label>
                  <input
                    v-model="filters.subject"
                    id="searchSubject"
                    type="text"
                    class="form-control"
                    list="subjectList"
                    placeholder="全部科目"
                    @input="loadQuestions"
                  />
                  <datalist id="subjectList">
                    <option value="">全部</option>
                    <option v-for="subj in availableSubjects" :key="subj" :value="subj">
                      {{ subj }}
                    </option>
                  </datalist>
                </div>
                <div class="col-md-4">
                  <label for="searchType" class="form-label">题型</label>
                  <select
                    v-model="filters.type"
                    id="searchType"
                    class="form-select"
                    @change="loadQuestions"
                  >
                    <option value="">全部</option>
                    <option value="判断题">判断题</option>
                    <option value="单选题">单选题</option>
                    <option value="多选题">多选题</option>
                    <option value="填空题">填空题</option>
                    <option value="简答题">简答题</option>
                    <option value="解答题">解答题</option>
                    <option value="计算题">计算题</option>
                    <option value="证明题">证明题</option>
                    <option value="作图题">作图题</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label for="searchText" class="form-label">关键词</label>
                  <input
                    v-model="filters.keyword"
                    id="searchText"
                    type="text"
                    class="form-control"
                    placeholder="搜索题目..."
                    @keyup.enter="loadQuestions"
                  />
                </div>
              </div>

              <!-- 全选/取消全选和预览模式 -->
              <div class="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-primary"
                    @click="selectAll"
                  >
                    <i class="bi bi-check-all"></i> 全选
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-secondary ms-2"
                    @click="deselectAll"
                  >
                    <i class="bi bi-x-square"></i> 取消全选
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm"
                    :class="previewMode ? 'btn-success' : 'btn-outline-success'"
                    @click="previewMode = !previewMode"
                  >
                    <i :class="previewMode ? 'bi bi-eye-fill' : 'bi bi-eye'"></i>
                    {{ previewMode ? '预览模式' : '文本模式' }}
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-info ms-2"
                    @click="showSmartSelectModal = true"
                    :disabled="questions.length === 0"
                  >
                    <i class="bi bi-magic"></i> 智能选择
                  </button>
                </div>
                <div class="text-muted">
                  已选择 <strong>{{ selectedQuestions.length }}</strong> 道题目
                </div>
              </div>

              <!-- 题目列表 -->
              <div class="question-list" style="max-height: 500px; overflow-y: auto">
                <div v-if="loading" class="text-center py-5">
                  <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">加载中...</span>
                  </div>
                </div>
                <div v-else-if="questions.length === 0" class="text-center py-5 text-muted">
                  <i class="bi bi-inbox display-6 d-block mb-2"></i>
                  <p>没有找到题目</p>
                </div>
                <div
                  v-else
                  v-for="question in questions"
                  :key="question._id"
                  class="question-item mb-2 p-3 border rounded"
                  :class="{ 'selected': isSelected(question._id) }"
                  @click="toggleSelection(question._id)"
                >
                  <div class="form-check">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      :checked="isSelected(question._id)"
                      @change="toggleSelection(question._id)"
                      @click.stop
                    />
                    <label class="form-check-label w-100">
                      <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <span class="badge bg-primary me-2">{{ question.subject }}</span>
                          <span class="badge bg-secondary me-2">{{ question.type }}</span>
                          <span class="badge" :class="getDifficultyClass(question.difficulty)" style="margin-right: 0.5rem;">
                            {{ question.difficulty }}
                          </span>
                          <span class="badge bg-info">{{ question.totalScore }} 分</span>
                        </div>
                      </div>
                      <!-- 预览模式：渲染 HTML -->
                      <div v-if="previewMode" class="question-preview-content">
                        <div 
                          v-html="processQuestionTextToHTML(question.questionText)"
                          ref="questionContent"
                          class="question-text-content mb-2"
                        ></div>
                        <!-- 选项（如果是选择题） -->
                        <div v-if="question.type === '单选题' || question.type === '多选题'" class="question-options mb-2">
                          <ol class="option-list mb-0 small">
                            <li v-for="(option, index) in question.options" :key="index" class="option-item">
                              <vue-mathjax :formula="option" :options="mathjaxOptions"></vue-mathjax>
                            </li>
                          </ol>
                        </div>
                        <!-- 答案 -->
                        <div class="question-answer mb-0">
                          <strong>答案：</strong>
                          <vue-mathjax
                            :formula="processAnswerText(question.correctAnswer)"
                            :options="mathjaxOptions"
                          ></vue-mathjax>
                        </div>
                      </div>
                      <!-- 文本模式：显示原始 LaTeX -->
                      <p v-else class="mb-0 small text-muted font-monospace">{{ question.originalLaTeX || question.questionText }}</p>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 导出配置区域 -->
        <div class="col-lg-4">
          <div class="card">
            <div class="card-header bg-light">
              <h5 class="mb-0">
                <i class="bi bi-gear"></i> 导出配置
              </h5>
            </div>
            <div class="card-body">
              <div class="mb-3">
                <label for="filename" class="form-label">文件名（不含扩展名）</label>
                <input
                  v-model="metadata.filename"
                  id="filename"
                  type="text"
                  class="form-control"
                  placeholder="mathexam-2025-01-01"
                />
                <small class="form-text text-muted">
                  系统会根据是否有图片自动添加 .tex 或 .zip 扩展名
                </small>
              </div>

              <div class="mb-3">
                <label for="university" class="form-label">学校</label>
                <input
                  v-model="metadata.university"
                  id="university"
                  type="text"
                  class="form-control"
                  placeholder="西南大学"
                />
              </div>

              <div class="mb-3">
                <label for="school" class="form-label">学院</label>
                <input
                  v-model="metadata.school"
                  id="school"
                  type="text"
                  class="form-control"
                  placeholder="数学与统计学院"
                />
              </div>

              <div class="mb-3">
                <label for="course" class="form-label">课程</label>
                <input
                  v-model="metadata.course"
                  id="course"
                  type="text"
                  class="form-control"
                  placeholder="高等代数"
                />
              </div>

              <div class="mb-3">
                <label for="AorB" class="form-label">试卷类型</label>
                <select v-model="metadata.AorB" id="AorB" class="form-select">
                  <option value="A">A 卷</option>
                  <option value="B">B 卷</option>
                </select>
              </div>

              <div class="mb-3">
                <label for="totaltime" class="form-label">考试时间（分钟）</label>
                <input
                  v-model="metadata.totaltime"
                  id="totaltime"
                  type="number"
                  class="form-control"
                  placeholder="120"
                />
              </div>

              <div class="mb-3">
                <label for="openclose" class="form-label">开闭卷</label>
                <select v-model="metadata.openclose" id="openclose" class="form-select">
                  <option value="闭卷">闭卷</option>
                  <option value="开卷">开卷</option>
                </select>
              </div>

              <button
                type="button"
                class="btn btn-primary w-100"
                @click="exportToLatex"
                :disabled="selectedQuestions.length === 0 || exporting"
              >
                <span v-if="exporting" class="spinner-border spinner-border-sm me-2"></span>
                <i v-else class="bi bi-download"></i>
                {{ exporting ? "导出中..." : "导出 LaTeX 文件" }}
              </button>

              <div v-if="selectedQuestions.length === 0" class="alert alert-warning mt-3 mb-0">
                <small><i class="bi bi-exclamation-triangle"></i> 请至少选择一道题目</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 智能选择模态框 -->
      <div v-if="showSmartSelectModal" class="modal fade show" style="display: block;" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="bi bi-magic"></i> 智能选择题目
              </h5>
              <button type="button" class="btn-close" @click="showSmartSelectModal = false"></button>
            </div>
            <div class="modal-body">
              <p class="text-muted mb-3">
                根据难度分数自动选择题目。难度分数 = 难度系数 × 题目分数<br>
                <small>简单: 0.4, 中等: 0.6, 难: 1.0</small>
              </p>
              
              <div class="mb-3">
                <label for="smartSelectMode" class="form-label">选择模式</label>
                <select v-model="smartSelectMode" id="smartSelectMode" class="form-select">
                  <option value="count">按题目数量</option>
                  <option value="difficulty">按目标难度分数</option>
                </select>
              </div>

              <div v-if="smartSelectMode === 'count'" class="mb-3">
                <label for="targetCount" class="form-label">题目数量</label>
                <input
                  v-model.number="smartSelectParams.targetCount"
                  id="targetCount"
                  type="number"
                  class="form-control"
                  min="1"
                  :max="filteredQuestions.length"
                  placeholder="请输入题目数量"
                />
                <small class="form-text text-muted">
                  最多可选择 {{ filteredQuestions.length }} 道题目
                </small>
              </div>

              <div v-if="smartSelectMode === 'difficulty'" class="mb-3">
                <label for="targetDifficulty" class="form-label">目标难度分数总和</label>
                <input
                  v-model.number="smartSelectParams.targetDifficulty"
                  id="targetDifficulty"
                  type="number"
                  class="form-control"
                  min="0"
                  step="0.1"
                  placeholder="请输入目标难度分数"
                />
                <small class="form-text text-muted">
                  当前筛选结果的平均难度分数: {{ averageDifficultyScore.toFixed(2) }}
                </small>
              </div>

              <div class="mb-3">
                <label class="form-label">排序方式</label>
                <select v-model="smartSelectParams.sortOrder" class="form-select">
                  <option value="asc">难度分数从低到高</option>
                  <option value="desc">难度分数从高到低</option>
                  <option value="random">随机排序</option>
                  <option value="type">按类型排序</option>
                </select>
              </div>

              <!-- 题型分布设置 -->
              <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <label class="form-label mb-0">题型分布（可选）</label>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-secondary"
                    @click="enableTypeDistribution = !enableTypeDistribution"
                  >
                    {{ enableTypeDistribution ? '禁用' : '启用' }}
                  </button>
                </div>
                <div v-if="enableTypeDistribution" class="border rounded p-3 bg-light">
                  <small class="text-muted d-block mb-2">
                    <i class="bi bi-info-circle"></i>
                    设置每种题型的数量或比例。留空表示不限制。
                  </small>
                  <div class="row g-2">
                    <div
                      v-for="type in questionTypes"
                      :key="type"
                      class="col-md-6"
                    >
                      <div class="input-group input-group-sm">
                        <span class="input-group-text" style="min-width: 80px;">{{ type }}</span>
                        <input
                          v-model.number="typeDistribution[type]"
                          type="number"
                          class="form-control"
                          min="0"
                          :max="getAvailableCountByType(type)"
                          placeholder="数量"
                        />
                        <span class="input-group-text text-muted" style="font-size: 0.75rem;">
                          (可用: {{ getAvailableCountByType(type) }})
                        </span>
                      </div>
                    </div>
                  </div>
                  <div class="mt-2">
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-primary"
                      @click="autoFillTypeDistribution"
                    >
                      <i class="bi bi-magic"></i> 自动分配
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-secondary ms-2"
                      @click="clearTypeDistribution"
                    >
                      <i class="bi bi-x-circle"></i> 清空
                    </button>
                  </div>
                </div>
              </div>

              <div v-if="smartSelectMode === 'difficulty'" class="alert alert-info">
                <small>
                  <i class="bi bi-info-circle"></i>
                  将使用优化算法选择最接近目标难度分数的题目组合
                </small>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="showSmartSelectModal = false">
                取消
              </button>
              <button type="button" class="btn btn-primary" @click="applySmartSelect">
                <i class="bi bi-check-lg"></i> 应用
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="showSmartSelectModal" class="modal-backdrop fade show"></div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import VueMathjaxNext from "vue-mathjax-next";
import { mathjaxOptions } from "../utils/mathjaxConfig";
import { processQuestionText, processAnswerText, processQuestionTextToHTML } from "../utils/latexProcessor";

export default {
  name: "LatexExport",
  components: {
    "vue-mathjax": VueMathjaxNext,
  },
  data() {
    return {
      questions: [],
      selectedQuestionIds: [],
      loading: false,
      exporting: false,
      previewMode: false, // 预览模式开关
      showSmartSelectModal: false, // 智能选择模态框
      smartSelectMode: 'count', // 'count' 或 'difficulty'
      enableTypeDistribution: false, // 是否启用题型分布
      questionTypes: [
        '判断题',
        '单选题',
        '多选题',
        '填空题',
        '解答题',
        '计算题',
        '证明题',
        '作图题',
      ],
      // 题型排序顺序（用于导出时按顺序排列）
      typeOrder: [
        '判断题',
        '单选题',
        '多选题',
        '填空题',
        '简答题',
        '作图题',
        '解答题',
        '计算题',
        '证明题',
      ],
      typeDistribution: {}, // 题型分布：{ '单选题': 5, '填空题': 3, ... }
      smartSelectParams: {
        targetCount: 10,
        targetDifficulty: 50,
        sortOrder: 'asc', // 'asc', 'desc', 'random'
      },
      mathjaxOptions: mathjaxOptions,
      filters: {
        subject: "",
        type: "",
        keyword: "",
      },
      availableSubjects: [], // 所有可用的科目列表
      metadata: {
        filename: `mathexam-${new Date().toISOString().split("T")[0]}`,
        university: "西南大学",
        school: "数学与统计学院",
        course: "高等代数",
        AorB: "A",
        totaltime: "120",
        openclose: "闭卷",
        degree: "本科",
        major: "数学与应用数学",
        grade: "2017",
        examiner: "",
        director: "",
        dean: "",
      },
    };
  },
  computed: {
    selectedQuestions() {
      const questions = this.questions.filter((q) => this.selectedQuestionIds.includes(q._id));
      // 如果需要按类型排序，对已选择的题目进行排序
      if (this.smartSelectParams.sortOrder === 'type') {
        return this.sortQuestionsByType(questions);
      }
      return questions;
    },
    // 获取当前筛选后的题目（用于智能选择）
    filteredQuestions() {
      return this.questions;
    },
    // 计算平均难度分数
    averageDifficultyScore() {
      if (this.filteredQuestions.length === 0) return 0;
      const total = this.filteredQuestions.reduce((sum, q) => {
        return sum + this.getDifficultyScore(q);
      }, 0);
      return total / this.filteredQuestions.length;
    },
  },
  watch: {
    // 当选择的题目改变时，自动更新文件名和元数据
    selectedQuestions: {
      handler(newVal) {
        if (newVal.length > 0) {
          this.updateMetadataFromQuestions(newVal);
        }
      },
      immediate: false,
    },
  },
  mounted() {
    this.loadSubjects();
    this.loadQuestions();
    // 加载 MathJax 和 PDF.js
    this.loadMathJax();
    this.loadPDFJS();
  },
  updated() {
    // 组件更新后重新渲染 MathJax 和 PDF
    if (this.previewMode) {
      this.$nextTick(() => {
        setTimeout(() => {
          this.renderMathJax();
          const hasRenderingPDFs = document.querySelectorAll('.pdf-canvas[data-rendering="true"]').length > 0;
          if (!hasRenderingPDFs) {
            this.renderPDFs();
          }
        }, 100);
      });
    }
  },
  methods: {
    // 导入处理函数
    processQuestionText,
    processAnswerText,
    processQuestionTextToHTML,
    // 获取难度样式类
    getDifficultyClass(difficulty) {
      const classMap = {
        '简单': 'bg-success',
        '中等': 'bg-warning',
        '难': 'bg-danger',
      };
      return classMap[difficulty] || 'bg-secondary';
    },
    // 加载 MathJax
    loadMathJax() {
      if (typeof window.MathJax === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML';
        script.async = true;
        document.head.appendChild(script);
      }
    },
    // 加载 PDF.js
    loadPDFJS() {
      if (typeof window.pdfjsLib === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.async = true;
        document.head.appendChild(script);
      }
    },
    // 渲染 MathJax
    renderMathJax() {
      if (window.MathJax && window.MathJax.Hub) {
        setTimeout(() => {
          window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
        }, 50);
      }
    },
    // 渲染 PDF
    renderPDFs() {
      if (typeof window.pdfjsLib === 'undefined') {
        return;
      }

      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      const pdfContainers = document.querySelectorAll('.pdf-container[data-pdf-url]');
      
      pdfContainers.forEach((container) => {
        const pdfUrl = container.getAttribute('data-pdf-url');
        const pdfId = container.getAttribute('data-pdf-id');
        const canvas = container.querySelector('.pdf-canvas') || document.getElementById(`pdf-canvas-${pdfId}`);
        
        if (canvas && (canvas.dataset.rendered === 'true' || canvas.dataset.rendering === 'true')) {
          return;
        }

        if (canvas && pdfUrl) {
          canvas.dataset.rendering = 'true';
          
          let renderTask = null;
          
          window.pdfjsLib.getDocument(pdfUrl).promise
            .then((pdf) => {
              return pdf.getPage(1);
            })
            .then((page) => {
              const viewport = page.getViewport({ scale: 1.5 });
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              const context = canvas.getContext('2d');
              
              renderTask = page.render({
                canvasContext: context,
                viewport: viewport
              });
              
              return renderTask.promise;
            })
            .then(() => {
              canvas.dataset.rendered = 'true';
              canvas.dataset.rendering = 'false';
            })
            .catch((error) => {
              canvas.dataset.rendering = 'false';
              
              if (error.name === 'RenderingCancelledException') {
                return;
              }
              
              console.error('PDF 加载错误:', error);
              const errorMsg = document.createElement('p');
              errorMsg.style.cssText = 'color: red; text-align: center; padding: 20px;';
              errorMsg.innerHTML = `PDF 加载失败。请<a href="${pdfUrl}" target="_blank" style="color: #007bff;">点击这里</a>在新窗口打开。`;
              container.appendChild(errorMsg);
            });
        }
      });
    },
    async loadSubjects() {
      try {
        const response = await axios.get("/questions/subjects");
        // 合并常用科目和已使用的科目，去重并排序
        const commonSubjects = [
          "解析几何",
          "线性代数II",
          "高等代数",
          "高等几何",
          "微分几何",
        ];
        const allSubjects = [...new Set([...commonSubjects, ...response.data])];
        allSubjects.sort();
        this.availableSubjects = allSubjects;
      } catch (error) {
        console.error("加载科目列表失败:", error);
        // 如果加载失败，使用默认的常用科目列表
        this.availableSubjects = [
          "解析几何",
          "线性代数II",
          "高等代数",
          "高等几何",
          "微分几何",
        ];
      }
    },
    async loadQuestions() {
      this.loading = true;
      try {
        const params = {};
        if (this.filters.subject) params.subject = this.filters.subject;
        if (this.filters.type) params.questionType = this.filters.type;
        if (this.filters.keyword) params.questionText = this.filters.keyword;

        const response = await axios.get("/questions/list", { params });
        this.questions = response.data;
      } catch (error) {
        console.error("加载题目失败:", error);
        alert("加载题目失败");
      } finally {
        this.loading = false;
      }
    },
    toggleSelection(questionId) {
      const index = this.selectedQuestionIds.indexOf(questionId);
      if (index > -1) {
        this.selectedQuestionIds.splice(index, 1);
      } else {
        this.selectedQuestionIds.push(questionId);
      }
    },
    isSelected(questionId) {
      return this.selectedQuestionIds.includes(questionId);
    },
    selectAll() {
      this.selectedQuestionIds = this.questions.map((q) => q._id);
    },
    deselectAll() {
      this.selectedQuestionIds = [];
    },
    // 获取题目的难度分数
    getDifficultyScore(question) {
      const difficultyCoefficient = {
        '简单': 0.4,
        '中等': 0.6,
        '难': 1.0,
      };
      const coefficient = difficultyCoefficient[question.difficulty] || 0.6;
      return coefficient * (question.totalScore || 0);
    },
    // 获取题型的排序索引
    getTypeIndex(type) {
      const index = this.typeOrder.indexOf(type);
      return index >= 0 ? index : 999; // 未在顺序中的类型排在最后
    },
    // 按类型排序题目
    sortQuestionsByType(questions) {
      const sorted = [...questions];
      sorted.sort((a, b) => {
        const indexA = this.getTypeIndex(a.type);
        const indexB = this.getTypeIndex(b.type);
        if (indexA !== indexB) {
          return indexA - indexB;
        }
        // 同一类型内，按难度分数从低到高排序
        return this.getDifficultyScore(a) - this.getDifficultyScore(b);
      });
      return sorted;
    },
    // 获取指定题型的可用数量
    getAvailableCountByType(type) {
      return this.filteredQuestions.filter(q => q.type === type).length;
    },
    // 自动分配题型分布
    autoFillTypeDistribution() {
      const total = this.smartSelectParams.targetCount || 10;
      const availableTypes = this.questionTypes.filter(
        type => this.getAvailableCountByType(type) > 0
      );
      
      if (availableTypes.length === 0) {
        alert('当前没有可用的题目');
        return;
      }

      // 按比例分配：选择题占40%，填空题占20%，解答题占30%，其他占10%
      const distribution = {
        '单选题': Math.round(total * 0.2),
        '多选题': Math.round(total * 0.15),
        '判断题': Math.round(total * 0.05),
        '填空题': Math.round(total * 0.2),
        '解答题': Math.round(total * 0.15),
        '计算题': Math.round(total * 0.15),
        '证明题': Math.round(total * 0.08),
        '作图题': Math.round(total * 0.02),
      };

      // 确保不超过可用数量
      this.questionTypes.forEach(type => {
        const available = this.getAvailableCountByType(type);
        if (available > 0) {
          this.typeDistribution[type] = Math.min(distribution[type] || 0, available);
        } else {
          this.typeDistribution[type] = 0;
        }
      });
    },
    // 清空题型分布
    clearTypeDistribution() {
      this.questionTypes.forEach(type => {
        this.typeDistribution[type] = null;
      });
    },
    // 使用动态规划算法选择最接近目标难度分数的题目
    selectByDifficultyWithDP(questions, targetDifficulty) {
      // 将难度分数转换为整数（乘以10避免浮点数问题）
      const scale = 10;
      const target = Math.round(targetDifficulty * scale);
      const tolerance = Math.round(targetDifficulty * 0.15 * scale); // 允许15%的误差范围

      // dp[j] 表示难度分数为j时的最佳选择
      // 使用一维数组优化空间
      const maxScore = Math.round(target + tolerance);
      let dp = new Array(maxScore + 1).fill(null).map(() => ({
        selected: [],
        score: 0,
        diff: Infinity,
      }));

      dp[0] = { selected: [], score: 0, diff: target };

      for (const q of questions) {
        const qScore = Math.round(q.difficultyScore * scale);
        const newDp = dp.map(item => ({
          selected: [...item.selected],
          score: item.score,
          diff: item.diff,
        }));

        for (let j = maxScore; j >= qScore; j--) {
          const prev = dp[j - qScore];
          if (prev.selected.length > 0 || j === qScore) {
            const newDiff = Math.abs(j - target);
            if (newDiff < newDp[j].diff || 
                (newDiff === newDp[j].diff && prev.selected.length + 1 < newDp[j].selected.length)) {
              newDp[j] = {
                selected: [...prev.selected, q._id],
                score: j / scale,
                diff: newDiff,
              };
            }
          }
        }
        dp = newDp;
      }

      // 找到最接近目标的解
      let best = dp[0];
      for (let i = 1; i <= maxScore; i++) {
        if (dp[i].selected.length > 0) {
          if (dp[i].diff < best.diff || 
              (dp[i].diff === best.diff && Math.abs(dp[i].score - targetDifficulty) < Math.abs(best.score - targetDifficulty))) {
            best = dp[i];
          }
        }
      }

      return best.selected.length > 0 ? best.selected : (questions.length > 0 ? [questions[0]._id] : []);
    },
    // 应用智能选择
    applySmartSelect() {
      if (this.filteredQuestions.length === 0) {
        alert('当前没有可选的题目');
        return;
      }

      // 计算每道题的难度分数
      const questionsWithScore = this.filteredQuestions.map(q => ({
        ...q,
        difficultyScore: this.getDifficultyScore(q),
      }));

      // 如果启用了题型分布，先按题型分组
      let candidateQuestions = [...questionsWithScore];
      
      if (this.enableTypeDistribution) {
        // 先选择满足题型分布要求的题目
        const typeSelectedIds = [];
        const typeSelected = {};
        
        this.questionTypes.forEach(type => {
          const count = this.typeDistribution[type];
          if (count && count > 0) {
            const typeQuestions = candidateQuestions
              .filter(q => q.type === type && !typeSelectedIds.includes(q._id))
              .map(q => ({ ...q, difficultyScore: this.getDifficultyScore(q) }));
            
            // 按排序方式排序
            if (this.smartSelectParams.sortOrder === 'asc') {
              typeQuestions.sort((a, b) => a.difficultyScore - b.difficultyScore);
            } else if (this.smartSelectParams.sortOrder === 'desc') {
              typeQuestions.sort((a, b) => b.difficultyScore - a.difficultyScore);
            } else if (this.smartSelectParams.sortOrder === 'type') {
              // 按类型排序已经在题型循环中处理，这里按难度分数从低到高
              typeQuestions.sort((a, b) => a.difficultyScore - b.difficultyScore);
            } else {
              typeQuestions.sort(() => Math.random() - 0.5);
            }
            
            const selected = typeQuestions.slice(0, Math.min(count, typeQuestions.length));
            selected.forEach(q => {
              typeSelectedIds.push(q._id);
              typeSelected[q._id] = true;
            });
          }
        });

        // 如果按数量选择，且已选择的题目数量不足，补充其他题目
        if (this.smartSelectMode === 'count') {
          const targetCount = this.smartSelectParams.targetCount || 10;
          const remaining = targetCount - typeSelectedIds.length;
          
          if (remaining > 0) {
            const remainingQuestions = candidateQuestions
              .filter(q => !typeSelected[q._id])
              .map(q => ({ ...q, difficultyScore: this.getDifficultyScore(q) }));
            
            // 排序
            if (this.smartSelectParams.sortOrder === 'asc') {
              remainingQuestions.sort((a, b) => a.difficultyScore - b.difficultyScore);
            } else if (this.smartSelectParams.sortOrder === 'desc') {
              remainingQuestions.sort((a, b) => b.difficultyScore - a.difficultyScore);
            } else if (this.smartSelectParams.sortOrder === 'type') {
              // 按类型排序
              remainingQuestions.sort((a, b) => {
                const indexA = this.getTypeIndex(a.type);
                const indexB = this.getTypeIndex(b.type);
                if (indexA !== indexB) {
                  return indexA - indexB;
                }
                return a.difficultyScore - b.difficultyScore;
              });
            } else {
              remainingQuestions.sort(() => Math.random() - 0.5);
            }
            
            remainingQuestions.slice(0, remaining).forEach(q => {
              typeSelectedIds.push(q._id);
            });
          }
          
          this.selectedQuestionIds = typeSelectedIds.slice(0, targetCount);
        } else {
          // 按难度分数选择，先满足题型分布，再优化难度分数
          this.selectedQuestionIds = typeSelectedIds;
          
          // 如果已选择的题目难度分数总和接近目标，直接返回
          const currentTotal = typeSelectedIds.reduce((sum, id) => {
            const q = candidateQuestions.find(q => q._id === id);
            return sum + (q ? q.difficultyScore : 0);
          }, 0);
          
          const target = this.smartSelectParams.targetDifficulty || 50;
          if (Math.abs(currentTotal - target) / target < 0.1) {
            // 已经接近目标，直接使用
          } else {
            // 使用优化算法调整
            const remainingQuestions = candidateQuestions.filter(q => !typeSelected[q._id]);
            const remainingTarget = target - currentTotal;
            
            if (remainingTarget > 0 && remainingQuestions.length > 0) {
              // 使用改进的贪心算法选择剩余题目
              remainingQuestions.sort((a, b) => {
                const diffA = Math.abs(a.difficultyScore - remainingTarget);
                const diffB = Math.abs(b.difficultyScore - remainingTarget);
                return diffA - diffB;
              });
              
              let currentTotal2 = currentTotal;
              for (const q of remainingQuestions) {
                if (currentTotal2 + q.difficultyScore <= target * 1.15) {
                  typeSelectedIds.push(q._id);
                  currentTotal2 += q.difficultyScore;
                  if (currentTotal2 >= target * 0.9) break;
                }
              }
              
              this.selectedQuestionIds = typeSelectedIds;
            }
          }
        }
      } else {
        // 未启用题型分布，使用原有逻辑
        // 排序
        let sortedQuestions = [...candidateQuestions];
        if (this.smartSelectParams.sortOrder === 'asc') {
          sortedQuestions.sort((a, b) => a.difficultyScore - b.difficultyScore);
        } else if (this.smartSelectParams.sortOrder === 'desc') {
          sortedQuestions.sort((a, b) => b.difficultyScore - a.difficultyScore);
        } else if (this.smartSelectParams.sortOrder === 'type') {
          // 按类型排序
          sortedQuestions.sort((a, b) => {
            const indexA = this.getTypeIndex(a.type);
            const indexB = this.getTypeIndex(b.type);
            if (indexA !== indexB) {
              return indexA - indexB;
            }
            // 同一类型内，按难度分数从低到高排序
            return a.difficultyScore - b.difficultyScore;
          });
        } else {
          sortedQuestions.sort(() => Math.random() - 0.5);
        }

        let selectedIds = [];

        if (this.smartSelectMode === 'count') {
          // 按数量选择
          const count = Math.min(
            this.smartSelectParams.targetCount || 10,
            sortedQuestions.length
          );
          selectedIds = sortedQuestions.slice(0, count).map(q => q._id);
        } else {
          // 按目标难度分数选择（使用优化算法）
          const target = this.smartSelectParams.targetDifficulty || 50;
          
          // 对于较小的题目集合，使用动态规划
          if (sortedQuestions.length <= 50) {
            selectedIds = this.selectByDifficultyWithDP(sortedQuestions, target);
          } else {
            // 对于较大的集合，使用改进的贪心算法
            let currentTotal = 0;
            const tolerance = target * 0.1;
            
            // 先尝试选择最接近目标的题目
            sortedQuestions.sort((a, b) => {
              const diffA = Math.abs(a.difficultyScore - target);
              const diffB = Math.abs(b.difficultyScore - target);
              return diffA - diffB;
            });
            
            for (const q of sortedQuestions) {
              if (currentTotal + q.difficultyScore <= target + tolerance) {
                selectedIds.push(q._id);
                currentTotal += q.difficultyScore;
                if (currentTotal >= target - tolerance) {
                  break;
                }
              }
            }

            // 如果没有选择任何题目，至少选择一道
            if (selectedIds.length === 0 && sortedQuestions.length > 0) {
              selectedIds = [sortedQuestions[0]._id];
            }
          }
        }

        this.selectedQuestionIds = selectedIds;
      }

      this.showSmartSelectModal = false;

      // 显示统计信息
      const selected = this.selectedQuestions;
      const totalDifficultyScore = selected.reduce((sum, q) => sum + this.getDifficultyScore(q), 0);
      const totalScore = selected.reduce((sum, q) => sum + (q.totalScore || 0), 0);
      
      // 统计题型分布
      const typeStats = {};
      selected.forEach(q => {
        typeStats[q.type] = (typeStats[q.type] || 0) + 1;
      });
      const typeStatsStr = Object.entries(typeStats)
        .map(([type, count]) => `${type}: ${count}`)
        .join(', ');
      
      alert(
        `已选择 ${selected.length} 道题目\n` +
        `总分数: ${totalScore} 分\n` +
        `总难度分数: ${totalDifficultyScore.toFixed(2)}\n` +
        (typeStatsStr ? `题型分布: ${typeStatsStr}` : '')
      );
    },
    // 根据选择的题目更新元数据
    updateMetadataFromQuestions(questions) {
      if (questions.length === 0) return;
      
      // 获取最常见的科目
      const subjects = questions.map(q => q.subject).filter(s => s);
      const subjectCounts = {};
      subjects.forEach(s => {
        subjectCounts[s] = (subjectCounts[s] || 0) + 1;
      });
      const mostCommonSubject = Object.keys(subjectCounts).reduce((a, b) => 
        subjectCounts[a] > subjectCounts[b] ? a : b, subjects[0] || ''
      );
      
      // 更新课程名称（使用最常见的科目）
      if (mostCommonSubject) {
        this.metadata.course = mostCommonSubject;
      }
      
      // 生成文件名：科目-日期
      const date = new Date().toISOString().split("T")[0];
      const subjectPart = mostCommonSubject ? mostCommonSubject.replace(/\s+/g, '-') : 'mathexam';
      this.metadata.filename = `${subjectPart}-${date}`;
    },
    async exportToLatex() {
      if (this.selectedQuestionIds.length === 0) {
        alert("请至少选择一道题目");
        return;
      }

      this.exporting = true;

      try {
        // 如果需要按类型排序，使用排序后的题目ID
        let questionIds = this.selectedQuestionIds;
        if (this.smartSelectParams.sortOrder === 'type') {
          const sortedQuestions = this.sortQuestionsByType(this.selectedQuestions);
          questionIds = sortedQuestions.map(q => q._id);
        }

        const response = await axios.post(
          "/questions/export/latex",
          {
            questionIds: questionIds,
            metadata: this.metadata,
          },
          {
            responseType: "blob",
          }
        );

        // 从响应头中获取文件名，如果没有则从 Content-Disposition 中提取
        let filename = this.metadata.filename || "mathexam";
        const contentDisposition = response.headers['content-disposition'];
        if (contentDisposition) {
          // 首先尝试 RFC 5987 格式：filename*=UTF-8''encoded
          const rfc5987Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
          if (rfc5987Match && rfc5987Match[1]) {
            try {
              filename = decodeURIComponent(rfc5987Match[1]);
            } catch (e) {
              console.warn('解码文件名失败:', e);
            }
          } else {
            // 回退到标准格式：filename="value"
            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (filenameMatch && filenameMatch[1]) {
              filename = filenameMatch[1].replace(/['"]/g, '');
              // 移除可能的路径分隔符
              filename = filename.split('/').pop().split('\\').pop();
            }
          }
        }
        
        // 如果后端返回的是 zip，确保文件名是 .zip；如果是 tex，确保是 .tex
        const contentType = response.headers['content-type'] || '';
        if (contentType.includes('application/zip')) {
          // 移除 .tex 扩展名（如果有），添加 .zip
          filename = filename.replace(/\.tex$/, '').replace(/\.zip$/, '') + '.zip';
        } else if (contentType.includes('text/plain')) {
          // 确保是 .tex 扩展名
          filename = filename.replace(/\.zip$/, '').replace(/\.tex$/, '') + '.tex';
        }

        // 创建下载链接
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        alert("导出成功！");
      } catch (error) {
        console.error("导出失败:", error);
        alert("导出失败，请稍后重试");
      } finally {
        this.exporting = false;
      }
    },
  },
};
</script>

<style scoped>
.latex-export-container {
  padding: 2rem 0;
}

.page-header {
  background: white;
  padding: 1.5rem 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.breadcrumb {
  margin-bottom: 0;
  background: transparent;
  padding: 0;
}

.breadcrumb-item a {
  color: #667eea;
  transition: color 0.2s;
}

.breadcrumb-item a:hover {
  color: #764ba2;
}

.page-title {
  color: #333;
  font-weight: 700;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.question-item {
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.question-item:hover {
  background: #f8f9fa;
  border-color: #667eea !important;
}

.question-item.selected {
  background: #e8f0fe;
  border-color: #667eea !important;
}

.form-check-input {
  cursor: pointer;
}

.form-check-label {
  cursor: pointer;
}

.question-preview-content {
  font-size: 0.9rem;
}

.question-text-content {
  line-height: 1.6;
}

.option-list {
  padding-left: 1.5rem;
  margin-top: 0.5rem;
}

.option-item {
  margin-bottom: 0.25rem;
}

.question-answer {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #e9ecef;
}
</style>

