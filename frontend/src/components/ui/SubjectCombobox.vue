<template>
  <div class="subject-combobox" :data-testid="rootTestId">
    <select
      :id="selectId"
      :value="internalSelect"
      class="form-select"
      :class="selectClass"
      :data-testid="selectTestId"
      @change="onNativeSelectChange"
    >
      <option v-if="allowEmpty" value="">{{ emptyLabel }}</option>
      <option v-for="subj in bankSubjects" :key="subj" :value="subj">{{ subj }}</option>
      <option :value="CUSTOM_VALUE">自定义…</option>
    </select>
    <input
      v-if="internalSelect === CUSTOM_VALUE"
      v-model="customDraft"
      type="text"
      class="form-control mt-2"
      :class="inputClass"
      :data-testid="customTestId"
      :placeholder="customPlaceholder"
      @input="onCustomInput"
    />
  </div>
</template>

<script>
import axios from 'axios';

const CUSTOM_VALUE = '__custom__';
const BANK_CHANGED_EVENT = 'mathexam-bank-changed';

export default {
  name: 'SubjectCombobox',
  props: {
    modelValue: { type: String, default: '' },
    allowEmpty: { type: Boolean, default: false },
    emptyLabel: { type: String, default: '不限科目' },
    customPlaceholder: { type: String, default: '输入科目名称' },
    selectClass: { type: [String, Object, Array], default: null },
    inputClass: { type: [String, Object, Array], default: null },
    selectId: { type: String, default: null },
    testIdPrefix: { type: String, default: 'subject-combobox' },
  },
  emits: ['update:modelValue', 'subjects-loaded'],
  data() {
    return {
      CUSTOM_VALUE,
      bankSubjects: [],
      internalSelect: '',
      customDraft: '',
      loadingSubjects: false,
    };
  },
  computed: {
    rootTestId() {
      return this.testIdPrefix;
    },
    selectTestId() {
      return `${this.testIdPrefix}-select`;
    },
    customTestId() {
      return `${this.testIdPrefix}-custom`;
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler() {
        this.syncFromModelValue();
      },
    },
    bankSubjects() {
      this.syncFromModelValue();
    },
  },
  mounted() {
    this.loadSubjects();
    window.addEventListener(BANK_CHANGED_EVENT, this.loadSubjects);
  },
  beforeUnmount() {
    window.removeEventListener(BANK_CHANGED_EVENT, this.loadSubjects);
  },
  methods: {
    async loadSubjects() {
      this.loadingSubjects = true;
      try {
        const { data } = await axios.get('/questions/subjects');
        const list = Array.isArray(data) ? data : [];
        this.bankSubjects = [...new Set(list.map((s) => String(s).trim()).filter(Boolean))].sort(
          (a, b) => a.localeCompare(b, 'zh-CN'),
        );
        this.$emit('subjects-loaded', this.bankSubjects);
      } catch (e) {
        console.error('加载科目列表失败', e);
        this.bankSubjects = [];
        this.$emit('subjects-loaded', []);
      } finally {
        this.loadingSubjects = false;
      }
    },
    syncFromModelValue() {
      const v = this.modelValue == null ? '' : String(this.modelValue);
      if (!v) {
        if (this.internalSelect === CUSTOM_VALUE) {
          return;
        }
        if (this.allowEmpty) {
          this.internalSelect = '';
          this.customDraft = '';
          return;
        }
        if (this.bankSubjects.length) {
          this.internalSelect = this.bankSubjects[0];
          if (this.internalSelect !== this.modelValue) {
            this.$emit('update:modelValue', this.internalSelect);
          }
          return;
        }
        this.internalSelect = CUSTOM_VALUE;
        this.customDraft = '';
        return;
      }
      if (this.bankSubjects.includes(v)) {
        this.internalSelect = v;
        this.customDraft = '';
        return;
      }
      this.internalSelect = CUSTOM_VALUE;
      this.customDraft = v;
    },
    onNativeSelectChange(event) {
      this.internalSelect = event.target.value;
      this.onSelectChange();
    },
    onSelectChange() {
      if (this.internalSelect === CUSTOM_VALUE) {
        const next = this.customDraft.trim();
        if (next) {
          this.$emit('update:modelValue', next);
        }
        return;
      }
      this.customDraft = '';
      this.$emit('update:modelValue', this.internalSelect);
    },
    onCustomInput() {
      if (this.internalSelect !== CUSTOM_VALUE) return;
      this.$emit('update:modelValue', this.customDraft);
    },
  },
};
</script>
