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
              <i class="bi bi-bar-chart"></i> 共 {{ questions.length }} 道题目
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
            <router-link to="/question-add" class="btn btn-primary">
              <i class="bi bi-plus-lg"></i> 添加题目
            </router-link>
          </div>
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

      <!-- 题目列表 -->
      <div v-else-if="questions.length > 0" class="question-list-wrapper">
        <!-- 批量操作工具栏 -->
        <div class="batch-actions-toolbar mb-3 p-3 bg-light rounded">
          <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div class="d-flex align-items-center gap-3">
              <div class="form-check">
                <input
                  class="form-check-input"
                  type="checkbox"
                  :checked="isAllSelected"
                  :indeterminate="isIndeterminate"
                  @change="toggleSelectAll"
                  id="selectAll"
                />
                <label class="form-check-label" for="selectAll">
                  <strong>全选</strong>
                </label>
              </div>
              <span class="text-muted">
                已选择 <strong>{{ selectedQuestions.length }}</strong> 道题目
              </span>
            </div>
            <div class="d-flex gap-2">
              <button
                v-if="selectedQuestions.length > 0"
                @click="batchDelete"
                class="btn btn-danger btn-sm"
              >
                <i class="bi bi-trash"></i> 批量删除 ({{ selectedQuestions.length }})
              </button>
            </div>
          </div>
        </div>

        <!-- 列表 -->
        <div class="list-group">
          <div
            v-for="question in questions"
            :key="question._id"
            class="list-group-item question-list-item"
            :class="{ 'selected': isSelected(question._id) }"
          >
            <div class="d-flex align-items-start gap-3">
              <!-- 复选框 -->
              <div class="form-check mt-2">
                <input
                  class="form-check-input"
                  type="checkbox"
                  :checked="isSelected(question._id)"
                  @change="toggleSelection(question._id)"
                  :id="`question-${question._id}`"
                />
              </div>

              <!-- 题目内容 -->
              <div class="flex-grow-1">
                <!-- 题目头部信息 -->
                <div class="question-header mb-2">
                  <span class="badge bg-primary me-2">{{ question.subject }}</span>
                  <span class="badge bg-secondary me-2">{{ question.type }}</span>
                  <span class="badge" :class="getDifficultyClass(question.difficulty)" style="margin-right: 0.5rem;">
                    {{ question.difficulty }}
                  </span>
                  <span class="badge bg-info">{{ question.totalScore }} 分</span>
                </div>

                <!-- 题目文本 -->
                <div class="question-content mb-2">
                  <div 
                    v-html="processQuestionTextToHTML(question.questionText)"
                    ref="questionContent"
                    class="question-text-content"
                  ></div>
                </div>

                <!-- 选项（如果是选择题） -->
                <div v-if="question.type === '单选题' || question.type === '多选题'" class="question-options mb-2">
                  <ol class="option-list mb-0">
                    <li v-for="(option, index) in question.options" :key="index" class="option-item">
                      <vue-mathjax :formula="option" :options="mathjaxOptions"></vue-mathjax>
                    </li>
                  </ol>
                </div>

                <!-- 答案 -->
                <div class="question-answer mb-2">
                  <strong>答案：</strong>
                  <vue-mathjax
                    :formula="processAnswerText(question.correctAnswer)"
                    :options="mathjaxOptions"
                  ></vue-mathjax>
                </div>

                <!-- 操作按钮 -->
                <div class="question-actions mt-2 pt-2 border-top">
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
import VueMathjaxNext from "vue-mathjax-next";
import { mathjaxOptions } from "../utils/mathjaxConfig";
import { processQuestionText, processAnswerText, processQuestionTextToHTML } from "../utils/latexProcessor";

export default {
  name: "QuestionList",
  data() {
    return {
      questions: [],
      allQuestions: [], // 保存所有题目用于搜索
      loading: true,
      searchQuery: "",
      mathjaxOptions: mathjaxOptions,
      selectedQuestionIds: [], // 选中的题目ID数组
    };
  },
  computed: {
    selectedQuestions() {
      return this.questions.filter((q) => this.selectedQuestionIds.includes(q._id));
    },
    isAllSelected() {
      return this.questions.length > 0 && this.selectedQuestionIds.length === this.questions.length;
    },
    isIndeterminate() {
      return this.selectedQuestionIds.length > 0 && this.selectedQuestionIds.length < this.questions.length;
    },
  },
  mounted() {
    this.getQuestionList();
  },
  updated() {
    // 组件更新后重新渲染 MathJax 和 PDF
    this.$nextTick(() => {
      // 延迟一下，确保 v-html 已经更新
      setTimeout(() => {
        this.renderMathJax();
        // 只在没有正在渲染的 PDF 时才调用 renderPDFs
        const hasRenderingPDFs = document.querySelectorAll('.pdf-canvas[data-rendering="true"]').length > 0;
        if (!hasRenderingPDFs) {
          this.renderPDFs();
        }
      }, 100);
    });
  },
  methods: {
    // 将导入的函数添加到 methods 中，以便在模板中使用
    processQuestionText,
    processAnswerText,
    processQuestionTextToHTML,
    renderMathJax() {
      // 使用 MathJax 渲染页面中的数学公式
      if (window.MathJax && window.MathJax.Hub) {
        // 使用 setTimeout 确保 DOM 完全更新
        setTimeout(() => {
          window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
        }, 50);
      }
    },
    renderPDFs() {
      // 使用 PDF.js 渲染 PDF 文件
      if (typeof window.pdfjsLib === 'undefined') {
        return; // PDF.js 未加载
      }

      // 配置 PDF.js worker
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      // 查找所有 PDF 容器
      const pdfContainers = document.querySelectorAll('.pdf-container[data-pdf-url]');
      
      pdfContainers.forEach((container) => {
        const pdfUrl = container.getAttribute('data-pdf-url');
        const pdfId = container.getAttribute('data-pdf-id');
        // 使用 getElementById 或直接通过类名查找 canvas（更安全，避免选择器问题）
        const canvas = container.querySelector('.pdf-canvas') || document.getElementById(`pdf-canvas-${pdfId}`);
        
        // 如果已经渲染过或正在渲染，跳过
        if (canvas && (canvas.dataset.rendered === 'true' || canvas.dataset.rendering === 'true')) {
          return;
        }

        if (canvas && pdfUrl) {
          // 标记为正在渲染，防止重复渲染
          canvas.dataset.rendering = 'true';
          
          // 存储渲染任务，以便可以取消
          let renderTask = null;
          
          // 渲染 PDF
          window.pdfjsLib.getDocument(pdfUrl).promise
            .then((pdf) => {
              // 渲染第一页
              return pdf.getPage(1);
            })
            .then((page) => {
              const viewport = page.getViewport({ scale: 1.5 });
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              const context = canvas.getContext('2d');
              
              // 创建渲染任务
              renderTask = page.render({
                canvasContext: context,
                viewport: viewport
              });
              
              // 等待渲染完成
              return renderTask.promise;
            })
            .then(() => {
              // 渲染完成，标记为已渲染
              canvas.dataset.rendered = 'true';
              canvas.dataset.rendering = 'false';
            })
            .catch((error) => {
              // 清除渲染标志
              canvas.dataset.rendering = 'false';
              
              // 如果是取消错误，不显示错误信息
              if (error.name === 'RenderingCancelledException') {
                return;
              }
              
              console.error('PDF 加载错误:', error);
              const errorMsg = document.createElement('p');
              errorMsg.style.cssText = 'color: red; text-align: center; padding: 20px;';
              errorMsg.innerHTML = `PDF 加载失败。请<a href="${pdfUrl}" target="_blank" style="color: #007bff;">点击这里</a>在新窗口打开。`;
              container.innerHTML = '';
              container.appendChild(errorMsg);
            });
        }
      });
    },
    async getQuestionList() {
      this.loading = true;
      try {
        const response = await axios.get("/questions/list");
        this.allQuestions = response.data;
        this.questions = response.data;
        // 等待 DOM 更新后再渲染 MathJax 和 PDF
        await this.$nextTick();
        setTimeout(() => {
          this.renderMathJax();
          this.renderPDFs();
        }, 100);
      } catch (error) {
        console.error("Failed to retrieve question list:", error);
      } finally {
        this.loading = false;
      }
    },
    async handleSearch() {
      if (!this.searchQuery.trim()) {
        this.questions = this.allQuestions;
        // 搜索时清空选中
        this.selectedQuestionIds = [];
        await this.$nextTick();
        this.renderMathJax();
        return;
      }

      const query = this.searchQuery.toLowerCase();
      this.questions = this.allQuestions.filter((q) => {
        return (
          q.questionText?.toLowerCase().includes(query) ||
          q.subject?.toLowerCase().includes(query) ||
          q.type?.toLowerCase().includes(query) ||
          q.difficulty?.toLowerCase().includes(query)
        );
      });
      // 搜索时清空选中
      this.selectedQuestionIds = [];
      // 等待 DOM 更新后再渲染 MathJax 和 PDF
      await this.$nextTick();
      setTimeout(() => {
        this.renderMathJax();
        this.renderPDFs();
      }, 100);
    },
    renderWithScoreAndMath(content) {
      const replacedContent = content.replace(
        /\\score{(\d+)}/g,
        '<div>\n' + "-".repeat(150) + "（" + "$1'" + "）\n</div>"
      );
      return replacedContent;
    },
    getDifficultyClass(difficulty) {
      const classes = {
        简单: "bg-success",
        中等: "bg-warning",
        较难: "bg-danger",
      };
      return classes[difficulty] || "bg-secondary";
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
    toggleSelectAll() {
      if (this.isAllSelected) {
        // 取消全选
        this.selectedQuestionIds = [];
      } else {
        // 全选
        this.selectedQuestionIds = this.questions.map((q) => q._id);
      }
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
        // 从选中列表中移除
        this.selectedQuestionIds = this.selectedQuestionIds.filter((selectedId) => selectedId !== id);
      } catch (error) {
        console.error("删除失败:", error);
        alert("删除失败，请稍后重试");
      }
    },
    async batchDelete() {
      if (this.selectedQuestionIds.length === 0) {
        alert("请至少选择一道题目");
        return;
      }

      if (!confirm(`确定要删除选中的 ${this.selectedQuestionIds.length} 道题目吗？此操作不可恢复！`)) {
        return;
      }

      try {
        // 批量删除
        const deletePromises = this.selectedQuestionIds.map((id) =>
          axios.delete(`/questions/${id}/delete`)
        );
        await Promise.all(deletePromises);

        // 更新列表
        this.allQuestions = this.allQuestions.filter(
          (q) => !this.selectedQuestionIds.includes(q._id)
        );
        this.questions = this.questions.filter(
          (q) => !this.selectedQuestionIds.includes(q._id)
        );

        // 清空选中列表
        this.selectedQuestionIds = [];

        alert(`成功删除 ${deletePromises.length} 道题目`);
      } catch (error) {
        console.error("批量删除失败:", error);
        alert("批量删除失败，请稍后重试");
      }
    },
  },
  components: {
    "vue-mathjax": VueMathjaxNext,
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

.question-list-wrapper {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.batch-actions-toolbar {
  border: 1px solid #dee2e6;
}

.question-list-item {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  padding: 1.25rem;
  transition: all 0.2s;
}

.question-list-item:hover {
  background-color: #f8f9fa;
  border-color: #667eea;
}

.question-list-item.selected {
  background-color: #e8f0fe;
  border-color: #667eea;
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);
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
  color: #333;
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 0.5rem;
}

.question-text-content {
  /* 确保 MathJax 能够正确渲染 HTML 中的数学公式 */
  display: block;
}

.question-text-content .pickout-answer {
  font-weight: 500;
  color: #495057;
  /* 防止 MathJax 处理 */
  display: inline;
}

.latex-enumerate {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
  list-style-type: decimal;
}

.latex-enumerate li {
  margin-bottom: 0.5rem;
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
