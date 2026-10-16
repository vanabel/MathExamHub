<template>
  <div class="container py-4">
    <h1 class="h3 mb-3"><i class="bi bi-shield-lock"></i> 平台管理</h1>
    <p v-if="forbidden" class="alert alert-danger">需要平台管理员（role: admin）权限。</p>
    <template v-else>
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
    };
  },
  mounted() {
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
        const [statsRes, usersRes] = await Promise.all([
          axios.get('/admin/stats'),
          axios.get('/admin/users'),
        ]);
        this.stats = statsRes.data;
        this.users = usersRes.data.users || [];
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
