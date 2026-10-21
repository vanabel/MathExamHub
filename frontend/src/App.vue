<template>
  <div id="app">
    <!-- 导航栏 - 仅在登录后显示 -->
    <nav
      v-if="showNavbar"
      class="navbar navbar-expand-lg navbar-light sticky-top app-navbar app-navbar--mac"
      data-testid="app-navbar"
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
              <ul class="dropdown-menu" aria-labelledby="navBankMenu" data-testid="nav-menu-bank-panel">
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
              <ul class="dropdown-menu" aria-labelledby="navExamMenu" data-testid="nav-menu-exam-panel">
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
                data-bs-boundary="viewport"
                data-bs-display="static"
                aria-expanded="false"
                :class="{ active: isToolsMenuActive }"
                data-testid="nav-menu-tools"
              >
                <i class="bi bi-tools"></i> 工具
              </a>
              <ul
                class="dropdown-menu dropdown-menu-end"
                aria-labelledby="navToolsMenu"
                data-testid="nav-menu-tools-panel"
              >
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
            <bank-selector
              v-if="showNavbar"
              class="navbar-bank-selector bank-selector-wrap"
              @bank-changed="onBankChanged"
            />
            <ul class="navbar-nav navbar-user-nav">
              <li class="nav-item dropdown">
                <a
                  class="nav-link dropdown-toggle user-nav-link"
                  href="#"
                  id="navbarDropdown"
                  role="button"
                  data-bs-toggle="dropdown"
                  data-bs-boundary="viewport"
                  data-bs-display="static"
                  aria-expanded="false"
                  data-testid="nav-user-menu"
                >
                  <i class="bi bi-person-circle"></i>
                  <span class="user-name">{{ currentUser?.username || '用户' }}</span>
                </a>
                <ul
                  class="dropdown-menu dropdown-menu-end"
                  aria-labelledby="navbarDropdown"
                  data-testid="nav-user-menu-panel"
                >
                  <li class="dropdown-header small text-muted">外观</li>
                  <li v-for="opt in colorSchemeOptions" :key="opt.value">
                    <button
                      type="button"
                      class="dropdown-item d-flex align-items-center justify-content-between"
                      :data-testid="`nav-theme-${opt.value}`"
                      @click="setColorScheme(opt.value)"
                    >
                      <span>{{ opt.label }}</span>
                      <i v-if="colorSchemePref === opt.value" class="bi bi-check2" aria-hidden="true" />
                    </button>
                  </li>
                  <li><hr class="dropdown-divider" /></li>
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
    <main class="app-main" :class="{ 'with-navbar': showNavbar }">
      <router-view />
    </main>
  </div>
</template>

<script>
import axios from 'axios';
import BankSelector from './components/BankSelector.vue';
import OnboardingTour from './components/OnboardingTour.vue';
import {
  applyColorScheme,
  COLOR_SCHEME_LABELS,
  getStoredColorScheme,
} from './utils/colorScheme';

const BANK_MENU_ROUTES = new Set([
  'question-add',
  'knowledge-points',
  'duplicates',
  'question-quality',
  'recycle-bin',
]);

const EXAM_MENU_ROUTES = new Set(['exam-wizard', 'exam-history']);

const TOOLS_MENU_ROUTES = new Set(['latex-import', 'latex-export']);

/** 仅在这些入口页自动弹出引导；深链（如 LaTeX 导入）不挡操作 */
const ONBOARDING_AUTO_START_ROUTES = new Set(['question-list']);

const ADMIN_MENU_ROUTES = new Set(['admin-console']);

export default {
  name: 'App',
  components: { BankSelector, OnboardingTour },
  data() {
    return {
      currentUser: null,
      onboardingDismissed: false,
      colorSchemePref: getStoredColorScheme(),
    };
  },
  computed: {
    colorSchemeOptions() {
      return [
        { value: 'system', label: COLOR_SCHEME_LABELS.system },
        { value: 'light', label: COLOR_SCHEME_LABELS.light },
        { value: 'dark', label: COLOR_SCHEME_LABELS.dark },
      ];
    },
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
        && ONBOARDING_AUTO_START_ROUTES.has(this.$route.name)
      );
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
    onBankChanged() {
      window.dispatchEvent(new CustomEvent('mathexam-bank-changed'));
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
    setColorScheme(value) {
      applyColorScheme(value);
      this.colorSchemePref = value;
    },
    async logout() {
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

.navbar-end {
  gap: 0.75rem;
  flex-wrap: nowrap;
  flex-shrink: 0;
  align-items: center;
  padding-left: 0.85rem;
  margin-left: 0.35rem;
  border-left: 1px solid var(--border-hairline, rgba(0, 0, 0, 0.08));
  min-width: 0;
}

.navbar-bank-selector {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;
}

.navbar-user-nav {
  flex-shrink: 0;
  margin-left: 0.5rem;
}

@media (min-width: 992px) {
  .navbar-shell {
    flex-wrap: nowrap;
    align-items: center;
  }

  .navbar-collapse-main {
    flex-wrap: nowrap;
    flex: 1 1 auto;
    min-width: 0;
    align-items: center;
  }

  .navbar-primary-nav {
    flex: 0 1 auto;
    min-width: 0;
  }

  .navbar-end {
    flex: 0 0 auto;
    width: auto;
    max-width: none;
    min-width: 0;
    margin-left: auto;
    justify-content: flex-end;
    align-items: center;
    gap: 0.65rem;
    overflow: visible;
  }
}

.navbar-user-nav .user-nav-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  max-width: 10rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.navbar-user-nav .user-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
  max-width: 6.5rem;
}

@media (max-width: 1199.98px) {
  .navbar-user-nav .user-name {
    display: none;
  }

  .navbar-user-nav .user-nav-link {
    max-width: 2.75rem;
    justify-content: center;
    padding-left: 0.35rem;
    padding-right: 0.35rem;
  }
}

@media (min-width: 1200px) {
  .navbar-user-nav .user-nav-link {
    max-width: 9rem;
  }
}

@media (min-width: 992px) and (max-width: 1199.98px) {
  .navbar-end :deep(.bank-selector-select) {
    max-width: 12rem;
    width: auto;
    min-width: 0;
  }
}

@media (min-width: 1200px) {
  .navbar-end :deep(.bank-selector-select) {
    max-width: 16rem;
    width: auto;
    min-width: 8rem;
  }
}

@media (min-width: 992px) {

  .navbar-end :deep(.bank-archive-btn) {
    flex-shrink: 0;
    padding-left: 0.45rem;
    padding-right: 0.45rem;
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
    border-top: 1px solid var(--border-hairline, rgba(0, 0, 0, 0.08));
    margin-top: 0.25rem;
  }

  .navbar-bank-selector {
    max-width: none;
    flex: 1 1 auto;
  }
}

@media (max-width: 768px) {
  .navbar-brand .brand-text {
    font-size: 0.95rem;
  }
}
</style>
