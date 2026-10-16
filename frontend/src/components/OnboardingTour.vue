<template>
  <div class="onboarding-backdrop" @click.self="skipTour">
    <div class="onboarding-panel card shadow-lg" role="dialog" aria-labelledby="onboardingTitle" data-testid="onboarding-panel">
      <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
        <span id="onboardingTitle"><i class="bi bi-stars"></i> 快速上手 MathExamHub</span>
        <button type="button" class="btn-close btn-close-white" aria-label="关闭" @click="skipTour" />
      </div>
      <div class="card-body">
        <div v-if="step === 0" class="step-body">
          <p class="mb-3">
            首次使用建议<strong>一键导入示例题库</strong>（44 题，4 种题型、3 档难度、知识点树 + 开箱即用蓝图模板），便于体验
            <strong>导入 → 组卷向导 → 导出</strong> 全流程。
          </p>
          <button
            type="button"
            class="btn btn-success w-100 mb-2"
            data-testid="onboarding-import-sample"
            :disabled="importing || onboarding.sampleImported"
            @click="importSample"
          >
            <span v-if="importing" class="spinner-border spinner-border-sm me-2" />
            {{ onboarding.sampleImported ? '已导入示例题库' : '一键导入示例题库' }}
          </button>
          <p v-if="importMessage" class="small text-muted mb-0">{{ importMessage }}</p>
        </div>
        <div v-else-if="step === 1" class="step-body">
          <h6 class="fw-semibold">1. LaTeX 导入</h6>
          <p class="small text-muted">
            在「LaTeX 导入」上传 .tex 与配图；也可使用上一步导入的示例。支持预览后再确认入库。
          </p>
          <router-link to="/latex-import" class="btn btn-outline-primary btn-sm" @click="markStep(1)">
            打开 LaTeX 导入
          </router-link>
        </div>
        <div v-else-if="step === 2" class="step-body">
          <h6 class="fw-semibold">2. 组卷向导</h6>
          <p class="small text-muted">
            编辑蓝图、使用「检查题库覆盖」（可多种子分析），生成试卷并导出 ZIP。
          </p>
          <router-link to="/exam-wizard" class="btn btn-outline-primary btn-sm" @click="markStep(2)">
            打开组卷向导
          </router-link>
        </div>
        <div v-else-if="step === 3" class="step-body">
          <h6 class="fw-semibold">3. LaTeX 导出</h6>
          <p class="small text-muted">
            从题目列表或向导导出 mathexam 试卷；可勾选答题卡与主观题作答区。
          </p>
          <router-link to="/latex-export" class="btn btn-outline-primary btn-sm" @click="markStep(3)">
            打开 LaTeX 导出
          </router-link>
        </div>
        <div v-else class="step-body">
          <p class="mb-0">引导完成。更多说明见仓库 <code>docs/GETTING_STARTED.md</code>。</p>
        </div>
      </div>
      <div class="card-footer d-flex justify-content-between">
        <button type="button" class="btn btn-link btn-sm" data-testid="onboarding-skip" @click="skipTour">跳过</button>
        <div class="d-flex gap-2">
          <button v-if="step > 0" type="button" class="btn btn-outline-secondary btn-sm" @click="prevStep">
            上一步
          </button>
          <button v-if="step < 4" type="button" class="btn btn-primary btn-sm" @click="nextStep">
            {{ step === 0 && !onboarding.sampleImported ? '先导入或下一步' : '下一步' }}
          </button>
          <button v-else type="button" class="btn btn-success btn-sm" @click="finishTour">
            完成
          </button>
        </div>
      </div>
      <div class="px-3 pb-2">
        <div class="progress" style="height: 4px">
          <div class="progress-bar" role="progressbar" :style="{ width: progressPct + '%' }" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'OnboardingTour',
  props: {
    onboarding: {
      type: Object,
      default: () => ({ sampleImported: false, tourCompleted: false, tourStep: 0 }),
    },
  },
  emits: ['updated', 'closed'],
  data() {
    return {
      step: 0,
      importing: false,
      importMessage: '',
    };
  },
  computed: {
    progressPct() {
      return Math.min(100, ((this.step + 1) / 5) * 100);
    },
  },
  mounted() {
    this.step = Math.min(4, Math.max(0, Number(this.onboarding.tourStep) || 0));
  },
  methods: {
    async importSample() {
      this.importing = true;
      this.importMessage = '';
      try {
        const { data } = await axios.post('/onboarding/import-sample');
        if (data.alreadyImported) {
          this.importMessage = '示例此前已导入。';
        } else {
          this.importMessage = `已导入 ${data.imported} 题（跳过重复 ${data.skipped}）。`;
        }
        this.$emit('updated', data.onboarding);
      } catch (e) {
        this.importMessage = e.response?.data?.error || '导入失败';
      } finally {
        this.importing = false;
      }
    },
    async markStep(n) {
      try {
        const { data } = await axios.patch('/onboarding/tour', { tourStep: n });
        this.$emit('updated', data.onboarding);
      } catch (e) {
        console.error(e);
      }
    },
    async persistStep() {
      try {
        const { data } = await axios.patch('/onboarding/tour', { tourStep: this.step });
        this.$emit('updated', data.onboarding);
      } catch (e) {
        console.error(e);
      }
    },
    nextStep() {
      if (this.step < 4) this.step += 1;
      this.persistStep();
    },
    prevStep() {
      if (this.step > 0) this.step -= 1;
      this.persistStep();
    },
    async finishTour() {
      try {
        const { data } = await axios.patch('/onboarding/tour', { tourCompleted: true, tourStep: 4 });
        this.$emit('updated', data.onboarding);
      } catch (e) {
        console.error(e);
      }
      this.$emit('closed');
    },
    async skipTour() {
      await this.finishTour();
    },
  },
};
</script>

<style scoped>
.onboarding-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 2000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 1.5rem;
}
.onboarding-panel {
  max-width: 480px;
  width: 100%;
}
</style>
