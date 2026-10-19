<template>
  <div class="app-page app-container container-xl py-4">
    <h1 class="h3 mb-3"><i class="bi bi-shield-lock"></i> 平台管理</h1>
    <div
      v-if="forbidden"
      class="toast-container position-fixed top-0 end-0 p-3"
      style="z-index: 1090"
      data-testid="admin-forbidden-toast"
    >
      <div class="toast show align-items-center text-bg-danger border-0" role="alert">
        <div class="d-flex">
          <div class="toast-body">
            无权访问平台管理。需要平台管理员（role: admin）权限。
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="关闭" @click="forbidden = false"></button>
        </div>
      </div>
    </div>
    <p v-if="forbidden" class="alert alert-danger">需要平台管理员（role: admin）权限。</p>
    <template v-if="!forbidden">
      <div class="row g-3 mb-4">
        <div class="col-md-4">
          <div class="card shadow-sm">
            <div class="card-body">
              <div class="text-muted small">用户数</div>
              <div class="display-6">{{ stats.userCount ?? '—' }}</div>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card shadow-sm">
            <div class="card-body">
              <div class="text-muted small">题库数</div>
              <div class="display-6">{{ stats.bankCount ?? '—' }}</div>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card shadow-sm">
            <div class="card-body">
              <div class="text-muted small">题目数（未删除）</div>
              <div class="display-6">{{ stats.questionCount ?? '—' }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card shadow-sm mb-4">
        <div class="card-header">LLM 辅助（默认关闭）</div>
        <div class="card-body row g-3">
          <div class="col-md-4">
            <div class="form-check form-switch">
              <input id="llmOn" v-model="settings.llmAssistEnabled" class="form-check-input" type="checkbox" />
              <label class="form-check-label" for="llmOn">导入时自动建议难度与知识点</label>
            </div>
          </div>
          <div class="col-md-4">
            <label class="form-label small">Provider</label>
            <select v-model="settings.llmProvider" class="form-select form-select-sm">
              <option value="mock">mock（离线）</option>
              <option value="openai_compatible">OpenAI 兼容 API（如 SiliconFlow）</option>
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label small">API Base URL</label>
            <input v-model="settings.llmApiBaseUrl" class="form-control form-control-sm" placeholder="https://api.openai.com/v1" />
          </div>
          <div class="col-md-4">
            <label class="form-label small">Model</label>
            <input v-model="settings.llmModel" class="form-control form-control-sm" placeholder="deepseek-ai/DeepSeek-V4.1-Flash" />
          </div>
          <div class="col-md-4">
            <label class="form-label small">API Key {{ settings.hasApiKey ? '（已配置，留空则不修改）' : '' }}</label>
            <input v-model="llmApiKeyInput" type="password" class="form-control form-control-sm" autocomplete="new-password" />
          </div>
          <div class="col-md-4">
            <label class="form-label small">LaTeX 预览 LLM 上限（题数）</label>
            <input v-model.number="settings.llmPreviewMaxQuestions" type="number" min="1" max="200" class="form-control form-control-sm" />
          </div>
          <div class="col-md-4">
            <label class="form-label small">LaTeX 预览并发数</label>
            <input v-model.number="settings.llmPreviewConcurrency" type="number" min="1" max="10" class="form-control form-control-sm" />
          </div>
          <div class="col-md-4">
            <label class="form-label small">LLM 请求超时（秒，3–300）</label>
            <input v-model.number="llmTimeoutSec" type="number" min="3" max="300" class="form-control form-control-sm" />
          </div>
          <div class="col-md-4 d-flex align-items-end">
            <button type="button" class="btn btn-primary btn-sm" :disabled="savingSettings" @click="saveSettings">
              {{ savingSettings ? '保存中…' : '保存 LLM 设置' }}
            </button>
          </div>
        </div>
      </div>

      <div class="card shadow-sm">
        <div class="card-header d-flex justify-content-between align-items-center">
          <span>用户与角色</span>
          <button type="button" class="btn btn-sm btn-outline-primary" @click="loadUsers">刷新</button>
        </div>
        <div class="table-responsive">
          <table class="table table-sm mb-0">
            <thead>
              <tr>
                <th>用户名</th>
                <th>邮箱</th>
                <th>角色</th>
                <th>注册时间</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in users" :key="u._id">
                <td>{{ u.username }}</td>
                <td class="small">{{ u.email }}</td>
                <td>
                  <select
                    v-model="u.role"
                    class="form-select form-select-sm"
                    style="max-width: 140px"
                    :disabled="savingId === u._id"
                  >
                    <option value="Basic">Basic</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td class="small text-muted">{{ formatDate(u.createdTime) }}</td>
                <td>
                  <button
                    type="button"
                    class="btn btn-sm btn-primary"
                    :disabled="savingId === u._id"
                    @click="saveRole(u)"
                  >
                    保存
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'AdminConsoleView',
  data() {
    return {
      forbidden: false,
      stats: {},
      users: [],
      savingId: null,
      settings: {
        llmAssistEnabled: false,
        llmProvider: 'mock',
        llmApiBaseUrl: 'https://api.openai.com/v1',
        llmModel: 'deepseek-ai/DeepSeek-V4.1-Flash',
        hasApiKey: false,
      },
      llmApiKeyInput: '',
      savingSettings: false,
    };
  },
  computed: {
    llmTimeoutSec: {
      get() {
        const ms = this.settings.llmTimeoutMs;
        return ms != null ? Math.round(ms / 1000) : 120;
      },
      set(sec) {
        const n = Number(sec);
        if (Number.isNaN(n)) return;
        this.settings.llmTimeoutMs = Math.min(300, Math.max(3, n)) * 1000;
      },
    },
  },
  mounted() {
    const user = (() => {
      try {
        return JSON.parse(localStorage.getItem('currentUser') || 'null');
      } catch {
        return null;
      }
    })();
    const role = user?.role;
    if (role !== 'admin' && role !== 'Admin') {
      this.forbidden = true;
      return;
    }
    this.loadAll();
  },
  methods: {
    formatDate(iso) {
      if (!iso) return '—';
      return new Date(iso).toLocaleString('zh-CN');
    },
    async loadAll() {
      this.forbidden = false;
      try {
        const [statsRes, usersRes, settingsRes] = await Promise.all([
          axios.get('/admin/stats'),
          axios.get('/admin/users'),
          axios.get('/admin/settings'),
        ]);
        this.stats = statsRes.data;
        this.users = usersRes.data.users || [];
        this.settings = settingsRes.data.settings || this.settings;
      } catch (e) {
        if (e.response?.status === 403) {
          this.forbidden = true;
        } else {
          console.error(e);
          alert(e.response?.data?.error || '加载失败');
        }
      }
    },
    async loadUsers() {
      try {
        const { data } = await axios.get('/admin/users');
        this.users = data.users || [];
      } catch (e) {
        alert(e.response?.data?.error || '加载用户失败');
      }
    },
    async saveSettings() {
      this.savingSettings = true;
      try {
        const payload = { ...this.settings };
        if (this.llmApiKeyInput.trim()) payload.llmApiKey = this.llmApiKeyInput.trim();
        const { data } = await axios.patch('/admin/settings', payload);
        this.settings = data.settings;
        this.llmApiKeyInput = '';
        alert('LLM 设置已保存');
      } catch (e) {
        alert(e.response?.data?.error || '保存失败');
      } finally {
        this.savingSettings = false;
      }
    },
    async saveRole(user) {
      this.savingId = user._id;
      try {
        await axios.patch(`/admin/users/${user._id}/role`, { role: user.role });
        alert('角色已更新');
        const me = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (me.id === user._id || me.username === user.username) {
          const { data: refreshed } = await axios.post('/auth/refresh');
          if (refreshed.user) {
            localStorage.setItem('currentUser', JSON.stringify(refreshed.user));
          }
        }
      } catch (e) {
        alert(e.response?.data?.error || '保存失败');
      } finally {
        this.savingId = null;
      }
    },
  },
};
</script>
