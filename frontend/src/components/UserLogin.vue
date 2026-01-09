<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <div class="logo-circle">
          <i class="bi bi-book"></i>
        </div>
        <h2 class="mb-0">欢迎回来</h2>
        <p class="text-muted">登录您的账户以继续</p>
      </div>

      <form @submit.prevent="login" class="login-form">
        <div class="form-floating mb-3">
          <input
            type="text"
            class="form-control"
            id="loginUsername"
            v-model="username"
            placeholder="用户名"
            required
          />
          <label for="loginUsername">
            <i class="bi bi-person"></i> 用户名
          </label>
        </div>

        <div class="form-floating mb-3">
          <input
            type="password"
            class="form-control"
            id="loginPassword"
            v-model="password"
            placeholder="密码"
            required
          />
          <label for="loginPassword">
            <i class="bi bi-lock"></i> 密码
          </label>
        </div>

        <div class="text-end mb-3">
          <a href="#" @click.prevent="showForgotPassword = true" class="text-decoration-none text-primary small">
            <i class="bi bi-key"></i> 忘记密码？
          </a>
        </div>

        <div v-if="errorMessage" class="alert alert-danger" role="alert">
          <i class="bi bi-exclamation-triangle"></i> {{ errorMessage }}
        </div>
        <div v-if="successMessage" class="alert alert-success" role="alert">
          <i class="bi bi-check-circle"></i> {{ successMessage }}
        </div>

        <button type="submit" class="btn btn-primary w-100 mb-3" :disabled="loading">
          <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
          <i v-else class="bi bi-box-arrow-in-right"></i>
          {{ loading ? '登录中...' : '登录' }}
        </button>

        <div class="text-center">
          <p class="mb-0">
            还没有账户？
            <router-link to="/register" class="text-primary text-decoration-none fw-bold">
              立即注册
            </router-link>
          </p>
        </div>
      </form>
    </div>

    <!-- 忘记密码模态框 -->
    <div v-if="showForgotPassword" class="modal-overlay" @click.self="closeForgotPassword">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-key"></i> 重置密码
          </h5>
          <button type="button" class="btn-close" @click="closeForgotPassword"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">选择重置方式</label>
            <div class="btn-group w-100" role="group">
              <input
                type="radio"
                class="btn-check"
                id="resetByUsername"
                v-model="resetMethod"
                value="username"
                checked
              />
              <label class="btn btn-outline-primary" for="resetByUsername">用户名</label>
              <input
                type="radio"
                class="btn-check"
                id="resetByEmail"
                v-model="resetMethod"
                value="email"
              />
              <label class="btn btn-outline-primary" for="resetByEmail">邮箱</label>
            </div>
          </div>

          <div class="form-floating mb-3" v-if="resetMethod === 'username'">
            <input
              type="text"
              class="form-control"
              id="resetUsername"
              v-model="resetIdentifier"
              :placeholder="resetMethod === 'username' ? '用户名' : '邮箱'"
            />
            <label for="resetUsername">
              <i class="bi bi-person"></i> 用户名
            </label>
          </div>

          <div class="form-floating mb-3" v-else>
            <input
              type="email"
              class="form-control"
              id="resetEmail"
              v-model="resetIdentifier"
              placeholder="邮箱地址"
            />
            <label for="resetEmail">
              <i class="bi bi-envelope"></i> 邮箱地址
            </label>
          </div>

          <div class="form-floating mb-3">
            <input
              type="password"
              class="form-control"
              id="resetPassword"
              v-model="newPassword"
              placeholder="新密码"
            />
            <label for="resetPassword">
              <i class="bi bi-lock"></i> 新密码
            </label>
          </div>

          <div v-if="resetErrorMessage" class="alert alert-danger" role="alert">
            <i class="bi bi-exclamation-triangle"></i> {{ resetErrorMessage }}
          </div>
          <div v-if="resetSuccessMessage" class="alert alert-success" role="alert">
            <i class="bi bi-check-circle"></i> {{ resetSuccessMessage }}
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeForgotPassword">取消</button>
          <button
            type="button"
            class="btn btn-primary"
            @click="resetPassword"
            :disabled="resetLoading || !resetIdentifier || !newPassword"
          >
            <span v-if="resetLoading" class="spinner-border spinner-border-sm me-2"></span>
            <i v-else class="bi bi-key"></i>
            {{ resetLoading ? '重置中...' : '重置密码' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "UserLogin",
  data() {
    return {
      username: "",
      password: "",
      errorMessage: "",
      successMessage: "",
      loading: false,
      // 忘记密码相关
      showForgotPassword: false,
      resetMethod: "username",
      resetIdentifier: "",
      newPassword: "", // 新密码（避免与方法名冲突）
      resetErrorMessage: "",
      resetSuccessMessage: "",
      resetLoading: false,
    };
  },
  methods: {
    async login() {
      this.loading = true;
      this.errorMessage = "";
      this.successMessage = "";

      try {
        const response = await axios.post("/auth/login", {
          username: this.username,
          password: this.password,
        });
        
        // 安全提示：不在控制台记录包含用户信息的响应（生产环境）
        if (process.env.NODE_ENV === 'development') {
          console.log("登录成功");
        }
        
        // 保存用户信息
        if (response.data.user) {
          localStorage.setItem("currentUser", JSON.stringify(response.data.user));
        }
        
        this.errorMessage = "";
        this.successMessage = "登录成功，正在跳转...";
        
        setTimeout(() => {
          this.$router.push({ name: "question-list" });
        }, 500);
      } catch (error) {
        // 安全提示：只记录错误信息，不记录完整错误对象（可能包含敏感信息）
        if (process.env.NODE_ENV === 'development') {
          console.error("登录失败:", error.response?.status, error.response?.data?.error || error.message);
        }
        const backendMsg = error.response?.data?.error;
        if (backendMsg) {
          this.errorMessage = backendMsg;
        } else {
          this.errorMessage = "登录失败，请稍后重试。";
        }
        this.successMessage = "";
      } finally {
        this.loading = false;
      }
    },
    closeForgotPassword() {
      this.showForgotPassword = false;
      this.resetIdentifier = "";
      this.newPassword = "";
      this.resetErrorMessage = "";
      this.resetSuccessMessage = "";
      this.resetMethod = "username";
    },
    async resetPassword() {
      if (!this.resetIdentifier || !this.newPassword) {
        this.resetErrorMessage = "请填写完整信息";
        return;
      }

      this.resetLoading = true;
      this.resetErrorMessage = "";
      this.resetSuccessMessage = "";

      try {
        const endpoint =
          this.resetMethod === "username"
            ? "/auth/reset-password"
            : "/auth/reset-password-by-email";
        const payload =
          this.resetMethod === "username"
            ? { username: this.resetIdentifier, newPassword: this.newPassword }
            : { email: this.resetIdentifier, newPassword: this.newPassword };

        const response = await axios.post(endpoint, payload);

        this.resetSuccessMessage = response.data.message || "密码重置成功，请使用新密码登录";
        this.resetErrorMessage = "";

        // 3秒后关闭模态框
        setTimeout(() => {
          this.closeForgotPassword();
          // 自动填充用户名
          this.username = this.resetIdentifier;
        }, 3000);
      } catch (error) {
        console.error("密码重置失败:", error);
        const backendMsg = error.response?.data?.error;
        if (backendMsg) {
          this.resetErrorMessage = backendMsg;
        } else {
          this.resetErrorMessage = "密码重置失败，请稍后重试。";
        }
        this.resetSuccessMessage = "";
      } finally {
        this.resetLoading = false;
      }
    },
  },
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 2rem;
}

.login-card {
  background: white;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  padding: 3rem;
  width: 100%;
  max-width: 420px;
  animation: slideUp 0.5s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.logo-circle {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  font-size: 2rem;
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.login-header h2 {
  color: #333;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.login-header p {
  color: #6c757d;
  font-size: 0.95rem;
}

.login-form .form-floating label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.login-form .form-floating label i {
  font-size: 1.1rem;
}

.alert {
  border-radius: 8px;
  border: none;
  padding: 0.75rem 1rem;
}

.alert i {
  margin-right: 0.5rem;
}

@media (max-width: 576px) {
  .login-card {
    padding: 2rem 1.5rem;
  }
}

/* 忘记密码模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 15px;
  width: 100%;
  max-width: 450px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  animation: modalSlideUp 0.3s ease-out;
}

@keyframes modalSlideUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e9ecef;
}

.modal-title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #333;
  font-weight: 600;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e9ecef;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  opacity: 0.5;
  cursor: pointer;
  padding: 0;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  opacity: 1;
}
</style>
