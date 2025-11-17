<template>
  <div class="question-edit-container">
    <div class="container">
      <!-- 页面头部：面包屑 + 标题 -->
      <div class="page-header mb-4">
        <nav aria-label="breadcrumb" class="mb-3">
          <ol class="breadcrumb">
            <li class="breadcrumb-item">
              <router-link to="/question-list" class="text-decoration-none">
                <i class="bi bi-house"></i> 题目列表
              </router-link>
            </li>
            <li class="breadcrumb-item active" aria-current="page">编辑试题</li>
          </ol>
        </nav>
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h1 class="page-title mb-1">
              <i class="bi bi-pencil"></i> 编辑试题
            </h1>
            <p class="text-muted mb-0">修改题目信息</p>
          </div>
          <router-link to="/question-list" class="btn btn-outline-secondary">
            <i class="bi bi-arrow-left"></i> 返回列表
          </router-link>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <form @submit.prevent="editQuestion">
            <!-- 基本信息行 -->
            <div class="row g-3 mb-4">
              <div class="col-md-4">
                <label for="questionType" class="form-label">
                  <i class="bi bi-list-check"></i> 试题类型
                </label>
                <select
                  v-model="questionType"
                  id="questionType"
                  class="form-select"
                  required
                >
                  <option value="判断题">判断题</option>
                  <option value="单选题">单选题</option>
                  <option value="多选题">多选题</option>
                  <option value="填空题">填空题</option>
                  <option value="解答题">解答题</option>
                  <option value="计算题">计算题</option>
                  <option value="证明题">证明题</option>
                  <option value="作图题">作图题</option>
                </select>
              </div>
              <div class="col-md-4">
                <label for="questionScore" class="form-label">
                  <i class="bi bi-star"></i> 试题分值
                </label>
                <input
                  v-model="questionScore"
                  id="questionScore"
                  type="number"
                  class="form-control"
                  min="1"
                  required
                />
              </div>
              <div class="col-md-4">
                <label for="questionDifficulty" class="form-label">
                  <i class="bi bi-bar-chart"></i> 试题难度
                </label>
                <select
                  v-model="questionDifficulty"
                  id="questionDifficulty"
                  class="form-select"
                  required
                >
                  <option value="简单">简单</option>
                  <option value="中等">中等</option>
                  <option value="较难">较难</option>
                </select>
              </div>
            </div>

            <!-- 题目和答案 -->
            <div class="row g-3 mb-4">
              <div class="col-md-6">
                <label for="questionText" class="form-label">
                  <i class="bi bi-file-text"></i> 试题文本
                </label>
                <textarea
                  id="questionText"
                  v-model="questionText"
                  class="form-control"
                  rows="6"
                  required
                ></textarea>
              </div>
              <div class="col-md-6">
                <label for="questionAnswer" class="form-label">
                  <i class="bi bi-check-circle"></i> 试题答案
                </label>
                <textarea
                  id="questionAnswer"
                  v-model="questionAnswer"
                  class="form-control"
                  rows="6"
                  required
                ></textarea>
              </div>
            </div>

            <!-- 选项（选择题） -->
            <div
              v-if="questionType === '单选题' || questionType === '多选题'"
              class="options-section mb-4"
            >
              <h5 class="mb-3">
                <i class="bi bi-list-ul"></i> 选项设置
              </h5>
              <div class="row g-3">
                <div class="col-md-6" v-for="(value, key) in options" :key="key">
                  <label :for="`option${key}`" class="form-label">
                    选项 {{ key }}:
                  </label>
                  <input
                    v-model="options[key]"
                    :id="`option${key}`"
                    type="text"
                    class="form-control"
                    required
                    :placeholder="`请输入选项 ${key} 的内容`"
                  />
                </div>
              </div>
            </div>

            <!-- 提交按钮 -->
            <div class="d-flex gap-2">
              <button type="submit" class="btn btn-primary" :disabled="loading">
                <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                <i v-else class="bi bi-check-lg"></i>
                {{ loading ? '保存中...' : '保存修改' }}
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary"
                @click="$router.push('/question-list')"
              >
                <i class="bi bi-x-lg"></i> 取消
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "QuestionEdit",
  data() {
    return {
      questionType: "",
      questionScore: null,
      questionDifficulty: "",
      options: {
        A: "",
        B: "",
        C: "",
        D: "",
      },
      questionText: "",
      questionAnswer: "",
      loading: false,
    };
  },
  mounted() {
    this.getQuestionData();
  },
  methods: {
    async getQuestionData() {
      try {
        const questionId = this.$route.params.id;
        const response = await axios.get(`/questions/${questionId}/get`);

        // 设置基本字段
        // 如果有原始 LaTeX 代码，优先使用原始代码；否则使用处理后的文本
        this.questionText = response.data.originalLaTeX || response.data.questionText || '';
        this.questionAnswer = response.data.questionAnswer || '';

        // 设置类型、分值、难度
        this.questionType = response.data.type || '';
        this.questionScore = response.data.totalScore || null;
        this.questionDifficulty = response.data.difficulty || '';

        // 设置选项（如果是选择题）
        if ((response.data.type === '单选题' || response.data.type === '多选题') &&
            response.data.options && typeof response.data.options === 'object') {
          // 合并后端返回的选项和默认选项，确保所有选项键都存在
          this.options = {
            A: response.data.options.A || '',
            B: response.data.options.B || '',
            C: response.data.options.C || '',
            D: response.data.options.D || '',
            ...response.data.options, // 保留后端返回的其他选项（如 E, F 等）
          };
        } else {
          // 如果不是选择题或没有选项，保持默认的空选项
          this.options = {
            A: '',
            B: '',
            C: '',
            D: '',
          };
        }
      } catch (error) {
        console.error("获取试题信息失败:", error);
        alert("获取题目信息失败，请稍后重试");
      }
    },
    async editQuestion() {
      this.loading = true;

      try {
        const questionId = this.$route.params.id;

        const payload = {
          questionText: this.questionText,
          correctAnswer: this.questionAnswer,
        };

        // 如果有其他字段，也添加到 payload
        if (this.questionType) payload.type = this.questionType;
        if (this.questionScore !== null && this.questionScore !== undefined) {
          payload.totalScore = this.questionScore;
        }
        if (this.questionDifficulty) payload.difficulty = this.questionDifficulty;
        
        // 对于选择题，添加选项；对于非选择题，清除选项
        if (this.questionType === "单选题" || this.questionType === "多选题") {
          if (this.options) {
            // 过滤掉空选项，只保留有内容的选项
            const filteredOptions = {};
            Object.keys(this.options).forEach(key => {
              if (this.options[key] && this.options[key].trim() !== '') {
                filteredOptions[key] = this.options[key];
              }
            });
            payload.options = filteredOptions;
          }
        } else {
          // 非选择题类型，清除选项字段
          payload.options = {};
        }
        
        console.log('发送的 payload:', payload);

        const response = await axios.put(`/questions/${questionId}/edit`, payload, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.status === 200 || response.status === 201) {
          alert("编辑成功！");
          this.$router.push({ name: "question-list" });
        }
      } catch (error) {
        console.error("编辑试题失败:", error);
        const errorMessage = error.response?.data?.error || error.message || "编辑失败，请稍后重试";
        console.error("错误详情:", error.response?.data);
        alert(`编辑失败: ${errorMessage}`);
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.question-edit-container {
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

.page-title i {
  font-size: 1.5rem;
}

.form-label {
  font-weight: 500;
  color: #495057;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.form-label i {
  color: #667eea;
}

.options-section {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
}

@media (max-width: 768px) {
  .question-edit-container {
    padding: 1rem 0;
  }

  .page-header {
    padding: 1.5rem;
  }
}
</style>
