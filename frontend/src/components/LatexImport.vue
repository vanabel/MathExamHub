<template>
  <div class="latex-import-container app-page">
    <div class="app-container container-xl">
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
              <div v-if="formError" class="alert alert-danger" role="alert" data-testid="latex-import-form-error">
                {{ formError }}
              </div>
              <div v-if="previewError" class="alert alert-danger" role="alert" data-testid="latex-import-preview-error">
                {{ previewError }}
              </div>
              <!-- 文件上传区域 -->
              <div class="upload-area mb-4">
                <input
                  ref="fileInput"
                  type="file"
                  accept=".tex,.zip"
                  multiple
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
                  :class="{ 'dragover': isDragging, 'has-file': selectedTexFiles.length }"
                  @dragover.prevent="isDragging = true"
                  @dragleave.prevent="isDragging = false"
                  @drop.prevent="handleDrop"
                >
                  <div class="upload-content">
                    <i class="bi bi-cloud-upload display-4 text-primary mb-3"></i>
                    <h5 v-if="!selectedTexFiles.length">点击选择文件或拖拽文件到此处</h5>
                    <h5 v-else class="text-success">
                      <i class="bi bi-check-circle"></i>
                      {{ selectedTexFiles.length === 1 ? selectedTexFiles[0].name : `已选 ${selectedTexFiles.length} 个文件` }}
                    </h5>
                    <p class="text-muted mb-0">支持 .tex / .zip（可多选，含 \\input 子文件），最大 20MB</p>
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
                    <div class="form-check mt-2">
                      <input id="llmPreview" v-model="useLlmPreview" class="form-check-input" type="checkbox" />
                      <label class="form-check-label" for="llmPreview">
                        预览 LLM 建议的难度与知识点（需在平台管理开启）
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
                  :disabled="!selectedTexFiles.length || previewing || importing"
                >
                  <span v-if="previewing" class="spinner-border spinner-border-sm me-2"></span>
                  <i v-else class="bi bi-eye"></i>
                  {{ previewing ? '预览中...' : '预览题目' }}
                </button>
                <button
                  type="button"
                  class="btn btn-primary"
                  @click="importFile"
                  :disabled="!selectedTexFiles.length || importing || previewing"
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
                  :disabled="importing || !(previewData?.partialImportAllowed || previewData?.success)"
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
              <div
                v-if="previewData && useLlmPreview && previewData.llmPreviewTruncated"
                class="alert alert-warning mt-3 mb-0"
              >
                仅对前 {{ previewData.llmPreviewProcessed ?? '?' }} / {{ previewQuestions.length }} 题请求 LLM（上限
                {{ previewData.llmPreviewCap ?? 20 }} 题）；其余题目请手动填写或导入后再编辑。
              </div>
              <div v-if="previewData && useLlmPreview && llmEdits.length" class="alert alert-info mt-3">
                <strong>LLM 建议</strong>（确认导入前可修改）
                <div class="table-responsive mt-2">
                  <table class="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>难度</th>
                        <th>知识点</th>
                        <th>来源</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, idx) in llmEdits" :key="idx">
                        <td>{{ idx + 1 }}</td>
                        <td>
                          <select v-model="row.difficulty" class="form-select form-select-sm">
                            <option value="易">易</option>
                            <option value="中">中</option>
                            <option value="难">难</option>
                          </select>
                        </td>
                        <td>
                          <select v-model="row.knowledgePointId" class="form-select form-select-sm">
                            <option value="">（无）</option>
                            <option v-for="kp in previewKnowledgePoints" :key="kp._id" :value="kp._id">
                              {{ kp.path }}
                            </option>
                          </select>
                        </td>
                        <td class="small text-muted">{{ row.source || '—' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

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
                    <div
                      v-for="(w, wi) in (previewData.warnings || []).filter(x => x.code === 'ZERO_QUESTIONS' || x.code === 'MISSING_INPUT')"
                      :key="'w-' + wi"
                      class="alert alert-warning mb-3"
                    >
                      {{ w.message }}
                    </div>
                    <div
                      v-if="previewData.partSections && previewData.partSections.some(s => !s.recognized || s.invalidCount)"
                      class="alert alert-warning mb-3"
                    >
                      <strong>部分题型需确认</strong>
                      <div
                        v-for="sec in previewData.partSections.filter(s => !s.recognized || s.invalidCount)"
                        :key="sec.partTitle"
                        class="d-flex flex-wrap align-items-center gap-2 mt-2"
                      >
                        <span class="small">{{ sec.partTitle }}（{{ sec.questionIndices.length }} 题）</span>
                        <select
                          v-model="partTypeOverrides[sec.partTitle]"
                          class="form-select form-select-sm"
                          style="width: 10rem"
                          @change="previewFile"
                        >
                          <option value="判断题">判断题</option>
                          <option value="单选题">单选题</option>
                          <option value="多选题">多选题</option>
                          <option value="填空题">填空题</option>
                          <option value="解答题">解答题</option>
                          <option value="计算题">计算题</option>
                          <option value="证明题">证明题</option>
                          <option value="简答题">简答题</option>
                          <option value="作图题">作图题</option>
                        </select>
                      </div>
                      <p class="small mb-0 mt-2">修改题型后请重新预览；确认导入时将跳过仍无法识别的题目。</p>
                    </div>
                    <div v-if="previewData.errors && previewData.errors.length" class="alert alert-danger mb-3">
                      <strong>{{ previewData.errors.length }} 道题无法导入</strong>
                      <ul class="small mb-0 mt-1">
                        <li v-for="(err, ei) in previewData.errors.slice(0, 8)" :key="ei">{{ err.message }}</li>
                      </ul>
                    </div>
                    <div class="alert alert-info mb-3">
                      <strong>共识别到 {{ previewQuestions.length }} 道可导入题目</strong>
                      <span v-if="previewData.summary && previewData.summary.total > previewQuestions.length" class="ms-1 text-muted small">
                        （共解析 {{ previewData.summary.total }}，跳过 {{ previewData.summary.total - previewQuestions.length }}）
                      </span>
                      <span v-if="previewData.exportDefaults?.course" class="ms-2 text-muted small">
                        导出默认：{{ previewData.exportDefaults.course }}
                        <span v-if="previewData.exportDefaults.university"> · {{ previewData.exportDefaults.university }}</span>
                      </span>
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
                        <div v-if="previewMode" class="question-preview-content mathexam-preview">
                          <div 
                            v-html="processQuestionTextToHTML(question.questionText, question.originalLaTeX, questionPreviewOpts(question))"
                            class="question-text-content mb-2 mathexam-question-body"
                          ></div>
                          <!-- 选项（如果是选择题） -->
                          <div v-if="question.options && Object.keys(question.options).length > 0 && !hasAbcdInOriginal(question)" class="question-options mb-2">
                            <ChoiceOptionsList :options="question.options" class="small">
                              <template #default="{ entry }">
                                <vue-mathjax :formula="entry.text" :options="mathjaxOptions"></vue-mathjax>
                              </template>
                            </ChoiceOptionsList>
                          </div>
                          <!-- 答案 -->
                          <div class="question-answer mb-0" v-if="showAnswerBlock(question)">
                            <strong>答案：</strong>
                            <div v-html="processAnswerTextToHTML(answerForDisplay(question))"></div>
                          </div>
                          <div v-if="showSolutionBlock(question)" class="question-solution mb-0 mt-2">
                            <strong>解答：</strong>
                            <div v-html="processAnswerTextToHTML(question.solution)"></div>
                          </div>
                        </div>
                        <!-- 文本模式 -->
                        <div v-else class="text-mode">
                          <div class="mb-2">
                            <strong>题目：</strong>
                            <pre class="small mb-0 bg-light p-2 rounded">{{ question.originalLaTeX || question.questionText }}</pre>
                          </div>
                          <div v-if="showAnswerBlock(question)" class="mb-2">
                            <strong>答案：</strong>
                            <pre class="small mb-0 bg-light p-2 rounded">{{ answerForDisplay(question) }}</pre>
                          </div>
                          <div v-if="showSolutionBlock(question)" class="mb-2">
                            <strong>解答：</strong>
                            <pre class="small mb-0 bg-light p-2 rounded">{{ question.solution }}</pre>
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
                  <div v-if="importResult.success" class="d-flex flex-wrap gap-2">
                    <router-link
                      to="/question-list"
                      class="btn btn-sm btn-primary"
                      data-testid="latex-import-success-link"
                    >
                      查看题目列表
                    </router-link>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-primary"
                      data-testid="latex-import-generate-blueprint"
                      :disabled="blueprintFromImportLoading"
                      @click="generateBlueprintFromImport"
                    >
                      {{ blueprintFromImportLoading ? '生成中…' : '从导入试卷生成蓝图' }}
                    </button>
                    <router-link
                      v-if="generatedBlueprintId"
                      :to="{ name: 'exam-wizard', query: { blueprintId: generatedBlueprintId } }"
                      class="btn btn-sm btn-success"
                      data-testid="latex-import-open-wizard"
                    >
                      打开组卷向导
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
import ChoiceOptionsList from "./ChoiceOptionsList.vue";
import { shouldUseChoiceOptionLabels } from "../utils/choiceOptions";
import { answerForDisplay, showAnswerBlock, showSolutionBlock } from "../utils/questionAnswerDisplay";

const MAX_IMPORT_FILE_BYTES = 20 * 1024 * 1024;

export default {
  name: "LatexImport",
  components: {
    "vue-mathjax": VueMathjaxNext,
    ChoiceOptionsList,
  },
  data() {
    return {
      selectedTexFiles: [],
      partTypeOverrides: {},
      selectedImages: [],
      isDragging: false,
      importing: false,
      previewing: false,
      createdBy: "",
      importResult: null,
      previewData: null,
      previewMode: true, // true = 预览模式, false = 文本模式
      useLlmPreview: false,
      llmEdits: [],
      previewKnowledgePoints: [],
      checkDuplicates: true,
      skipDuplicates: false,
      duplicateThreshold: 0.85,
      mathjaxOptions: mathjaxOptions,
      formError: '',
      previewError: '',
      blueprintFromImportLoading: false,
      generatedBlueprintId: '',
    };
  },
  updated() {
    if (this.previewData && this.previewMode && !this.importResult) {
      this.$nextTick(() => {
        setTimeout(() => this.typesetPreview(), 80);
      });
    }
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
    showAnswerBlock,
    showSolutionBlock,
    answerForDisplay,
    questionPreviewOpts(question) {
      const opts = question?.options;
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
    typesetPreview() {
      if (window.MathJax && window.MathJax.Hub) {
        const previewRoot = this.$el.querySelector('.preview-area');
        if (previewRoot) {
          window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub, previewRoot]);
        }
      }
    },
    appendTexFilesToFormData(formData) {
      for (const f of this.selectedTexFiles) {
        formData.append('file', f);
      }
      if (Object.keys(this.partTypeOverrides).length) {
        formData.append('partTypeOverrides', JSON.stringify(this.partTypeOverrides));
      }
    },
    validateTexFiles(files) {
      const texOrZip = files.filter((f) => /\.(tex|zip)$/i.test(f.name));
      if (!texOrZip.length) {
        return { ok: false, message: '请选择 .tex 或 .zip 文件' };
      }
      const tooLarge = texOrZip.find((f) => f.size > MAX_IMPORT_FILE_BYTES);
      if (tooLarge) {
        return { ok: false, message: `「${tooLarge.name}」超过 20MB 上限，请拆分或压缩后重试` };
      }
      return { ok: true, files: texOrZip };
    },
    handleFileSelect(event) {
      const files = Array.from(event.target.files || []);
      const check = this.validateTexFiles(files);
      if (!check.ok) {
        this.formError = check.message;
        return;
      }
      this.formError = '';
      this.previewError = '';
      this.selectedTexFiles = check.files;
      this.isDragging = false;
    },
    handleDrop(event) {
      this.isDragging = false;
      const files = Array.from(event.dataTransfer.files);
      const texFiles = files.filter((f) => /\.(tex|zip)$/i.test(f.name));
      const imageFiles = files.filter(f => 
        f.name.match(/\.(png|jpg|jpeg|gif|pdf)$/i)
      );
      
      if (texFiles.length) {
        const check = this.validateTexFiles(texFiles);
        if (!check.ok) {
          this.formError = check.message;
          return;
        }
        this.formError = '';
        this.selectedTexFiles = check.files;
        const dataTransfer = new DataTransfer();
        texFiles.forEach((f) => dataTransfer.items.add(f));
        this.$refs.fileInput.files = dataTransfer.files;
      }
      
      if (imageFiles.length > 0) {
        this.selectedImages = [...this.selectedImages, ...imageFiles];
        const dataTransfer = new DataTransfer();
        this.selectedImages.forEach(img => dataTransfer.items.add(img));
        this.$refs.imageInput.files = dataTransfer.files;
      }
      
      if (!texFiles.length && imageFiles.length === 0) {
        this.formError = '请选择 .tex / .zip 文件或图片文件';
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
      if (!this.selectedTexFiles.length) {
        this.formError = '请先选择文件';
        return;
      }

      this.previewing = true;
      this.previewData = null;
      this.importResult = null;
      this.previewError = '';
      this.formError = '';

      const formData = new FormData();
      this.appendTexFilesToFormData(formData);
      // 添加图片文件
      this.selectedImages.forEach((img) => {
        formData.append("images", img);
      });
      formData.append("checkDuplicates", this.checkDuplicates ? "true" : "false");
      formData.append("duplicateThreshold", this.duplicateThreshold.toString());
      formData.append("llmPreview", this.useLlmPreview ? "true" : "false");

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
        this.partTypeOverrides = {};
        (data.partSections || []).forEach((sec) => {
          if (!sec.recognized || sec.invalidCount > 0) {
            this.partTypeOverrides[sec.partTitle] = sec.mappedType || '解答题';
          }
        });
        this.previewKnowledgePoints = data.knowledgePoints || [];
        const suggestions = data.llmSuggestions || [];
        this.llmEdits = (data.questions || []).map((q, i) => {
          const s = suggestions[i];
          return {
            difficulty: (s && s.difficulty) || q.difficulty || '中',
            knowledgePointId: (s && s.knowledgePointIds && s.knowledgePointIds[0]) || '',
            source: s && s.source,
          };
        });
        if (data.exportDefaults) {
          sessionStorage.setItem('latexExportDefaults', JSON.stringify(data.exportDefaults));
        }
        this.$nextTick(() => this.typesetPreview());
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
        this.previewError = error.response?.data?.error || '预览失败，请检查文件格式与大小（.tex / .zip，≤20MB）';
      } finally {
        this.previewing = false;
      }
    },
    async confirmImport() {
      if (!this.previewData || !this.selectedTexFiles.length) {
        alert('请先预览文件');
        return;
      }
      if (!this.previewData.partialImportAllowed && this.previewData.summary?.valid === 0) {
        alert('没有可导入的有效题目');
        return;
      }

      this.importing = true;
      this.importResult = null;

      const formData = new FormData();
      this.appendTexFilesToFormData(formData);
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
      if (this.useLlmPreview && this.llmEdits?.length) {
        const overrides = this.llmEdits.map((row) => ({
          difficulty: row.difficulty,
          knowledgePointIds: row.knowledgePointId ? [row.knowledgePointId] : [],
        }));
        formData.append("metadataOverrides", JSON.stringify(overrides));
      }

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
      if (!this.selectedTexFiles.length) {
        alert('请先选择文件');
        return;
      }

      this.importing = true;
      this.importResult = null;

      const formData = new FormData();
      this.appendTexFilesToFormData(formData);
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
    async generateBlueprintFromImport() {
      this.blueprintFromImportLoading = true;
      try {
        const { data } = await axios.post('/exam-blueprints/from-imported-paper', {
          title: '从导入试卷生成',
        });
        this.generatedBlueprintId = data._id;
      } catch (error) {
        alert(error.response?.data?.error || '生成蓝图失败');
      } finally {
        this.blueprintFromImportLoading = false;
      }
    },
    resetForm() {
      this.selectedTexFiles = [];
      this.partTypeOverrides = {};
      this.selectedImages = [];
      this.importResult = null;
      this.generatedBlueprintId = '';
      this.previewData = null;
      this.useLlmPreview = false;
      this.llmEdits = [];
      this.previewKnowledgePoints = [];
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
    hasAbcdInOriginal(question) {
      return question.originalLaTeX && question.originalLaTeX.includes('\\begin{abcd}');
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
  color: var(--color-primary, #2563eb);
  transition: color 0.2s;
}

.breadcrumb-item a:hover {
  color: var(--color-primary-hover, #1d4ed8);
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
  border-color: var(--color-primary, #2563eb);
  background: #f0f4ff;
}

.upload-label.dragover {
  border-color: var(--color-primary, #2563eb);
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

.mathexam-preview {
  font-size: 1rem;
  line-height: 1.65;
}

.mathexam-preview :deep(.mathexam-abcd) {
  margin: 0.75rem 0 0.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 0.35rem 1rem;
}

.mathexam-preview :deep(.mathexam-abcd-item) {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
}

.mathexam-preview :deep(.mathexam-abcd-label) {
  font-weight: 600;
  flex-shrink: 0;
}

.mathexam-preview :deep(.mathexam-judgment) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5em;
  margin-left: 0.25rem;
  font-weight: 700;
}

.mathexam-preview :deep(.score-fill) {
  vertical-align: baseline;
}

.preview-area .question-text-content {
  padding: 0.75rem 1rem;
  background: #fafbff;
  border-radius: 8px;
  border: 1px solid #e8ecf4;
}
</style>

