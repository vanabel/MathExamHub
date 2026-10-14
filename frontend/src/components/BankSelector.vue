<template>
  <div class="d-flex align-items-center gap-2">
    <label class="text-white-50 small mb-0">题库</label>
    <select
      v-model="currentBankId"
      class="form-select form-select-sm"
      style="min-width: 180px"
      @change="onChange"
    >
      <option v-for="b in banks" :key="b._id" :value="b._id">
        {{ b.name }} ({{ b.role }})
      </option>
    </select>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'BankSelector',
  data() {
    return {
      banks: [],
      currentBankId: localStorage.getItem('currentBankId') || '',
    };
  },
  async mounted() {
    await this.loadBanks();
  },
  methods: {
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
