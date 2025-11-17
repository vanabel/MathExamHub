<template>
  <div id="app">
    <!-- 导航栏 - 仅在登录后显示 -->
    <nav v-if="showNavbar" class="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
      <div class="container-fluid">
        <a class="navbar-brand fw-bold" href="#">
          <i class="bi bi-book"></i> 数学试题库
        </a>
        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav me-auto">
            <li class="nav-item">
              <router-link class="nav-link" :class="{ active: $route.name === 'question-list' }" to="/question-list">
                <i class="bi bi-list-ul"></i> 题目列表
              </router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" :class="{ active: $route.name === 'question-add' }" to="/question-add">
                <i class="bi bi-plus-circle"></i> 添加题目
              </router-link>
            </li>
            <li class="nav-item dropdown">
              <a
                class="nav-link dropdown-toggle"
                href="#"
                id="latexDropdown"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i class="bi bi-file-earmark-text"></i> LaTeX 导入/导出
              </a>
              <ul class="dropdown-menu" aria-labelledby="latexDropdown">
                <li>
                  <router-link class="dropdown-item" :class="{ active: $route.name === 'latex-import' }" to="/latex-import">
                    <i class="bi bi-upload"></i> 导入 LaTeX
                  </router-link>
                </li>
                <li>
                  <router-link class="dropdown-item" :class="{ active: $route.name === 'latex-export' }" to="/latex-export">
                    <i class="bi bi-download"></i> 导出 LaTeX
                  </router-link>
                </li>
              </ul>
            </li>
          </ul>
          <ul class="navbar-nav">
            <li class="nav-item dropdown">
              <a
                class="nav-link dropdown-toggle"
                href="#"
                id="navbarDropdown"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i class="bi bi-person-circle"></i>
                {{ currentUser?.username || '用户' }}
              </a>
              <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="navbarDropdown">
                <li>
                  <a class="dropdown-item" href="#" @click.prevent="logout">
                    <i class="bi bi-box-arrow-right"></i> 退出登录
                  </a>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>

    <!-- 主内容区域 -->
    <main :class="{ 'with-navbar': showNavbar }">
      <router-view />
    </main>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'App',
  data() {
    return {
      currentUser: null,
    };
  },
  computed: {
    showNavbar() {
      // 在登录和注册页面不显示导航栏
      return this.$route.name !== 'login' && this.$route.name !== 'register';
    },
  },
  mounted() {
    this.loadUser();
  },
  watch: {
    $route() {
      this.loadUser();
    },
  },
  methods: {
    loadUser() {
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        try {
          this.currentUser = JSON.parse(userStr);
        } catch (e) {
          console.error('解析 currentUser 失败:', e);
        }
      } else {
        this.currentUser = null;
      }
    },
    async logout() {
      // 调用后端登出接口
      try {
        await axios.post('/auth/logout');
      } catch (error) {
        // 即使后端登出失败，也继续前端登出流程
        console.log('后端登出失败:', error);
      }
      
      // 清除本地存储的用户信息
      localStorage.removeItem('currentUser');
      this.currentUser = null;
      
      // 跳转到登录页
      this.$router.push('/login');
    },
  },
};
</script>

<style>
#app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-attachment: fixed;
}

main {
  min-height: calc(100vh - 56px);
  padding: 2rem 0;
}

main.with-navbar {
  padding-top: 1rem;
}

/* 全局样式优化 */
.card {
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
}

.btn {
  border-radius: 8px;
  padding: 0.5rem 1.5rem;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
}

.form-control,
.form-select {
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  padding: 0.75rem;
  transition: all 0.2s;
}

.form-control:focus,
.form-select:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
}

.navbar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
}

.nav-link.active {
  font-weight: 600;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
}

.nav-link {
  transition: all 0.2s;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
}

/* 下拉菜单样式 */
.dropdown-menu {
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  margin-top: 0.5rem;
}

.dropdown-item {
  padding: 0.75rem 1.25rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dropdown-item:hover {
  background-color: #f8f9fa;
  color: #667eea;
}

.dropdown-item i {
  font-size: 1rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  main {
    padding: 1rem 0;
  }
}
</style>
