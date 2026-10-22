<template>
  <div class="latex-export-container app-page">
    <div class="app-container container-xl">
      <div class="mb-2 latex-export-page-head">
        <nav aria-label="breadcrumb" class="mb-2 page-breadcrumb">
          <ol class="breadcrumb">
            <li class="breadcrumb-item">
              <router-link to="/question-list" class="text-decoration-none">
                <i class="bi bi-house"></i> 题目列表
              </router-link>
            </li>
            <li class="breadcrumb-item active" aria-current="page">导出 LaTeX 文件</li>
          </ol>
        </nav>
        <page-header
          title="导出 LaTeX 文件"
          subtitle="选择题目并导出为 LaTeX 格式的试卷文件"
          icon="bi-download"
          test-id="latex-export-header"
        >
          <template #actions>
            <router-link to="/question-list" class="btn btn-outline-secondary">
              <i class="bi bi-arrow-left"></i> 返回列表
            </router-link>
          </template>
        </page-header>
      </div>

      <div
        v-if="exportHeaderWarning"
        class="alert alert-warning mb-3"
        role="alert"
        data-testid="latex-export-header-warning"
      >
        {{ exportHeaderWarning }}
      </div>

      <div class="latex-io-export-grid">
        <!-- 题目选择区域 -->
        <div class="latex-io-export-main">
          <div class="card latex-io-card mb-4">
            <div class="card-header latex-io-panel-header">
              <h5 class="mb-0">
                <i class="bi bi-list-check"></i> 选择题目
              </h5>
              <p class="small text-muted mb-0 mt-1">从当前题库筛选并勾选要写入试卷的题目</p>
            </div>
            <div class="card-body">
              <!-- 搜索和筛选 -->
              <div class="row g-3 mb-3">
                <div class="col-md-4">
                  <label for="searchSubject" class="form-label">科目</label>
                  <subject-combobox
                    id="searchSubject"
                    v-model="filters.subject"
                    allow-empty
                    empty-label="全部科目"
                    test-id-prefix="latex-export-subject"
                    @update:modelValue="loadQuestions"
                  />
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
                    data-testid="latex-export-smart-select"
                    @click="showSmartSelectModal = true"
                    :disabled="questions.length === 0"
                  >
                    <i class="bi bi-magic"></i> 智能选择
                  </button>
                </div>
                <div
                  class="export-list-selection text-muted"
                  data-testid="latex-export-selection-summary"
                >
                  已选择 <strong>{{ selectedQuestions.length }}</strong> 道题目
                  <span v-if="selectedQuestions.length > 0" class="export-list-selection__score">
                    · 合计 <strong>{{ selectedTotalScore }}</strong> 分
                  </span>
                </div>
              </div>

              <!-- 题目列表 -->
              <div class="export-question-list">
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
                  class="export-question-row"
                  :class="{ 'export-question-row--selected': isSelected(question._id) }"
                  @click="toggleSelection(question._id)"
                >
                  <input
                    class="form-check-input export-question-row__check flex-shrink-0"
                    type="checkbox"
                    :checked="isSelected(question._id)"
                    :aria-label="'选择题目 ' + question._id"
                    @change="toggleSelection(question._id)"
                    @click.stop
                  />
                  <div class="export-question-row__body min-width-0">
                    <div class="d-flex flex-wrap align-items-center gap-1 mb-1">
                      <span class="badge badge-type-export">{{ question.type }}</span>
                      <span class="badge bg-secondary">{{ question.totalScore }} 分</span>
                      <span class="badge pill-muted">{{ question.subject }}</span>
                    </div>
                    <div
                      class="export-question-row__preview question-text-content small"
                      v-html="exportRowPreviewHtml(question)"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 导出配置区域 -->
        <div class="latex-io-export-sidebar">
          <div class="card latex-io-card export-config-card">
            <div class="card-header latex-io-panel-header">
              <h5 class="mb-0">
                <i class="bi bi-gear"></i> 导出配置
              </h5>
              <p class="small text-muted mb-0 mt-1">试卷头与下载选项</p>
            </div>
            <div class="card-body export-config-card__body export-config-compact">
              <div class="export-config-card__fields">
                <section class="export-config-section">
                  <h6 class="export-config-section__label">文件</h6>
                  <label for="filename" class="form-label form-label-sm mb-1">文件名（不含扩展名）</label>
                  <input
                    v-model="metadata.filename"
                    id="filename"
                    type="text"
                    class="form-control form-control-sm"
                    placeholder="mathexam-2025-01-01"
                    title="有图片时下载 .zip，否则 .tex"
                  />
                </section>

                <section class="export-config-section">
                  <h6 class="export-config-section__label">试卷信息</h6>
                  <div class="row g-2">
                    <div class="col-6">
                      <label for="university" class="form-label form-label-sm mb-1">学校</label>
                      <input
                        v-model="metadata.university"
                        id="university"
                        type="text"
                        class="form-control form-control-sm"
                        placeholder="西南大学"
                      />
                    </div>
                    <div class="col-6">
                      <label for="school" class="form-label form-label-sm mb-1">学院</label>
                      <input
                        v-model="metadata.school"
                        id="school"
                        type="text"
                        class="form-control form-control-sm"
                        placeholder="数学与统计学院"
                      />
                    </div>
                    <div class="col-12">
                      <label for="course" class="form-label form-label-sm mb-1">课程</label>
                      <input
                        v-model="metadata.course"
                        id="course"
                        type="text"
                        class="form-control form-control-sm"
                        placeholder="与题库科目一致，如解析几何"
                      />
                    </div>
                  </div>
                </section>

                <section class="export-config-section">
                  <h6 class="export-config-section__label">考试</h6>
                  <div class="row g-2">
                    <div class="col-6">
                      <label for="AorB" class="form-label form-label-sm mb-1">试卷类型</label>
                      <select v-model="metadata.AorB" id="AorB" class="form-select form-select-sm">
                        <option value="A">A 卷</option>
                        <option value="B">B 卷</option>
                      </select>
                    </div>
                    <div class="col-6">
                      <label for="openclose" class="form-label form-label-sm mb-1">开闭卷</label>
                      <select v-model="metadata.openclose" id="openclose" class="form-select form-select-sm">
                        <option value="闭卷">闭卷</option>
                        <option value="开卷">开卷</option>
                      </select>
                    </div>
                    <div class="col-6">
                      <label for="examDate" class="form-label form-label-sm mb-1">考试日期</label>
                      <input
                        v-model="metadata.examDate"
                        id="examDate"
                        type="date"
                        class="form-control form-control-sm"
                        data-testid="latex-export-exam-date"
                      />
                    </div>
                    <div class="col-6">
                      <label for="totaltime" class="form-label form-label-sm mb-1">时长（分钟）</label>
                      <input
                        v-model="metadata.totaltime"
                        id="totaltime"
                        type="number"
                        class="form-control form-control-sm"
                        placeholder="120"
                      />
                    </div>
                  </div>
                  <p class="export-config-hint small text-muted mb-0 mt-1">
                    <code>\examdate</code>；学年自 9/1 起算
                    <span v-if="exportSuggestedAcademicYear">→ {{ exportSuggestedAcademicYear }}</span>
                  </p>
                </section>

                <details
                  class="latex-io-advanced export-config-more"
                  data-testid="latex-export-more-options"
                >
                  <summary class="small fw-semibold text-secondary user-select-none">更多选项</summary>
                  <div class="mt-2">
                    <p class="small text-muted mb-2">
                      下载扩展名按是否含图片自动选 .tex 或 .zip。
                    </p>
                    <label class="form-label form-label-sm mb-1">学年覆盖（可选）</label>
                    <div class="row g-2">
                      <div class="col-6">
                        <input
                          v-model="metadata.academicYearStart"
                          type="number"
                          class="form-control form-control-sm"
                          placeholder="起始年"
                          min="1900"
                          max="2100"
                          aria-label="学年起始年"
                        />
                      </div>
                      <div class="col-6">
                        <input
                          v-model="metadata.academicYearEnd"
                          type="number"
                          class="form-control form-control-sm"
                          placeholder="结束年"
                          min="1900"
                          max="2100"
                          aria-label="学年结束年"
                        />
                      </div>
                    </div>
                    <p v-if="exportAcademicYearError" class="small text-danger mb-0 mt-1">{{ exportAcademicYearError }}</p>
                    <p v-else class="export-config-hint small text-muted mb-0 mt-1">
                      留空则按考试日期推算；填写则导出 <code>\academicyear</code>
                    </p>
                  </div>
                </details>

                <section class="export-config-section">
                  <h6 class="export-config-section__label">导出内容</h6>
                  <label for="exportMode" class="form-label form-label-sm mb-1">内容</label>
                  <select v-model="metadata.exportMode" id="exportMode" class="form-select form-select-sm">
                    <option value="exam">试卷卷（隐藏答案）</option>
                    <option value="answer">答案卷（showans）</option>
                    <option value="both">试卷 + 答案（两个 .tex）</option>
                  </select>
                  <p class="export-config-hint small text-muted mb-0 mt-1">ZIP 含 pin 版 mathexam.sty</p>

                  <div
                    v-if="metadata.exportMode === 'exam' || metadata.exportMode === 'both'"
                    class="mt-2"
                  >
                    <div class="form-check form-check-sm">
                      <input
                        id="includeAnswerSheet"
                        v-model="metadata.includeAnswerSheet"
                        class="form-check-input"
                        type="checkbox"
                      />
                      <label class="form-check-label small" for="includeAnswerSheet">
                        附加答题卡（<code>\answertable</code>）
                      </label>
                    </div>
                    <div v-if="metadata.includeAnswerSheet" class="mt-2 export-config-answer-sheet">
                      <div class="row g-2">
                        <div class="col-6">
                          <label for="answerSheetCols" class="form-label form-label-sm mb-1">每行格数</label>
                          <input
                            id="answerSheetCols"
                            v-model.number="metadata.answerSheetCols"
                            type="number"
                            min="3"
                            max="10"
                            class="form-control form-control-sm"
                          />
                        </div>
                        <div class="col-6">
                          <label for="answerSheetRowHeight" class="form-label form-label-sm mb-1">客观格高</label>
                          <input
                            id="answerSheetRowHeight"
                            v-model="metadata.answerSheetRowHeight"
                            class="form-control form-control-sm"
                            placeholder="1.2em"
                          />
                        </div>
                      </div>
                      <div class="form-check form-check-sm mt-2">
                        <input
                          id="includeSubjectiveAnswerAreas"
                          v-model="metadata.includeSubjectiveAnswerAreas"
                          class="form-check-input"
                          type="checkbox"
                        />
                        <label class="form-check-label small" for="includeSubjectiveAnswerAreas">解答题空白区</label>
                      </div>
                      <div v-if="metadata.includeSubjectiveAnswerAreas" class="mt-2">
                        <label for="answerSheetSubjectiveRowHeight" class="form-label form-label-sm mb-1">解答区行高</label>
                        <input
                          id="answerSheetSubjectiveRowHeight"
                          v-model="metadata.answerSheetSubjectiveRowHeight"
                          class="form-control form-control-sm"
                          placeholder="6em"
                        />
                      </div>
                    </div>
                  </div>
                </section>
                <details
                  class="latex-io-advanced export-config-preview"
                  data-testid="latex-export-structure-preview"
                >
                  <summary class="small fw-semibold text-secondary user-select-none">导出结构预览</summary>
                  <pre class="latex-io-preview-pre export-config-preview__pre mt-2">{{ exportStructurePreviewText }}</pre>
                </details>
              </div>

              <div class="export-config-card__footer latex-io-export-actions" data-testid="latex-export-action-bar">
                <div
                  v-if="exportStatusMessage"
                  class="alert py-2 small mb-2"
                  :class="exportStatusError ? 'alert-danger' : 'alert-success'"
                  role="status"
                  data-testid="latex-export-status"
                >
                  {{ exportStatusMessage }}
                </div>
                <div v-if="selectedQuestions.length === 0" class="alert alert-warning mb-3">
                  <small><i class="bi bi-exclamation-triangle"></i> 请至少选择一道题目</small>
                </div>
                <button
                  type="button"
                  class="btn btn-primary flex-grow-1"
                  @click="exportToLatex"
                  :disabled="selectedQuestions.length === 0 || exporting"
                  data-testid="latex-export-download-btn"
                >
                  <span v-if="exporting" class="spinner-border spinner-border-sm me-2"></span>
                  <i v-else class="bi bi-download"></i>
                  {{ exporting ? "导出中..." : "下载 LaTeX / ZIP" }}
                </button>
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
              <p class="text-muted mb-3 smart-select-help">
                在当前列表（当前题库及筛选条件，最多 {{ SMART_SELECT_CANDIDATE_LIMIT }} 道，不含回收站和已归档）中自动勾选题目。
                难度分数 = 难度系数（易 0.4 / 中 0.6 / 难 1.0）× 分值。可设置题目数量、目标总分或目标难度分数，以及题型分布；随机结果由种子决定，相同种子可复现。
                不考虑知识点覆盖、使用次数和 A/B 卷重复。应用后会替换已勾选的题目。
                需要按难度比例、知识点或 A/B 卷组卷，请使用
                <router-link to="/exam-wizard">组卷向导</router-link>。
              </p>

              <div
                v-if="smartSelectPoolCapWarning"
                class="alert alert-warning py-2 small mb-3"
                data-testid="smart-select-pool-cap-warning"
              >
                {{ smartSelectPoolCapWarning }}
              </div>

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
                  :max="smartSelectCandidates.length"
                  placeholder="请输入题目数量"
                />
                <small class="form-text text-muted">
                  候选池 {{ smartSelectCandidates.length }} 道（已排除已归档）
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
                  候选池平均难度分数: {{ averageDifficultyScore.toFixed(2) }}
                </small>
              </div>

              <div class="mb-3">
                <label for="targetTotalScore" class="form-label">目标总分（可选）</label>
                <input
                  v-model.number="smartSelectParams.targetTotalScore"
                  id="targetTotalScore"
                  type="number"
                  class="form-control"
                  min="0"
                  step="1"
                  placeholder="留空则不限制总分"
                />
              </div>

              <div class="mb-3">
                <label class="form-label">排序方式</label>
                <select v-model="smartSelectParams.sortOrder" class="form-select">
                  <option value="random">随机（推荐）</option>
                  <option value="asc">难度分数从低到高</option>
                  <option value="desc">难度分数从高到低</option>
                  <option value="type">按题型排序（仅影响本次勾选顺序）</option>
                </select>
              </div>

              <div class="mb-3">
                <label for="smartSelectSeed" class="form-label">随机种子</label>
                <div class="input-group">
                  <input
                    v-model="smartSelectParams.seed"
                    id="smartSelectSeed"
                    type="text"
                    class="form-control"
                    placeholder="留空则自动生成"
                    data-testid="smart-select-seed-input"
                  />
                  <button
                    type="button"
                    class="btn btn-outline-secondary"
                    data-testid="smart-select-reroll-seed"
                    @click="rollSmartSelectSeed"
                  >
                    换一组
                  </button>
                </div>
                <small v-if="smartSelectSeedUsed != null" class="form-text text-muted">
                  上次应用使用种子: {{ smartSelectSeedUsed }}
                </small>
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
                <div v-if="enableTypeDistribution" class="border rounded p-3 preview-surface smart-select-type-panel">
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

              <div
                v-if="smartSelectValidationErrors.length"
                class="alert alert-danger py-2 small"
                data-testid="smart-select-validation-errors"
              >
                <div v-for="(err, idx) in smartSelectValidationErrors" :key="idx">{{ err }}</div>
              </div>

              <div
                v-if="smartSelectPreview"
                class="smart-select-result border rounded p-3"
                data-testid="smart-select-result-summary"
              >
                <div class="fw-semibold mb-2">选择结果</div>
                <div class="small text-muted">
                  题数 {{ smartSelectPreview.count }} · 总分 {{ smartSelectPreview.totalScore }} ·
                  平均难度系数 {{ smartSelectPreview.averageDifficultyCoefficient.toFixed(2) }} ·
                  平均难度分 {{ smartSelectPreview.averageDifficultyScore.toFixed(2) }}
                </div>
                <div
                  v-if="Object.keys(smartSelectPreview.typeDistribution).length"
                  class="small mt-1"
                >
                  题型分布：
                  {{
                    Object.entries(smartSelectPreview.typeDistribution)
                      .map(([t, c]) => `${t} ${c}`)
                      .join('，')
                  }}
                </div>
                <ul
                  v-if="smartSelectPreview.messages.length"
                  class="small mb-0 mt-2 smart-select-result-messages"
                >
                  <li v-for="(msg, idx) in smartSelectPreview.messages" :key="idx">{{ msg }}</li>
                </ul>
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
import { mathjaxOptions } from "../utils/mathjaxConfig";
import {
  processQuestionText,
  processAnswerText,
  processQuestionTextToHTML,
  processQuestionListPreviewToHTML,
  buildFigureRefDisplayMap,
} from "../utils/latexProcessor";
import { shouldUseChoiceOptionLabels } from "../utils/choiceOptions";
import { answerForDisplay } from "../utils/questionAnswerDisplay";
import {
  normalizeAcademicYearOverride,
  suggestedAcademicYearLabel,
  localIsoDateString,
} from "../utils/latexExamDateForm";
import PageHeader from "./ui/PageHeader.vue";
import SubjectCombobox from "./ui/SubjectCombobox.vue";
import {
  QUESTION_TYPES,
  QUESTION_TYPE_ORDER,
  SMART_SELECT_CANDIDATE_LIMIT,
} from "../constants/questionTypes.js";
import { getDifficultyScore } from "../utils/difficultyScore.js";
import {
  filterExamPoolCandidates,
  runSmartSelect,
} from "../utils/smartSelect.js";

export default {
  name: "LatexExport",
  components: { PageHeader, SubjectCombobox },
  data() {
    return {
      SMART_SELECT_CANDIDATE_LIMIT,
      questions: [],
      selectedQuestionIds: [],
      loading: false,
      exporting: false,
      previewMode: false, // 预览模式开关
      showSmartSelectModal: false, // 智能选择模态框
      smartSelectMode: 'count', // 'count' 或 'difficulty'
      enableTypeDistribution: false, // 是否启用题型分布
      questionTypes: [...QUESTION_TYPES],
      typeOrder: [...QUESTION_TYPE_ORDER],
      typeDistribution: {}, // 题型分布：{ '单选题': 5, '填空题': 3, ... }
      questionsListTotal: null,
      smartSelectParams: {
        targetCount: 10,
        targetDifficulty: 50,
        targetTotalScore: '',
        sortOrder: 'random',
        seed: '',
      },
      smartSelectSeedUsed: null,
      smartSelectPreview: null,
      smartSelectValidationErrors: [],
      mathjaxOptions: mathjaxOptions,
      filters: {
        subject: "",
        type: "",
        keyword: "",
      },
      metadata: {
        filename: `mathexam-${new Date().toISOString().split("T")[0]}`,
        university: "西南大学",
        school: "数学与统计学院",
        course: "",
        AorB: "A",
        examDate: localIsoDateString(),
        academicYearStart: "",
        academicYearEnd: "",
        totaltime: "120",
        openclose: "闭卷",
        degree: "本科",
        major: "数学与应用数学",
        grade: "",
        examiner: "",
        director: "",
        dean: "",
        exportMode: "exam",
        includeAnswerSheet: false,
        answerSheetCols: 5,
        answerSheetRowHeight: '1.2em',
        includeSubjectiveAnswerAreas: true,
        answerSheetSubjectiveRowHeight: '6em',
        packageOptions: ["nospace"],
      },
      exportStatusMessage: '',
      exportStatusError: false,
    };
  },
  computed: {
    exportSuggestedAcademicYear() {
      return suggestedAcademicYearLabel(this.metadata.examDate);
    },
    exportAcademicYearError() {
      return normalizeAcademicYearOverride(
        this.metadata.academicYearStart,
        this.metadata.academicYearEnd,
      ).error;
    },
    exportHeaderWarning() {
      const missing = [];
      if (!String(this.metadata.course || '').trim()) missing.push('课程');
      if (!String(this.metadata.university || '').trim()) missing.push('学校');
      if (!String(this.metadata.school || '').trim()) missing.push('学院');
      if (!missing.length) return '';
      return `试卷头未完整设置（缺：${missing.join('、')}）。请在右侧填写或在题库「试卷头」中保存默认值，否则导出 PDF 标题可能不正确。`;
    },
    selectedQuestions() {
      // 防御性检查：确保 questions 是数组
      if (!Array.isArray(this.questions)) {
        return [];
      }
      return this.questions.filter((q) => this.selectedQuestionIds.includes(q._id));
    },
    selectedTotalScore() {
      return this.selectedQuestions.reduce((sum, q) => sum + (Number(q.totalScore) || 0), 0);
    },
    filteredQuestions() {
      return Array.isArray(this.questions) ? this.questions : [];
    },
    smartSelectCandidates() {
      return filterExamPoolCandidates(this.filteredQuestions);
    },
    smartSelectPoolCapWarning() {
      const total = this.questionsListTotal;
      if (total == null || total <= SMART_SELECT_CANDIDATE_LIMIT) {
        return '';
      }
      return `当前列表共 ${total} 道，仅前 ${SMART_SELECT_CANDIDATE_LIMIT} 道参与智能选择，请缩小筛选范围`;
    },
    averageDifficultyScore() {
      if (this.smartSelectCandidates.length === 0) return 0;
      const total = this.smartSelectCandidates.reduce(
        (sum, q) => sum + getDifficultyScore(q),
        0,
      );
      return total / this.smartSelectCandidates.length;
    },
    exportModeLabel() {
      const map = {
        exam: '试卷卷（隐藏答案）',
        answer: '答案卷',
        both: '试卷 + 答案',
      };
      return map[this.metadata.exportMode] || this.metadata.exportMode;
    },
    exportStructurePreviewText() {
      const m = this.metadata;
      const fname = String(m.filename || 'mathexam').trim() || 'mathexam';
      const lines = [
        `% ${fname}.tex / .zip`,
        `\\university{${String(m.university || '…').trim() || '…'}}`,
        `\\school{${String(m.school || '…').trim() || '…'}}`,
        `\\course{${String(m.course || '…').trim() || '…'}}`,
        `\\examdate{${String(m.examDate || '…')}} · ${m.AorB || 'A'} 卷 · ${m.openclose || '闭卷'}`,
        `\\totaltime{${String(m.totaltime || '120')}} 分钟`,
        '',
        `% 导出内容：${this.exportModeLabel}`,
      ];
      if (m.includeAnswerSheet && (m.exportMode === 'exam' || m.exportMode === 'both')) {
        lines.push('% + 答题卡 (\\answertable)');
      }
      const selected = this.selectedQuestions;
      if (!selected.length) {
        lines.push('% （尚未选择题目）');
        return lines.join('\n');
      }
      lines.push(`% 共 ${selected.length} 题，合计 ${this.selectedTotalScore} 分`);
      const byType = {};
      for (const q of selected) {
        const t = q.type || '未知题型';
        byType[t] = (byType[t] || 0) + 1;
      }
      const order = this.typeOrder || [];
      const types = [
        ...order.filter((t) => byType[t]),
        ...Object.keys(byType).filter((t) => !order.includes(t)).sort(),
      ];
      for (const t of types) {
        lines.push(`%   · ${t} × ${byType[t]}`);
      }
      return lines.join('\n');
    },
  },
  watch: {
    showSmartSelectModal(open) {
      if (open) {
        this.smartSelectValidationErrors = [];
        this.smartSelectPreview = null;
        if (this.smartSelectParams.seed === '' || this.smartSelectParams.seed == null) {
          this.rollSmartSelectSeed();
        }
      }
    },
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
    this.loadQuestions();
    this.loadBankLatexMetadata();
    this.loadMathJax();
    this.loadPDFJS();
  },
  updated() {
    // 组件更新后重新渲染 MathJax 和 PDF
    this.$nextTick(() => {
      setTimeout(() => {
        this.renderMathJax();
        const hasRenderingPDFs = document.querySelectorAll('.pdf-canvas[data-rendering="true"]').length > 0;
        if (!hasRenderingPDFs) {
          this.renderPDFs();
        }
      }, 100);
    });
  },
  methods: {
    // 导入处理函数
    processQuestionText,
    processAnswerText,
    processQuestionTextToHTML,
    processQuestionListPreviewToHTML,
    answerForDisplay,
    exportRowPreviewHtml(question) {
      return this.processQuestionListPreviewToHTML(
        question.questionText,
        question.originalLaTeX,
        this.questionPreviewOpts(question),
      );
    },
    questionPreviewOpts(question) {
      const opts = question?.options;
      const hasOptions = opts && typeof opts === 'object' && Object.keys(opts).length > 0;
      return {
        hasOptions,
        mode: 'question',
        questionType: question?.type || '',
        images: question?.images,
        figureRefDisplayByKey: buildFigureRefDisplayMap(question?.images),
        choiceOptionLabels: shouldUseChoiceOptionLabels({
          questionType: question?.type,
          hasOptions,
          questionText: question?.questionText,
          originalLaTeX: question?.originalLaTeX,
        }),
      };
    },
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
          
          window.pdfjsLib.getDocument({ url: pdfUrl, withCredentials: true }).promise
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
    applyLatexMetadataDefaults(defaults) {
      if (!defaults || typeof defaults !== 'object') return;
      const map = {
        university: 'university',
        school: 'school',
        course: 'course',
        AorB: 'AorB',
        examDate: 'examDate',
        academicYearStart: 'academicYearStart',
        academicYearEnd: 'academicYearEnd',
        finalmiddle: 'finalmiddle',
        totaltime: 'totaltime',
        openclose: 'openclose',
        degree: 'degree',
        major: 'major',
        grade: 'grade',
        examiner: 'examiner',
        director: 'director',
        dean: 'dean',
        exportMode: 'exportMode',
      };
      Object.entries(map).forEach(([from, to]) => {
        if (defaults[from]) {
          this.metadata[to] = defaults[from];
        }
      });
      if (!this.metadata.examDate) {
        this.metadata.examDate = localIsoDateString();
      }
      if (defaults.packageOptions?.length) {
        this.metadata.packageOptions = defaults.packageOptions;
      }
    },
    async loadBankLatexMetadata() {
      const bankId = localStorage.getItem('currentBankId');
      if (!bankId) return;
      try {
        const { data } = await axios.get(`/banks/${bankId}/latex-metadata`);
        this.applyLatexMetadataDefaults(data.latexExamMetadata);
        const cached = sessionStorage.getItem('latexExportDefaults');
        if (cached) {
          this.applyLatexMetadataDefaults(JSON.parse(cached));
        }
      } catch (e) {
        console.warn('加载题库试卷头失败', e);
      }
    },
    async loadQuestions() {
      this.loading = true;
      try {
        const params = {};
        if (this.filters.subject) params.subject = this.filters.subject;
        if (this.filters.type) params.questionType = this.filters.type;
        if (this.filters.keyword) params.q = this.filters.keyword;
        params.limit = SMART_SELECT_CANDIDATE_LIMIT;
        params.offset = 0;

        const response = await axios.get("/questions/list", { params });
        const data = response.data;
        if (Array.isArray(data)) {
          this.questions = data;
          this.questionsListTotal = null;
        } else {
          this.questions = data.questions || [];
          this.questionsListTotal = data.total ?? null;
        }
      } catch (error) {
        console.error("加载题目失败:", error);
        alert("加载题目失败");
        // 出错时确保 questions 是空数组
        this.questions = [];
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
      if (!Array.isArray(this.questions)) {
        this.selectedQuestionIds = [];
        return;
      }
      this.selectedQuestionIds = this.questions.map((q) => q._id);
    },
    deselectAll() {
      this.selectedQuestionIds = [];
    },
    getDifficultyScore,
    getAvailableCountByType(type) {
      return this.smartSelectCandidates.filter((q) => q.type === type).length;
    },
    rollSmartSelectSeed() {
      this.smartSelectParams.seed = String(Date.now() % 1000000000);
    },
    buildSmartSelectSettings() {
      return {
        mode: this.smartSelectMode,
        targetCount: this.smartSelectParams.targetCount,
        targetDifficulty: this.smartSelectParams.targetDifficulty,
        targetTotalScore: this.smartSelectParams.targetTotalScore,
        sortOrder: this.smartSelectParams.sortOrder,
        seed: this.smartSelectParams.seed,
        enableTypeDistribution: this.enableTypeDistribution,
        typeDistribution: { ...this.typeDistribution },
        questionTypes: this.questionTypes,
        typeOrder: this.typeOrder,
      };
    },
    // 自动分配题型分布
    autoFillTypeDistribution() {
      const total = Number(this.smartSelectParams.targetCount);
      if (!Number.isFinite(total) || total <= 0) {
        this.smartSelectValidationErrors = ['请先填写有效的题目数量'];
        return;
      }
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
    applySmartSelect() {
      const result = runSmartSelect(
        this.filteredQuestions,
        this.buildSmartSelectSettings(),
      );
      this.smartSelectValidationErrors = result.errors;
      if (!result.ok) {
        this.smartSelectPreview = null;
        return;
      }

      const replaceCount = this.selectedQuestionIds.length;
      if (replaceCount > 0) {
        const ok = window.confirm(`替换当前已选的 ${replaceCount} 道题？`);
        if (!ok) return;
      }

      this.smartSelectSeedUsed = result.seedUsed;
      this.smartSelectParams.seed = String(result.seedUsed);
      this.smartSelectPreview = result.summary;
      this.selectedQuestionIds = [...result.selectedIds];
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
      const yearNorm = normalizeAcademicYearOverride(
        this.metadata.academicYearStart,
        this.metadata.academicYearEnd,
      );
      if (yearNorm.error) {
        this.exportStatusError = true;
        this.exportStatusMessage = yearNorm.error;
        return;
      }
      this.metadata.academicYearStart = yearNorm.academicYearStart;
      this.metadata.academicYearEnd = yearNorm.academicYearEnd;

      this.exporting = true;
      this.exportStatusMessage = '';
      this.exportStatusError = false;

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
        
        filename = filename.replace(/\.tex$/, '').replace(/\.zip$/, '') + '.zip';

        // 创建下载链接
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        this.exportStatusError = false;
        this.exportStatusMessage = `已下载 ${filename}，ZIP 内含 mathexam.sty 与试卷 .tex。`;
      } catch (error) {
        console.error("导出失败:", error);
        this.exportStatusError = true;
        this.exportStatusMessage = error.response?.data?.error || '导出失败，请稍后重试';
      } finally {
        this.exporting = false;
      }
    },
  },
};
</script>

<style scoped>
.latex-export-container {
  padding: 1rem 0 1.25rem;
}

@media (min-width: 992px) {
  .latex-export-page-head :deep(.page-header) {
    padding: 1rem 1.25rem;
  }

  .latex-export-page-head :deep(.page-header .page-subtitle) {
    margin-bottom: 0;
  }
}

.page-header {
  background: var(--surface-card);
  padding: 1.5rem 2rem;
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-subtle);
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
  color: var(--text-primary);
  font-weight: 700;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.export-question-list {
  max-height: min(520px, 55vh);
  overflow-y: auto;
  overflow-x: hidden;
  border: 1px solid var(--border-subtle, #e2e8f0);
  border-radius: var(--radius-md, 10px);
  background: var(--surface-bg, #f8fafc);
}

.export-question-row {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid var(--border-subtle, #e2e8f0);
  cursor: pointer;
  background: var(--surface-card);
  transition: background 0.15s ease;
}

.export-question-row:last-child {
  border-bottom: none;
}

.export-question-row:hover {
  background: var(--color-primary-soft, #eff6ff);
}

.smart-select-type-panel,
.smart-select-result {
  background: var(--surface-muted, var(--surface-bg, #f8fafc));
  border-color: var(--border-subtle, #e2e8f0) !important;
}

.smart-select-result-messages {
  color: var(--text-secondary, #64748b);
}

.smart-select-help a {
  text-decoration: underline;
}

.export-question-row--selected {
  background: rgba(37, 99, 235, 0.08);
  box-shadow: inset 3px 0 0 var(--color-primary, #2563eb);
}

.badge-type-export {
  background: var(--color-primary-soft, #eff6ff);
  color: var(--color-primary, #2563eb);
  font-weight: 600;
}

.export-question-row__preview {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.45;
  max-height: 4.35rem;
  color: var(--text-primary, #0f172a);
  word-break: break-word;
}

.export-question-row__mono {
  max-width: 100%;
}

.export-list-selection__score {
  color: var(--text-secondary, #475569);
  font-weight: 500;
}

.export-config-card__body {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.export-config-card__fields {
  flex: 1 1 auto;
  min-width: 0;
}

.export-config-card__footer {
  flex-shrink: 0;
  margin-top: 0.5rem;
  padding-top: 0.65rem;
  border-top: 1px solid var(--border-subtle, #e2e8f0);
}

.question-item {
  cursor: pointer;
  transition: all 0.2s;
  background: var(--surface-card);
}

.question-item:hover {
  background: var(--surface-muted);
  border-color: var(--color-primary, #2563eb) !important;
}

.question-item.selected {
  background: #e8f0fe;
  border-color: var(--color-primary, #2563eb) !important;
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

.option-item {
  margin-bottom: 0.25rem;
}

.question-answer {
  border-left-color: var(--color-primary, #2563eb);
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #e9ecef;
}
</style>

