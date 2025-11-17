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

              <!-- 全选/取消全选 -->
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
                          <span class="badge bg-info">{{ question.totalScore }} 分</span>
                        </div>
                      </div>
                      <p class="mb-0 small">{{ question.originalLaTeX || question.questionText }}</p>
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
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "LatexExport",
  data() {
    return {
      questions: [],
      selectedQuestionIds: [],
      loading: false,
      exporting: false,
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
      return this.questions.filter((q) => this.selectedQuestionIds.includes(q._id));
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
  },
  methods: {
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
        const response = await axios.post(
          "/questions/export/latex",
          {
            questionIds: this.selectedQuestionIds,
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
</style>

