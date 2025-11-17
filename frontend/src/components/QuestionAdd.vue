<template>
  <div class="question-add-container">
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
            <li class="breadcrumb-item active" aria-current="page">新增试题</li>
          </ol>
        </nav>
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h1 class="page-title mb-1">
              <i class="bi bi-plus-circle"></i> 新增试题
            </h1>
            <p class="text-muted mb-0">填写以下信息创建新题目</p>
          </div>
          <router-link to="/question-list" class="btn btn-outline-secondary">
            <i class="bi bi-arrow-left"></i> 返回列表
          </router-link>
        </div>
      </div>

      <div class="row">
        <!-- 主表单 -->
        <div class="col-lg-8">
          <div class="card">
            <div class="card-body">
              <form @submit.prevent="addQuestion">
                <!-- 基本信息行 -->
                <div class="row g-3 mb-4">
                  <div class="col-md-6">
                    <label for="subject" class="form-label">
                      <i class="bi bi-book"></i> 试题科目
                    </label>
                    <select
                      v-model="subject"
                      id="subject"
                      class="form-select"
                      required
                    >
                      <option value="解析几何">解析几何</option>
                      <option value="线性代数II">线性代数II</option>
                      <option value="高等几何">高等几何</option>
                      <option value="微分几何">微分几何</option>
                    </select>
                  </div>
                  <div class="col-md-6">
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
                  <div class="col-md-6">
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
                  <div class="col-md-6">
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
                      @input="performSearch"
                      class="form-control"
                      rows="6"
                      placeholder="请输入题目内容..."
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
                      placeholder="请输入答案..."
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
                        :required="questionType === '单选题' || questionType === '多选题'"
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
                    {{ loading ? '保存中...' : '保存题目' }}
                  </button>
                  <button
                    type="button"
                    class="btn btn-outline-secondary"
                    @click="resetForm"
                  >
                    <i class="bi bi-arrow-clockwise"></i> 重置
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- 相似题目侧边栏 -->
        <div class="col-lg-4">
          <div class="card">
            <div class="card-header bg-light">
              <h5 class="mb-0">
                <i class="bi bi-search"></i> 相似题目
              </h5>
            </div>
            <div class="card-body">
              <div v-if="searchResults.length === 0" class="text-muted text-center py-3">
                <i class="bi bi-inbox display-6 d-block mb-2"></i>
                <small>输入题目内容后会自动搜索相似题目</small>
              </div>
              <div v-else class="similar-questions">
                <div
                  v-for="item in searchResults"
                  :key="item._id"
                  class="similar-question-item mb-3 p-3 border rounded"
                  @dblclick="deleteItem(item._id)"
                >
                  <div class="d-flex justify-content-between align-items-start mb-2">
                    <span class="badge bg-primary">{{ item.subject }}</span>
                    <span class="badge bg-secondary">{{ item.type }}</span>
                  </div>
                  <p class="mb-2 small">{{ item.questionText }}</p>
                  <template v-if="item.type === '单选题' || item.type === '多选题'">
                    <ol class="small mb-0" style="list-style-type: upper-alpha; padding-left: 1.2rem;">
                      <li v-for="(option, index) in (item.options || [])" :key="index">
                        {{ option }}
                      </li>
                    </ol>
                  </template>
                  <div class="mt-2">
                    <small class="text-muted">双击删除</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "QuestionAdd",
  data() {
    return {
      questionType: "单选题",
      options: {
        A: "",
        B: "",
        C: "",
        D: "",
      },
      initialOptions: {
        A: "",
        B: "",
        C: "",
        D: "",
      },
      questionText: "",
      questionAnswer: "",
      questionScore: 3,
      questionDifficulty: "简单",
      createdBy: "夏云伟",
      subject: "微分几何",
      searchResults: [],
      loading: false,
    };
  },
  methods: {
    async addQuestion() {
      this.loading = true;

      let dynamicFields = {};
      if (this.questionType === "单选题" || this.questionType === "多选题") {
        dynamicFields.options = this.options;
      }

      const formData = {
        questionText: this.questionText,
        ...dynamicFields,
        correctAnswer: this.questionAnswer,
        totalScore: this.questionScore,
        type: this.questionType,
        difficulty: this.questionDifficulty,
        createdBy: this.createdBy,
        subject: this.subject,
      };

      try {
        const response = await axios.post("/questions/create", formData, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.status === 200) {
          console.log("试题已添加:", response.data);
          alert("题目添加成功！");
          this.resetForm();
          this.$router.push("/question-list");
        }
      } catch (error) {
        console.error("添加试题出错:", error);
        alert("添加失败，请稍后重试");
      } finally {
        this.loading = false;
      }
    },
    resetForm() {
      this.questionText = "";
      this.options = { ...this.initialOptions };
      this.questionAnswer = "";
      this.questionScore = 3;
      this.questionDifficulty = "简单";
      this.searchResults = [];
    },
    async performSearch() {
      if (!this.questionText.trim()) {
        this.searchResults = [];
        return;
      }

      try {
        const response = await axios.get("/questions/search", {
          params: {
            subject: this.subject,
            questionType: this.questionType,
            questionText: await this.fetchKeywords(this.questionText),
          },
        });
        this.searchResults = response.data;
      } catch (error) {
        console.error("Failed to perform search:", error);
      }
    },
    async fetchKeywords(text) {
      if (!text.trim()) return "";
      
      const prompt =
        "Extract the most important four keywords from the following text, use semi-comma to separate:" +
        text;
      try {
        const response = await axios.post("/questions/extractKeywords", {
          prompt: prompt,
        });
        const extractedKeywords = response.data.keywords.trim();
        console.log("Extracted Keywords:", extractedKeywords);
        return extractedKeywords;
      } catch (error) {
        console.error("Failed to extract keywords:", error);
        return text; // 如果提取失败，使用原文本
      }
    },
    async deleteItem(itemId) {
      if (!confirm("确定要删除这道相似题目吗？")) {
        return;
      }

      try {
        await axios.delete(`/questions/${itemId}/delete`);
        this.performSearch(); // 重新搜索
      } catch (error) {
        console.error("Failed to delete item:", error);
        alert("删除失败");
      }
    },
  },
};
</script>

<style scoped>
.question-add-container {
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

.similar-questions {
  max-height: 600px;
  overflow-y: auto;
}

.similar-question-item {
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.similar-question-item:hover {
  background: #f8f9fa;
  border-color: #667eea !important;
}

.similar-question-item:active {
  transform: scale(0.98);
}

@media (max-width: 992px) {
  .question-add-container {
    padding: 1rem 0;
  }
}
</style>
