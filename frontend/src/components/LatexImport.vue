<template>
  <div class="latex-import-container">
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
            <li class="breadcrumb-item active" aria-current="page">导入 LaTeX 文件</li>
          </ol>
        </nav>
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h1 class="page-title mb-1">
              <i class="bi bi-upload"></i> 导入 LaTeX 文件
            </h1>
            <p class="text-muted mb-0">上传 .tex 文件，自动解析并导入题目到题库</p>
          </div>
          <router-link to="/question-list" class="btn btn-outline-secondary">
            <i class="bi bi-arrow-left"></i> 返回列表
          </router-link>
        </div>
      </div>

      <div class="row">
        <div class="col-lg-8 mx-auto">
          <div class="card">
            <div class="card-body">
              <!-- 文件上传区域 -->
              <div class="upload-area mb-4">
                <input
                  ref="fileInput"
                  type="file"
                  accept=".tex"
                  @change="handleFileSelect"
                  class="d-none"
                  id="fileInput"
                />
                <input
                  ref="imageInput"
                  type="file"
                  accept=".png,.jpg,.jpeg,.gif,.pdf"
                  @change="handleImageSelect"
                  class="d-none"
                  multiple
                  id="imageInput"
                />
                <label
                  for="fileInput"
                  class="upload-label"
                  :class="{ 'dragover': isDragging, 'has-file': selectedFile }"
                  @dragover.prevent="isDragging = true"
                  @dragleave.prevent="isDragging = false"
                  @drop.prevent="handleDrop"
                >
                  <div class="upload-content">
                    <i class="bi bi-cloud-upload display-4 text-primary mb-3"></i>
                    <h5 v-if="!selectedFile">点击选择文件或拖拽文件到此处</h5>
                    <h5 v-else class="text-success">
                      <i class="bi bi-check-circle"></i> {{ selectedFile.name }}
                    </h5>
                    <p class="text-muted mb-0">支持 .tex 格式文件，最大 10MB</p>
                    <p class="text-muted mb-0 small">图片支持：png/jpg/jpeg/gif/pdf</p>
                  </div>
                </label>
                <!-- 图片文件上传区域 -->
                <div class="mt-3">
                  <label for="imageInput" class="btn btn-outline-primary btn-sm">
                    <i class="bi bi-image"></i> 上传图片文件（可选）
                  </label>
                  <div v-if="selectedImages.length > 0" class="mt-2">
                    <small class="text-muted">已选择 {{ selectedImages.length }} 个文件：</small>
                    <ul class="list-unstyled mt-1">
                      <li v-for="(img, index) in selectedImages" :key="index" class="text-sm">
                        <i :class="img.name.endsWith('.pdf') ? 'bi bi-file-pdf' : 'bi bi-file-image'"></i> {{ img.name }}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <!-- 导入选项 -->
              <div class="import-options mb-4">
                <h5 class="mb-3">
                  <i class="bi bi-gear"></i> 导入选项
                </h5>
                <div class="row g-3">
                  <div class="col-md-6">
                    <label for="createdBy" class="form-label">创建者</label>
                    <input
                      v-model="createdBy"
                      id="createdBy"
                      type="text"
                      class="form-control"
                      placeholder="系统导入"
                    />
                  </div>
                  <div class="col-md-6">
                    <label for="duplicateThreshold" class="form-label">重复检测相似度阈值</label>
                    <input
                      v-model.number="duplicateThreshold"
                      id="duplicateThreshold"
                      type="number"
                      class="form-control"
                      min="0"
                      max="1"
                      step="0.05"
                      placeholder="0.85"
                    />
                    <small class="form-text text-muted">0-1之间，值越大要求越严格</small>
                  </div>
                  <div class="col-md-12">
                    <div class="form-check">
                      <input
                        v-model="checkDuplicates"
                        class="form-check-input"
                        type="checkbox"
                        id="checkDuplicates"
                      />
                      <label class="form-check-label" for="checkDuplicates">
                        检测重复题目
                      </label>
                    </div>
                    <div v-if="checkDuplicates" class="form-check mt-2">
                      <input
                        v-model="skipDuplicates"
                        class="form-check-input"
                        type="checkbox"
                        id="skipDuplicates"
                      />
                      <label class="form-check-label" for="skipDuplicates">
                        自动跳过重复题目（不导入）
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="d-flex gap-2">
                <button
                  type="button"
                  class="btn btn-info"
                  @click="previewFile"
                  :disabled="!selectedFile || previewing || importing"
                >
                  <span v-if="previewing" class="spinner-border spinner-border-sm me-2"></span>
                  <i v-else class="bi bi-eye"></i>
                  {{ previewing ? '预览中...' : '预览题目' }}
                </button>
                <button
                  type="button"
                  class="btn btn-primary"
                  @click="importFile"
                  :disabled="!selectedFile || importing || previewing"
                  v-if="!previewData"
                >
                  <span v-if="importing" class="spinner-border spinner-border-sm me-2"></span>
                  <i v-else class="bi bi-upload"></i>
                  {{ importing ? '导入中...' : '直接导入' }}
                </button>
                <button
                  v-if="previewData"
                  type="button"
                  class="btn btn-success"
                  @click="confirmImport"
                  :disabled="importing"
                >
                  <span v-if="importing" class="spinner-border spinner-border-sm me-2"></span>
                  <i v-else class="bi bi-check-circle"></i>
                  {{ importing ? '导入中...' : '确认导入' }}
                </button>
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  @click="resetForm"
                  :disabled="importing || previewing"
                >
                  <i class="bi bi-arrow-clockwise"></i> 重置
                </button>
              </div>

              <!-- 预览区域 -->
              <div v-if="previewData && !importResult" class="preview-area mt-4">
                <div class="card">
                  <div class="card-header bg-info text-white d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">
                      <i class="bi bi-eye"></i> 预览识别到的题目
                    </h5>
                    <div>
                      <button
                        type="button"
                        class="btn btn-sm"
                        :class="previewMode ? 'btn-light' : 'btn-outline-light'"
                        @click="previewMode = !previewMode"
                      >
                        <i :class="previewMode ? 'bi bi-eye-fill' : 'bi bi-eye'"></i>
                        {{ previewMode ? '预览模式' : '文本模式' }}
                      </button>
                    </div>
                  </div>
                  <div class="card-body">
                    <div class="alert alert-info mb-3">
                      <strong>共识别到 {{ previewQuestions.length }} 道题目</strong>
                      <span v-if="previewData && previewData.duplicateCount > 0" class="ms-2">
                        （<span class="text-warning">检测到 {{ previewData.duplicateCount }} 道可能重复的题目</span>）
                      </span>
                    </div>

                    <!-- 题目列表 -->
                    <div class="question-list" style="max-height: 600px; overflow-y: auto">
                      <div
                        v-for="(question, index) in previewQuestions"
                        :key="index"
                        class="question-item mb-3 p-3 border rounded"
                        :class="{ 'border-warning': isDuplicateQuestion(question) }"
                      >
                        <div class="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <span class="badge bg-primary me-2">题目 #{{ index + 1 }}</span>
                            <span class="badge bg-secondary me-2">{{ question.type || '未知类型' }}</span>
                            <span class="badge bg-info" v-if="question.totalScore">{{ question.totalScore }} 分</span>
                            <span v-if="isDuplicateQuestion(question)" class="badge bg-warning text-dark ms-2">
                              <i class="bi bi-exclamation-triangle"></i> 可能重复
                            </span>
                          </div>
                        </div>

                        <!-- 预览模式 -->
                        <div v-if="previewMode" class="question-preview-content">
                          <div 
                            v-html="processQuestionTextToHTML(question.questionText, question.originalLaTeX)"
                            class="question-text-content mb-2"
                          ></div>
                          <!-- 选项（如果是选择题） -->
                          <div v-if="question.options && Object.keys(question.options).length > 0" class="question-options mb-2">
                            <ol class="option-list mb-0 small">
                              <li v-for="(option, optIndex) in question.options" :key="optIndex" class="option-item">
                                <vue-mathjax :formula="option" :options="mathjaxOptions"></vue-mathjax>
                              </li>
                            </ol>
                          </div>
                          <!-- 答案 -->
                          <div class="question-answer mb-0" v-if="question.correctAnswer">
                            <strong>答案：</strong>
                            <div v-html="processAnswerTextToHTML(question.correctAnswer)"></div>
                          </div>
                        </div>
                        <!-- 文本模式 -->
                        <div v-else class="text-mode">
                          <div class="mb-2">
                            <strong>题目：</strong>
                            <pre class="small mb-0 bg-light p-2 rounded">{{ question.originalLaTeX || question.questionText }}</pre>
                          </div>
                          <div v-if="question.correctAnswer" class="mb-2">
                            <strong>答案：</strong>
                            <pre class="small mb-0 bg-light p-2 rounded">{{ question.correctAnswer }}</pre>
                          </div>
                        </div>

                        <!-- 重复题目详情 -->
                        <div v-if="isDuplicateQuestion(question)" class="mt-2 p-2 bg-warning bg-opacity-10 rounded">
                          <small class="text-muted">
                            <strong>相似的题目：</strong>
                            <div v-for="(dup, dupIndex) in getDuplicateInfo(question)" :key="dupIndex" class="mt-1">
                              ID: {{ dup._id }} | 相似度: {{ (dup.similarity * 100).toFixed(1) }}%
                            </div>
                          </small>
                        </div>
                      </div>
                    </div>

                    <!-- 重复题目警告 -->
                    <div v-if="previewData.duplicates && previewData.duplicates.length > 0" class="mt-3">
                      <div class="alert alert-warning mb-0">
                        <h6 class="alert-heading">
                          <i class="bi bi-exclamation-triangle"></i>
                          检测到 {{ previewData.duplicateCount }} 道可能重复的题目
                        </h6>
                        <details class="mt-2">
                          <summary class="cursor-pointer fw-bold">查看重复题目详情</summary>
                          <div class="mt-3">
                            <div
                              v-for="(dup, index) in previewData.duplicates"
                              :key="index"
                              class="duplicate-item mb-3 p-3 bg-white rounded border"
                            >
                              <div class="d-flex justify-content-between align-items-start mb-2">
                                <strong class="text-danger">
                                  <i class="bi bi-exclamation-circle"></i>
                                  重复题目 #{{ index + 1 }}
                                </strong>
                                <span class="badge bg-warning text-dark">
                                  相似度: {{ (dup.duplicates[0]?.similarity * 100).toFixed(1) }}%
                                </span>
                              </div>
                              <div class="mb-2">
                                <strong>导入的题目：</strong>
                                <div class="question-preview p-2 bg-light rounded mt-1">{{ formatQuestionText(dup.question.questionText) }}</div>
                              </div>
                              <div>
                                <strong>数据库中相似的题目：</strong>
                                <div v-for="(match, matchIndex) in dup.duplicates" :key="matchIndex" class="match-item mt-2 p-2 bg-light rounded">
                                  <div class="d-flex justify-content-between align-items-start mb-1">
                                    <span class="badge bg-secondary">ID: {{ match._id }}</span>
                                    <span class="badge" :class="match.matchType === 'exact' ? 'bg-danger' : 'bg-warning'">
                                      {{ match.matchType === 'exact' ? '完全匹配' : '相似匹配' }}
                                      ({{ (match.similarity * 100).toFixed(1) }}%)
                                    </span>
                                  </div>
                                  <div class="question-preview">{{ formatQuestionText(match.questionText) }}</div>
                                  <div class="mt-1" v-if="match.subject || match.type">
                                    <small class="text-muted">
                                      <span v-if="match.subject">科目: {{ match.subject }} | </span>
                                      <span v-if="match.type">类型: {{ match.type }}</span>
                                    </small>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </details>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 导入结果 -->
              <div v-if="importResult" class="import-result mt-4">
                <div
                  class="alert"
                  :class="{
                    'alert-success': importResult.success,
                    'alert-warning': !importResult.success,
                  }"
                >
                  <h5 class="alert-heading">
                    <i
                      :class="
                        importResult.success
                          ? 'bi bi-check-circle'
                          : 'bi bi-exclamation-triangle'
                      "
                    ></i>
                    {{ importResult.success ? '导入成功' : '导入完成（部分失败）' }}
                  </h5>
                  <p>
                    成功导入: <strong>{{ importResult.imported }}</strong> 道题目
                    <span v-if="importResult.failed > 0">
                      ，失败: <strong>{{ importResult.failed }}</strong> 道题目
                    </span>
                  </p>
                  <div v-if="importResult.errors && importResult.errors.length > 0" class="mt-3">
                    <details>
                      <summary class="cursor-pointer">查看错误详情</summary>
                      <ul class="mt-2 mb-0">
                        <li v-for="(error, index) in importResult.errors" :key="index">
                          {{ error.error }}
                        </li>
                      </ul>
                    </details>
                  </div>
                  <!-- 重复题目警告 -->
                  <div v-if="importResult.duplicates && importResult.duplicates.length > 0" class="mt-3">
                    <div class="alert alert-warning mb-0">
                      <h6 class="alert-heading">
                        <i class="bi bi-exclamation-triangle"></i>
                        检测到 {{ importResult.duplicateCount || importResult.duplicates.length }} 道可能重复的题目
                      </h6>
                      <details class="mt-2">
                        <summary class="cursor-pointer fw-bold">查看重复题目详情</summary>
                        <div class="mt-3">
                          <div
                            v-for="(dup, index) in importResult.duplicates"
                            :key="index"
                            class="duplicate-item mb-3 p-3 bg-white rounded border"
                          >
                            <div class="d-flex justify-content-between align-items-start mb-2">
                              <strong class="text-danger">
                                <i class="bi bi-exclamation-circle"></i>
                                重复题目 #{{ index + 1 }}
                              </strong>
                              <span class="badge bg-warning text-dark">
                                相似度: {{ (dup.duplicates[0]?.similarity * 100).toFixed(1) }}%
                              </span>
                            </div>
                            <div class="mb-2">
                              <strong>导入的题目：</strong>
                              <div class="question-preview p-2 bg-light rounded mt-1">{{ formatQuestionText(dup.question.questionText) }}</div>
                            </div>
                            <div>
                              <strong>数据库中相似的题目：</strong>
                              <div v-for="(match, matchIndex) in dup.duplicates" :key="matchIndex" class="match-item mt-2 p-2 bg-light rounded">
                                <div class="d-flex justify-content-between align-items-start mb-1">
                                  <span class="badge bg-secondary">ID: {{ match._id }}</span>
                                  <span class="badge" :class="match.matchType === 'exact' ? 'bg-danger' : 'bg-warning'">
                                    {{ match.matchType === 'exact' ? '完全匹配' : '相似匹配' }}
                                    ({{ (match.similarity * 100).toFixed(1) }}%)
                                  </span>
                                </div>
                                <div class="question-preview">{{ formatQuestionText(match.questionText) }}</div>
                                <div class="mt-1" v-if="match.subject || match.type">
                                  <small class="text-muted">
                                    <span v-if="match.subject">科目: {{ match.subject }} | </span>
                                    <span v-if="match.type">类型: {{ match.type }}</span>
                                  </small>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </details>
                    </div>
                  </div>
                  <hr v-if="importResult.success" />
                  <div v-if="importResult.success" class="d-flex gap-2">
                    <router-link to="/question-list" class="btn btn-sm btn-primary">
                      查看题目列表
                    </router-link>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-secondary"
                      @click="resetForm"
                    >
                      继续导入
                    </button>
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
import VueMathjaxNext from "vue-mathjax-next";
import { mathjaxOptions } from "../utils/mathjaxConfig";
import { processQuestionTextToHTML, processAnswerTextToHTML } from "../utils/latexProcessor";

export default {
  name: "LatexImport",
  components: {
    "vue-mathjax": VueMathjaxNext,
  },
  data() {
    return {
      selectedFile: null,
      selectedImages: [],
      isDragging: false,
      importing: false,
      previewing: false,
      createdBy: "",
      importResult: null,
      previewData: null,
      previewMode: true, // true = 预览模式, false = 文本模式
      checkDuplicates: true,
      skipDuplicates: false,
      duplicateThreshold: 0.85,
      mathjaxOptions: mathjaxOptions,
    };
  },
  computed: {
    previewQuestions() {
      // 防御性检查：确保 previewData.questions 是数组
      if (!this.previewData || !this.previewData.questions) {
        return [];
      }
      return Array.isArray(this.previewData.questions) ? this.previewData.questions : [];
    },
  },
  methods: {
    handleFileSelect(event) {
      const file = event.target.files[0];
      if (file) {
        if (!file.name.endsWith(".tex")) {
          alert("请选择 .tex 格式的文件");
          return;
        }
        this.selectedFile = file;
        this.isDragging = false;
      }
    },
    handleDrop(event) {
      this.isDragging = false;
      const files = Array.from(event.dataTransfer.files);
      const texFile = files.find(f => f.name.endsWith(".tex"));
      const imageFiles = files.filter(f => 
        f.name.match(/\.(png|jpg|jpeg|gif|pdf)$/i)
      );
      
      if (texFile) {
        this.selectedFile = texFile;
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(texFile);
        this.$refs.fileInput.files = dataTransfer.files;
      }
      
      if (imageFiles.length > 0) {
        this.selectedImages = [...this.selectedImages, ...imageFiles];
        const dataTransfer = new DataTransfer();
        this.selectedImages.forEach(img => dataTransfer.items.add(img));
        this.$refs.imageInput.files = dataTransfer.files;
      }
      
      if (!texFile && imageFiles.length === 0) {
        alert("请选择 .tex 文件或图片文件");
      }
    },
    handleImageSelect(event) {
      const files = Array.from(event.target.files);
      const imageFiles = files.filter(f => 
        f.name.match(/\.(png|jpg|jpeg|gif|pdf)$/i)
      );
      if (imageFiles.length > 0) {
        this.selectedImages = [...this.selectedImages, ...imageFiles];
      }
    },
    async previewFile() {
      if (!this.selectedFile) {
        alert("请先选择文件");
        return;
      }

      this.previewing = true;
      this.previewData = null;
      this.importResult = null;

      const formData = new FormData();
      formData.append("file", this.selectedFile);
      // 添加图片文件
      this.selectedImages.forEach((img) => {
        formData.append("images", img);
      });
      formData.append("checkDuplicates", this.checkDuplicates ? "true" : "false");
      formData.append("duplicateThreshold", this.duplicateThreshold.toString());

      try {
        console.log("🚀 开始预览 LaTeX 文件...");
        console.log("API Base URL:", axios.defaults.baseURL);
        const response = await axios.post("/questions/import/latex/preview", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        // 确保 questions 始终是数组
        let data = response.data;
        
        // 检查是否返回了 HTML（说明请求被前端路由处理了）
        if (typeof data === 'string' && data.includes('<!doctype html>')) {
          console.error("✗ API 返回了 HTML 页面，请求路径可能不正确");
          console.error("请求 URL:", axios.defaults.baseURL + "/questions/import/latex/preview");
          throw new Error("API 请求失败：返回了 HTML 页面，请检查 API 路径和代理配置");
        }
        
        if (data && !Array.isArray(data.questions)) {
          console.warn("⚠ API 返回的 questions 不是数组:", data);
          // 创建新对象而不是修改只读属性
          data = {
            ...data,
            questions: []
          };
        }
        this.previewData = data;
        if (data.success) {
          console.log("✓ 预览成功:", {
            questionsCount: data.questions?.length || 0,
            duplicateCount: data.duplicateCount || 0,
            filePrefix: data.filePrefix
          });
        } else {
          console.warn("⚠ 预览返回 success: false", data);
        }
      } catch (error) {
        console.error("✗ 预览失败:", error);
        console.error("错误详情:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          statusText: error.response?.statusText
        });
        if (error.response?.data?.details) {
          console.error("服务器错误堆栈:", error.response.data.details);
        }
        alert(error.response?.data?.error || "预览失败，请检查文件格式");
      } finally {
        this.previewing = false;
      }
    },
    async confirmImport() {
      if (!this.previewData || !this.selectedFile) {
        alert("请先预览文件");
        return;
      }

      // 使用预览数据，直接调用导入接口
      this.importing = true;
      this.importResult = null;

      const formData = new FormData();
      formData.append("file", this.selectedFile);
      // 添加图片文件
      this.selectedImages.forEach((img) => {
        formData.append("images", img);
      });
      if (this.createdBy) {
        formData.append("createdBy", this.createdBy);
      }
      formData.append("checkDuplicates", this.checkDuplicates ? "true" : "false");
      formData.append("skipDuplicates", this.skipDuplicates ? "true" : "false");
      formData.append("duplicateThreshold", this.duplicateThreshold.toString());

      try {
        const response = await axios.post("/questions/import/latex", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        this.importResult = response.data;
        this.previewData = null; // 清除预览数据，显示导入结果
        if (response.data.success) {
          console.log("导入成功:", response.data);
        }
      } catch (error) {
        console.error("导入失败:", error);
        this.importResult = {
          success: false,
          imported: 0,
          failed: 1,
          errors: [
            {
              error: error.response?.data?.error || "导入失败，请检查文件格式",
            },
          ],
        };
      } finally {
        this.importing = false;
      }
    },
    async importFile() {
      if (!this.selectedFile) {
        alert("请先选择文件");
        return;
      }

      this.importing = true;
      this.importResult = null;

      const formData = new FormData();
      formData.append("file", this.selectedFile);
      // 添加图片文件
      this.selectedImages.forEach((img) => {
        formData.append("images", img);
      });
      if (this.createdBy) {
        formData.append("createdBy", this.createdBy);
      }
      formData.append("checkDuplicates", this.checkDuplicates ? "true" : "false");
      formData.append("skipDuplicates", this.skipDuplicates ? "true" : "false");
      formData.append("duplicateThreshold", this.duplicateThreshold.toString());

      try {
        const response = await axios.post("/questions/import/latex", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        this.importResult = response.data;
        if (response.data.success) {
          console.log("导入成功:", response.data);
        }
      } catch (error) {
        console.error("导入失败:", error);
        this.importResult = {
          success: false,
          imported: 0,
          failed: 1,
          errors: [
            {
              error: error.response?.data?.error || "导入失败，请检查文件格式",
            },
          ],
        };
      } finally {
        this.importing = false;
      }
    },
    resetForm() {
      this.selectedFile = null;
      this.selectedImages = [];
      this.importResult = null;
      this.previewData = null;
      this.createdBy = "";
      this.checkDuplicates = true;
      this.skipDuplicates = false;
      this.duplicateThreshold = 0.85;
      this.previewMode = true;
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = "";
      }
      if (this.$refs.imageInput) {
        this.$refs.imageInput.value = "";
      }
    },
    isDuplicateQuestion(question) {
      if (!this.previewData || !this.previewData.duplicates) {
        return false;
      }
      return this.previewData.duplicates.some(dup => {
        // 比较题目文本判断是否为重复题目
        const normalizeText = (text) => {
          if (!text) return '';
          return text.replace(/\s+/g, '').toLowerCase();
        };
        return normalizeText(dup.question.questionText) === normalizeText(question.questionText);
      });
    },
    getDuplicateInfo(question) {
      if (!this.previewData || !this.previewData.duplicates) {
        return [];
      }
      const dup = this.previewData.duplicates.find(dup => {
        const normalizeText = (text) => {
          if (!text) return '';
          return text.replace(/\s+/g, '').toLowerCase();
        };
        return normalizeText(dup.question.questionText) === normalizeText(question.questionText);
      });
      return dup ? dup.duplicates : [];
    },
    processQuestionTextToHTML(text, originalLaTeX) {
      return processQuestionTextToHTML(text, originalLaTeX);
    },
    processAnswerTextToHTML(text) {
      return processAnswerTextToHTML(text);
    },
    formatQuestionText(text) {
      if (!text) return '';
      // 移除 HTML 标签，只显示纯文本预览
      let plainText = text
        .replace(/<image[^>]*>/gi, '[图片]')
        .replace(/<\/image>/gi, '')
        .replace(/<a[^>]*href=["']#fig:([^"']+)["'][^>]*>([^<]*)<\/a>/gi, '图$2')
        .replace(/<[^>]+>/g, '') // 移除所有其他 HTML 标签
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // 限制预览长度
      if (plainText.length > 200) {
        plainText = plainText.substring(0, 200) + '...';
      }
      
      return plainText;
    },
  },
};
</script>

<style scoped>
.latex-import-container {
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

.upload-area {
  margin-bottom: 2rem;
}

.upload-label {
  display: block;
  border: 2px dashed #ddd;
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: #f8f9fa;
}

.upload-label:hover {
  border-color: #667eea;
  background: #f0f4ff;
}

.upload-label.dragover {
  border-color: #667eea;
  background: #e8f0fe;
}

.upload-label.has-file {
  border-color: #28a745;
  background: #f0fff4;
}

.upload-content {
  pointer-events: none;
}

.import-options {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
}

.import-result {
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.cursor-pointer {
  cursor: pointer;
}

.alert {
  border-radius: 8px;
}

.alert-heading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.duplicate-item {
  border-left: 4px solid #ffc107;
}

.match-item {
  border-left: 3px solid #6c757d;
}

.question-preview {
  max-height: 150px;
  overflow-y: auto;
  font-size: 0.9rem;
  line-height: 1.5;
}

.cursor-pointer {
  cursor: pointer;
}
</style>

