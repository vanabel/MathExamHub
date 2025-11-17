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
      <div v-else-if="questions.length > 0" class="row g-4">
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
              </div>

              <!-- 题目内容 -->
              <div class="question-content mb-3">
                <vue-mathjax
                  :formula="question.questionText"
                  :options="mathjaxOptions"
                ></vue-mathjax>
              </div>

              <!-- 选项（如果是选择题） -->
              <div v-if="question.type === '单选题' || question.type === '多选题'" class="question-options mb-3">
                <ol class="option-list">
                  <li v-for="(option, index) in question.options" :key="index" class="option-item">
                    <vue-mathjax :formula="option" :options="mathjaxOptions"></vue-mathjax>
                  </li>
                </ol>
              </div>

              <!-- 答案 -->
              <div class="question-answer">
                <strong>答案：</strong>
                <div ref="mathContainer" v-html="renderWithScoreAndMath(question.correctAnswer)"></div>
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
import VueMathjaxNext from "vue-mathjax-next";

export default {
  name: "QuestionList",
  data() {
    return {
      questions: [],
      allQuestions: [], // 保存所有题目用于搜索
      loading: true,
      searchQuery: "",
      mathjaxOptions: {
        tex: {
          inlineMath: [["$", "$"]],
          displayMath: [["$$", "$$"]],
        },
        CommonHTML: {
          linebreaks: { automatic: true },
        },
        "HTML-CSS": {
          styles: { ".MathJax_Display": { margin: 0 } },
          linebreaks: { automatic: true },
        },
        SVG: {
          linebreaks: { automatic: true },
        },
      },
    };
  },
  mounted() {
    this.getQuestionList();
  },
  methods: {
    async getQuestionList() {
      this.loading = true;
      try {
        const response = await axios.get("/questions/list");
        this.allQuestions = response.data;
        this.questions = response.data;
      } catch (error) {
        console.error("Failed to retrieve question list:", error);
      } finally {
        this.loading = false;
      }
    },
    handleSearch() {
      if (!this.searchQuery.trim()) {
        this.questions = this.allQuestions;
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
