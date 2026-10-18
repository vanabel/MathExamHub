<template>
  <div id="app">
    <!-- 导航栏 - 仅在登录后显示 -->
    <nav
      v-if="showNavbar"
      class="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm sticky-top app-navbar"
    >
      <div class="container-fluid navbar-shell">
        <router-link class="navbar-brand fw-bold flex-shrink-0" to="/question-list">
          <i class="bi bi-book"></i>
          <span class="brand-text">数学试题库</span>
        </router-link>
        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="切换导航"
        >
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse navbar-collapse-main" id="navbarNav">
          <ul class="navbar-nav navbar-primary-nav me-lg-auto">
            <li class="nav-item">
              <router-link
                class="nav-link"
                :class="{ active: $route.name === 'question-list' }"
                to="/question-list"
                data-testid="nav-question-list"
              >
                <i class="bi bi-list-ul"></i> 题目列表
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                class="nav-link"
                :class="{ active: $route.name === 'exam-wizard' }"
                to="/exam-wizard"
                data-testid="nav-exam-wizard"
              >
                <i class="bi bi-magic"></i> 组卷向导
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                class="nav-link"
                :class="{ active: $route.name === 'bank-stats' }"
                to="/bank-stats"
                data-testid="nav-bank-stats"
              >
                <i class="bi bi-bar-chart"></i> 统计
              </router-link>
            </li>

            <li class="nav-item dropdown">
              <a
                class="nav-link dropdown-toggle"
                href="#"
                id="navBankMenu"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                :class="{ active: isBankMenuActive }"
                data-testid="nav-menu-bank"
              >
                <i class="bi bi-journal-text"></i> 题库
              </a>
              <ul class="dropdown-menu" aria-labelledby="navBankMenu">
                <li>
                  <router-link
                    class="dropdown-item"
                    :class="{ active: $route.name === 'question-add' }"
                    to="/question-add"
                  >
                    <i class="bi bi-plus-circle"></i> 添加题目
                  </router-link>
                </li>
                <li>
                  <router-link
                    class="dropdown-item"
                    :class="{ active: $route.name === 'knowledge-points' || $route.name === 'knowledge-points-import' || $route.name === 'knowledge-points-tag-review' }"
                    to="/knowledge-points"
                  >
                    <i class="bi bi-diagram-3"></i> 知识点
                  </router-link>
                </li>
                <li>
                  <router-link
                    class="dropdown-item"
                    :class="{ active: $route.name === 'duplicates' }"
                    to="/duplicates"
                  >
                    <i class="bi bi-files"></i> 重复审查
                  </router-link>
                </li>
                <li>
                  <router-link
                    class="dropdown-item"
                    :class="{ active: $route.name === 'question-quality' }"
                    to="/question-quality"
                  >
                    <i class="bi bi-shield-check"></i> 质量
                  </router-link>
                </li>
                <li>
                  <router-link
                    class="dropdown-item"
                    :class="{ active: $route.name === 'recycle-bin' }"
                    to="/recycle-bin"
                  >
                    <i class="bi bi-trash"></i> 回收站
                  </router-link>
                </li>
              </ul>
            </li>

            <li class="nav-item dropdown">
              <a
                class="nav-link dropdown-toggle"
                href="#"
                id="navExamMenu"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                :class="{ active: isExamMenuActive }"
                data-testid="nav-menu-exam"
              >
                <i class="bi bi-file-earmark-text"></i> 组卷
              </a>
              <ul class="dropdown-menu" aria-labelledby="navExamMenu">
                <li>
                  <router-link
                    class="dropdown-item"
                    :class="{ active: $route.name === 'exam-wizard' }"
                    to="/exam-wizard"
                  >
                    <i class="bi bi-magic"></i> 组卷向导
                  </router-link>
                </li>
                <li>
                  <router-link
                    class="dropdown-item"
                    :class="{ active: $route.name === 'exam-history' }"
                    to="/exam-history"
                  >
                    <i class="bi bi-clock-history"></i> 组卷历史
                  </router-link>
                </li>
              </ul>
            </li>

            <li class="nav-item dropdown">
              <a
                class="nav-link dropdown-toggle"
                href="#"
                id="navToolsMenu"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                :class="{ active: isToolsMenuActive }"
                data-testid="nav-menu-tools"
              >
                <i class="bi bi-tools"></i> 工具
              </a>
              <ul class="dropdown-menu" aria-labelledby="navToolsMenu">
                <li>
                  <router-link
                    class="dropdown-item"
                    :class="{ active: $route.name === 'latex-import' }"
                    to="/latex-import"
                  >
                    <i class="bi bi-upload"></i> LaTeX 导入
                  </router-link>
                </li>
                <li>
                  <router-link
                    class="dropdown-item"
                    :class="{ active: $route.name === 'latex-export' }"
                    to="/latex-export"
                  >
                    <i class="bi bi-download"></i> LaTeX 导出
                  </router-link>
                </li>
              </ul>
            </li>

            <li v-if="isPlatformAdmin" class="nav-item dropdown">
              <a
                class="nav-link dropdown-toggle"
                href="#"
                id="navAdminMenu"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                :class="{ active: isAdminMenuActive }"
                data-testid="nav-menu-admin"
              >
                <i class="bi bi-shield-lock"></i> 管理
              </a>
              <ul class="dropdown-menu" aria-labelledby="navAdminMenu">
                <li>
                  <router-link
                    class="dropdown-item"
                    :class="{ active: $route.name === 'admin-console' }"
                    to="/admin"
                  >
                    <i class="bi bi-gear"></i> 平台管理
                  </router-link>
                </li>
              </ul>
            </li>
          </ul>

          <div class="navbar-end d-flex align-items-center flex-shrink-0 ms-lg-auto">
            <bank-selector v-if="showNavbar" class="navbar-bank-selector" @bank-changed="onBankChanged" />
            <ul class="navbar-nav navbar-user-nav">
              <li class="nav-item dropdown" :class="{ show: showUserMenu }">
                <a
                  class="nav-link dropdown-toggle user-nav-link"
                  href="#"
                  id="navbarDropdown"
                  role="button"
                  @click.prevent="toggleUserMenu"
                  aria-expanded="false"
                  data-testid="nav-user-menu"
                >
                  <i class="bi bi-person-circle"></i>
                  <span class="user-name">{{ currentUser?.username || '用户' }}</span>
                </a>
                <ul
                  class="dropdown-menu dropdown-menu-end"
                  :class="{ show: showUserMenu }"
                  aria-labelledby="navbarDropdown"
                >
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
      </div>
    </nav>

    <onboarding-tour
      v-if="showOnboardingTour"
      :onboarding="onboardingState"
      @updated="onOnboardingUpdated"
      @closed="onOnboardingClosed"
    />

    <!-- 主内容区域 -->
    <main :class="{ 'with-navbar': showNavbar }">
      <router-view />
    </main>
  </div>
</template>

<script>
import axios from 'axios';
import BankSelector from './components/BankSelector.vue';
import OnboardingTour from './components/OnboardingTour.vue';

const BANK_MENU_ROUTES = new Set([
  'question-add',
  'knowledge-points',
  'duplicates',
  'question-quality',
  'recycle-bin',
]);

const EXAM_MENU_ROUTES = new Set(['exam-wizard', 'exam-history']);

const TOOLS_MENU_ROUTES = new Set(['latex-import', 'latex-export']);

const ADMIN_MENU_ROUTES = new Set(['admin-console']);

export default {
  name: 'App',
  components: { BankSelector, OnboardingTour },
  data() {
    return {
      currentUser: null,
      showUserMenu: false,
      onboardingDismissed: false,
    };
  },
  computed: {
    showNavbar() {
      return this.$route.name !== 'login' && this.$route.name !== 'register';
    },
    isPlatformAdmin() {
      const role = this.currentUser?.role;
      return role === 'admin' || role === 'Admin';
    },
    isBankMenuActive() {
      return BANK_MENU_ROUTES.has(this.$route.name);
    },
    isExamMenuActive() {
      return EXAM_MENU_ROUTES.has(this.$route.name);
    },
    isToolsMenuActive() {
      return TOOLS_MENU_ROUTES.has(this.$route.name);
    },
    isAdminMenuActive() {
      return ADMIN_MENU_ROUTES.has(this.$route.name);
    },
    onboardingState() {
      return this.currentUser?.onboarding || {
        sampleImported: false,
        tourCompleted: false,
        tourStep: 0,
      };
    },
    showOnboardingTour() {
      return (
        this.showNavbar
        && this.currentUser
        && !this.onboardingState.tourCompleted
        && !this.onboardingDismissed
      );
    },
  },
  mounted() {
    this.loadUser();
    document.addEventListener('click', this.handleClickOutside);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside);
  },
  watch: {
    $route() {
      this.loadUser();
      this.showUserMenu = false;
    },
  },
  methods: {
    async loadUser() {
      const userStr = localStorage.getItem('currentUser');
      if (!userStr) {
        this.currentUser = null;
        return;
      }
      try {
        this.currentUser = JSON.parse(userStr);
      } catch (e) {
        this.currentUser = null;
        return;
      }
      if (this.$route.name === 'login' || this.$route.name === 'register') {
        return;
      }
      try {
        const { data } = await axios.get('/auth/me');
        if (data.user) {
          this.currentUser = data.user;
          localStorage.setItem('currentUser', JSON.stringify(data.user));
        }
      } catch (e) {
        if (e.response?.status !== 401) {
          console.error('刷新用户信息失败', e);
        }
      }
    },
    toggleUserMenu(event) {
      event.stopPropagation();
      this.showUserMenu = !this.showUserMenu;
    },
    handleClickOutside(event) {
      const dropdown = event.target.closest('.dropdown');
      if (!dropdown && this.showUserMenu) {
        this.showUserMenu = false;
      }
    },
    onBankChanged() {
      if (this.$route.name === 'question-list') {
        this.$router.go(0);
      }
    },
    onOnboardingUpdated(onboarding) {
      if (this.currentUser) {
        this.currentUser = { ...this.currentUser, onboarding };
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      }
    },
    onOnboardingClosed() {
      this.onboardingDismissed = true;
    },
    async logout() {
      this.showUserMenu = false;

      try {
        await axios.post('/auth/logout');
      } catch (error) {
        console.log('后端登出失败:', error);
      }

      localStorage.removeItem('currentUser');
      this.currentUser = null;

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

.app-navbar,
.navbar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
}

.navbar-shell {
  gap: 0.25rem;
}

.navbar-collapse-main {
  align-items: center;
}

.navbar-primary-nav {
  flex-wrap: nowrap;
}

.navbar-primary-nav .nav-link {
  padding: 0.35rem 0.6rem;
  font-size: 0.9rem;
  white-space: nowrap;
}

.navbar-brand {
  white-space: nowrap;
  padding-top: 0.4rem;
  padding-bottom: 0.4rem;
}

.navbar-brand .brand-text {
  margin-left: 0.15rem;
}

.nav-link.active {
  font-weight: 600;
  background-color: rgba(255, 255, 255, 0.14);
  border-radius: 6px;
}

.nav-link {
  transition: background-color 0.2s, color 0.2s;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
}

.navbar-end {
  gap: 0.75rem;
  flex-wrap: nowrap;
  flex-shrink: 0;
  align-items: center;
  padding-left: 0.85rem;
  margin-left: 0.35rem;
  border-left: 1px solid rgba(255, 255, 255, 0.22);
}

.navbar-bank-selector {
  flex: 0 1 auto;
  min-width: 0;
}

.navbar-user-nav {
  flex-shrink: 0;
  margin-left: 0.15rem;
}

.navbar-user-nav .user-nav-link {
  max-width: 11rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.navbar-user-nav .user-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}

.dropdown-item.active,
.dropdown-item:active {
  background-color: rgba(102, 126, 234, 0.12);
  color: #4c51bf;
  font-weight: 600;
}

/* 下拉菜单样式 */
.dropdown-menu {
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  margin-top: 0.5rem;
}

.dropdown-item {
  padding: 0.65rem 1.1rem;
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

@media (min-width: 992px) {
  .navbar-collapse-main {
    flex-wrap: nowrap !important;
  }

  .navbar-primary-nav .nav-item {
    flex-shrink: 0;
  }

  .navbar-end :deep(.bank-selector-select) {
    max-width: 18rem;
    width: min(18rem, 22vw);
  }
}

@media (max-width: 991.98px) {
  .navbar-primary-nav {
    flex-wrap: wrap;
    padding-bottom: 0.5rem;
  }

  .navbar-end {
    width: 100%;
    justify-content: space-between;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    margin-top: 0.25rem;
  }

  .navbar-bank-selector {
    max-width: none;
    flex: 1 1 auto;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  main {
    padding: 1rem 0;
  }

  .navbar-brand .brand-text {
    font-size: 0.95rem;
  }
}
</style>
