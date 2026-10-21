<template>
  <div
    v-if="visible"
    class="card border-primary-subtle shadow-sm mb-4 mathexam-import-guide"
    data-testid="mathexam-import-guide"
  >
    <div class="card-header bg-primary-subtle py-2 d-flex align-items-center justify-content-between gap-2">
      <button
        type="button"
        class="btn btn-link btn-sm text-start text-decoration-none flex-grow-1 p-0 mathexam-import-guide__toggle"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >
        <i class="bi bi-journal-code me-1" aria-hidden="true"></i>
        <strong>请使用 mathexam 模板出题，导入识别最准确</strong>
        <span class="text-muted fw-normal ms-1">（v{{ version }}）</span>
        <i :class="['bi', expanded ? 'bi-chevron-up' : 'bi-chevron-down', 'ms-1']" aria-hidden="true"></i>
      </button>
      <button
        type="button"
        class="btn-close btn-close-sm"
        aria-label="关闭提示"
        data-testid="mathexam-import-guide-dismiss"
        @click="dismiss"
      />
    </div>
    <div v-show="expanded" class="card-body py-3 small">
      <p class="mb-2 text-muted mb-3">
        建议用官方 mathexam 宏包编写试卷，题型环境与答案写法与系统解析器一致，可减少导入后手工修正。
      </p>
      <div class="d-flex flex-wrap gap-2">
        <a
          :href="githubUrl"
          class="btn btn-outline-secondary btn-sm"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="mathexam-import-guide-github"
        >
          <i class="bi bi-github"></i> GitHub 仓库
        </a>
        <a
          :href="styUrl"
          class="btn btn-outline-primary btn-sm"
          download="mathexam.sty"
          data-testid="mathexam-import-guide-sty"
        >
          <i class="bi bi-download"></i> 下载 mathexam.sty
        </a>
        <a
          :href="zipUrl"
          class="btn btn-primary btn-sm"
          download
          data-testid="mathexam-import-guide-zip"
        >
          <i class="bi bi-file-earmark-zip"></i> 下载模板包 (.zip)
        </a>
      </div>
    </div>
  </div>
</template>

<script>
import {
  MATHEXAM_VENDOR_VERSION,
  MATHEXAM_GITHUB_URL,
  mathexamStyDownloadUrl,
  mathexamTemplateZipUrl,
} from '@/constants/mathexamVendor';

const STORAGE_KEY = 'mathexamImportGuideDismissed';

export default {
  name: 'MathexamImportGuideCard',
  data() {
    return {
      visible: true,
      expanded: true,
      version: MATHEXAM_VENDOR_VERSION,
      githubUrl: MATHEXAM_GITHUB_URL,
      styUrl: mathexamStyDownloadUrl,
      zipUrl: mathexamTemplateZipUrl(),
    };
  },
  mounted() {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') {
        this.visible = false;
      }
    } catch {
      /* ignore */
    }
  },
  methods: {
    dismiss() {
      this.visible = false;
      try {
        localStorage.setItem(STORAGE_KEY, '1');
      } catch {
        /* ignore */
      }
    },
  },
};
</script>

<style scoped>
.mathexam-import-guide__toggle {
  color: inherit;
}
</style>
