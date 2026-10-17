<template>
  <div class="bank-selector-toolbar">
    <label class="bank-selector-label" for="navbar-bank-select">题库</label>
    <select
      id="navbar-bank-select"
      v-model="currentBankId"
      class="form-select form-select-sm bank-selector-select"
      :title="selectedBankTitle"
      data-testid="navbar-bank-select"
      @change="onChange"
    >
      <option
        v-for="b in banks"
        :key="b._id"
        :value="b._id"
        :title="formatBankTitle(b)"
      >
        {{ formatBankOption(b) }}
      </option>
    </select>
    <BankLatexMetadataEditor :bank-id="currentBankId" variant="navbar" />
  </div>
</template>

<script>
import axios from 'axios';
import BankLatexMetadataEditor from './BankLatexMetadataEditor.vue';

const ROLE_LABELS = {
  owner: '拥有',
  editor: '编辑',
  viewer: '只读',
};

export default {
  name: 'BankSelector',
  components: { BankLatexMetadataEditor },
  data() {
    return {
      banks: [],
      currentBankId: localStorage.getItem('currentBankId') || '',
    };
  },
  computed: {
    currentBank() {
      return this.banks.find((b) => b._id === this.currentBankId) || null;
    },
    selectedBankTitle() {
      return this.currentBank ? this.formatBankTitle(this.currentBank) : '';
    },
  },
  async mounted() {
    await this.loadBanks();
  },
  methods: {
    roleLabel(role) {
      return ROLE_LABELS[role] || role;
    },
    formatBankTitle(bank) {
      return `${bank.name}（${this.roleLabel(bank.role)}）`;
    },
    formatBankOption(bank) {
      const role = this.roleLabel(bank.role);
      const suffix = `（${role}）`;
      const maxNameLen = 18;
      let name = bank.name;
      if (name.length > maxNameLen) {
        name = `${name.slice(0, maxNameLen - 1)}…`;
      }
      return `${name}${suffix}`;
    },
    async loadBanks() {
      try {
        const { data } = await axios.get('/banks/mine');
        this.banks = data.banks || [];
        if (!this.currentBankId && this.banks.length) {
          const personal = this.banks.find((b) => b.isPersonalDefault) || this.banks[0];
          this.currentBankId = personal._id;
          localStorage.setItem('currentBankId', this.currentBankId);
        }
        const current = this.banks.find((b) => b._id === this.currentBankId);
        if (current) {
          localStorage.setItem('currentBank', JSON.stringify({ role: current.role, name: current.name }));
        }
      } catch (e) {
        console.error('加载题库失败', e);
      }
    },
    onChange() {
      localStorage.setItem('currentBankId', this.currentBankId);
      const current = this.banks.find((b) => b._id === this.currentBankId);
      if (current) {
        localStorage.setItem('currentBank', JSON.stringify({ role: current.role, name: current.name }));
      }
      this.$emit('bank-changed', this.currentBankId);
    },
  },
};
</script>

<style scoped>
.bank-selector-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.5rem;
  min-width: 0;
}

.bank-selector-label {
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.875rem;
  margin-bottom: 0;
  white-space: nowrap;
  flex-shrink: 0;
  line-height: 1.2;
}

.bank-selector-select {
  flex: 1 1 auto;
  min-width: 11rem;
  max-width: 16rem;
  width: 14rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background-color: rgba(255, 255, 255, 0.97);
  font-size: 0.875rem;
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
  text-overflow: ellipsis;
}

.bank-selector-select:focus {
  border-color: rgba(255, 255, 255, 0.75);
  box-shadow: 0 0 0 0.15rem rgba(255, 255, 255, 0.25);
}
</style>
