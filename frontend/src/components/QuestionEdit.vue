<template>
  <div class="question-edit-container app-page">
    <div class="app-container container-xl">
      <div class="mb-4">
        <nav aria-label="breadcrumb" class="mb-3 page-breadcrumb">
          <ol class="breadcrumb">
            <li class="breadcrumb-item">
              <router-link to="/question-list" class="text-decoration-none">
                <i class="bi bi-house"></i> 题目列表
              </router-link>
            </li>
            <li class="breadcrumb-item active" aria-current="page">编辑试题</li>
          </ol>
        </nav>
        <page-header
          title="编辑试题"
          icon="bi-pencil"
          test-id="question-edit-header"
        >
          <template #subtitle>
            修改题目信息
            <span v-if="usageCount != null" class="ms-2 badge bg-light text-dark">
              组卷使用 {{ usageCount }} 次
            </span>
            <span v-if="lastUsedAt" class="ms-1 text-muted small">（最近 {{ formatLastUsed(lastUsedAt) }}）</span>
          </template>
          <template #actions>
            <router-link to="/question-list" class="btn btn-outline-secondary">
              <i class="bi bi-arrow-left"></i> 返回列表
            </router-link>
          </template>
        </page-header>
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
                  <option value="易">易</option>
                  <option value="中">中</option>
                  <option value="难">难</option>
                </select>
              </div>
            </div>

            <!-- 题目和答案 -->
            <div class="row g-3 mb-3 question-form-stem-pair">
              <div class="col-12 col-md-6 question-form-stem-col">
                <label for="questionText" class="form-label">
                  <i class="bi bi-file-text"></i> 试题文本
                </label>
                <textarea
                  id="questionText"
                  v-model="questionText"
                  class="form-control form-textarea-auto question-form-field-textarea"
                  rows="5"
                  data-testid="question-form-text"
                  required
                ></textarea>
              </div>
              <div class="col-12 col-md-6 question-form-stem-col">
                <label for="questionAnswer" class="form-label">
                  <i class="bi bi-check-circle"></i> 试题答案
                </label>
                <textarea
                  id="questionAnswer"
                  v-model="questionAnswer"
                  class="form-control form-textarea-auto question-form-field-textarea"
                  rows="5"
                  data-testid="question-form-answer"
                  required
                ></textarea>
              </div>
            </div>
            <div class="row g-3 mb-4">
              <div class="col-12 question-form-solution-col">
                <label for="questionSolution" class="form-label">
                  <i class="bi bi-journal-text"></i> 解答过程（可选，LaTeX）
                </label>
                <textarea
                  id="questionSolution"
                  v-model="questionSolution"
                  class="form-control form-textarea-auto question-form-field-textarea"
                  rows="5"
                  data-testid="question-form-solution"
                  placeholder="与答案分开保存；单选题答案可填选项字母，详细推导写在此处。"
                ></textarea>
              </div>
            </div>

            <div class="mb-4">
              <h5 class="mb-2"><i class="bi bi-diagram-3"></i> 知识点</h5>
              <KnowledgePointPicker v-model="knowledgePointIds" :subject="questionSubject || '解析几何'" />
              <LlmKpSuggestPanel
                class="mt-3"
                :question-ids="questionId ? [questionId] : []"
                @applied="getQuestionData"
              />
            </div>

            <div class="mb-4">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h5 class="mb-0"><i class="bi bi-image"></i> 题干配图</h5>
                <button type="button" class="btn btn-sm btn-outline-primary" @click="addImageRow">
                  添加图片
                </button>
              </div>
              <div v-if="!questionImages.length" class="text-muted small">无配图（可从 LaTeX 导入或在此填写 uploads 文件名）</div>
              <div v-for="(img, idx) in questionImages" :key="idx" class="border rounded p-3 mb-2">
                <div class="row g-2">
                  <div class="col-md-4">
                    <label class="form-label small">URL / 文件名</label>
                    <input v-model="img.url" class="form-control form-control-sm" required />
                  </div>
                  <div class="col-md-3">
                    <label class="form-label small">标签 (fig:)</label>
                    <input v-model="img.label" class="form-control form-control-sm" placeholder="3" />
                  </div>
                  <div class="col-md-2">
                    <label class="form-label small">宽度</label>
                    <input v-model="img.width" class="form-control form-control-sm" placeholder="0.6\\textwidth" />
                  </div>
                  <div class="col-md-3">
                    <label class="form-label small">说明</label>
                    <input v-model="img.caption" class="form-control form-control-sm" />
                  </div>
                </div>
                <button type="button" class="btn btn-sm btn-outline-danger mt-2" @click="removeImageRow(idx)">
                  删除
                </button>
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
import KnowledgePointPicker from "./KnowledgePointPicker.vue";
import LlmKpSuggestPanel from "./LlmKpSuggestPanel.vue";
import PageHeader from "./ui/PageHeader.vue";

export default {
  name: "QuestionEdit",
  components: { KnowledgePointPicker, LlmKpSuggestPanel, PageHeader },
  data() {
    return {
      questionId: "",
      questionSubject: "",
      knowledgePointIds: [],
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
      questionSolution: "",
      questionImages: [],
      usageCount: null,
      lastUsedAt: null,
      loading: false,
    };
  },
  mounted() {
    this.getQuestionData();
  },
  methods: {
    formatLastUsed(iso) {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '';
      return d.toLocaleString('zh-CN');
    },
    async getQuestionData() {
      try {
        this.questionId = this.$route.params.id;
        const response = await axios.get(`/questions/${this.questionId}/get`);

        this.questionText = response.data.questionText;
        this.questionAnswer = response.data.questionAnswer;
        this.questionSolution = response.data.solution || "";

        // 如果后端返回了更多字段，可以在这里设置
        if (response.data.type) this.questionType = response.data.type;
        if (response.data.subject) this.questionSubject = response.data.subject;
        if (Array.isArray(response.data.knowledgePointIds)) {
          this.knowledgePointIds = response.data.knowledgePointIds.map(String);
        }
        if (response.data.totalScore) this.questionScore = response.data.totalScore;
        if (response.data.difficulty) this.questionDifficulty = response.data.difficulty;
        if (response.data.options) this.options = response.data.options;
        if (response.data.usageCount != null) this.usageCount = response.data.usageCount;
        if (response.data.lastUsedAt) this.lastUsedAt = response.data.lastUsedAt;
        if (Array.isArray(response.data.images)) {
          this.questionImages = response.data.images.map((img) => ({ ...img }));
        }
      } catch (error) {
        console.error("获取试题信息失败:", error);
        alert("获取题目信息失败，请稍后重试");
      }
    },
    addImageRow() {
      this.questionImages.push({ url: "", caption: "", label: "", width: "" });
    },
    removeImageRow(index) {
      this.questionImages.splice(index, 1);
    },
    async editQuestion() {
      this.loading = true;

      try {
        const payload = {
          questionText: this.questionText,
          correctAnswer: this.questionAnswer,
          solution: this.questionSolution,
        };

        // 如果有其他字段，也添加到 payload
        if (this.questionType) payload.type = this.questionType;
        if (this.questionScore) payload.totalScore = this.questionScore;
        if (this.questionDifficulty) payload.difficulty = this.questionDifficulty;
        if (
          (this.questionType === "单选题" || this.questionType === "多选题") &&
          this.options
        ) {
          payload.options = this.options;
        }
        payload.images = this.questionImages.filter((img) => img && String(img.url || "").trim());
        payload.knowledgePointIds = this.knowledgePointIds;
        if (this.questionSubject) payload.subject = this.questionSubject;

        await axios.put(`/questions/${this.questionId}/edit`, payload, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        alert("编辑成功！");
        this.$router.push({ name: "question-list" });
      } catch (error) {
        console.error("编辑试题失败:", error);
        alert("编辑失败，请稍后重试");
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

.form-label {
  font-weight: 500;
  color: #495057;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.form-label i {
  color: var(--color-primary, #2563eb);
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
}
</style>
