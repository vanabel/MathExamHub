<template>
  <div class="register-container">
    <div class="register-card">
      <div class="register-header">
        <div class="logo-circle">
          <i class="bi bi-person-plus"></i>
        </div>
        <h2 class="mb-0">创建账户</h2>
        <p class="text-muted">填写信息以注册新账户</p>
      </div>

      <form @submit.prevent="registerUser" class="register-form">
        <div class="form-floating mb-3">
          <input
            type="text"
            class="form-control"
            id="floatingUsername"
            v-model="username"
            placeholder="用户名"
            required
          />
          <label for="floatingUsername">
            <i class="bi bi-person"></i> 用户名
          </label>
        </div>

        <div class="form-floating mb-3">
          <input
            type="email"
            class="form-control"
            id="floatingEmail"
            v-model="email"
            placeholder="name@example.com"
            required
          />
          <label for="floatingEmail">
            <i class="bi bi-envelope"></i> 邮箱地址
          </label>
        </div>

        <div class="form-floating mb-3">
          <input
            type="password"
            class="form-control"
            id="floatingPassword"
            v-model="password"
            placeholder="密码"
            required
          />
          <label for="floatingPassword">
            <i class="bi bi-lock"></i> 密码
          </label>
        </div>

        <div v-if="errorMessage" class="alert alert-danger" role="alert">
          <i class="bi bi-exclamation-triangle"></i> {{ errorMessage }}
        </div>
        <div v-if="successMessage" class="alert alert-success" role="alert">
          <i class="bi bi-check-circle"></i> {{ successMessage }}
        </div>

        <button type="submit" class="btn btn-primary w-100 mb-3" :disabled="loading">
          <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
          <i v-else class="bi bi-person-plus"></i>
          {{ loading ? '注册中...' : '注册' }}
        </button>

        <div class="text-center">
          <p class="mb-0">
            已有账户？
            <router-link to="/login" class="text-primary text-decoration-none fw-bold">
              立即登录
            </router-link>
          </p>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "UserRegister",
  data() {
    return {
      username: "",
      password: "",
      email: "",
      currentYear: new Date().getFullYear(),
      errorMessage: "",
      successMessage: "",
      loading: false,
    };
  },
  methods: {
    async registerUser() {
      this.loading = true;
      this.errorMessage = "";
      this.successMessage = "";

      try {
        const response = await axios.post("/auth/register", {
          username: this.username,
          password: this.password,
          email: this.email,
        });

        console.log(response);
        this.errorMessage = "";
        this.successMessage = "注册成功，请使用新账号登录。";
        
        setTimeout(() => {
          this.$router.push("/login");
        }, 1500);
      } catch (error) {
        console.error("注册失败:", error);
        const backendMsg = error.response?.data?.error;
        if (backendMsg) {
          this.errorMessage = backendMsg;
        } else {
          this.errorMessage = "注册失败，请稍后重试。";
        }
        this.successMessage = "";
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 2rem;
}

.register-card {
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

.register-header {
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

.register-header h2 {
  color: #333;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.register-header p {
  color: #6c757d;
  font-size: 0.95rem;
}

.register-form .form-floating label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.register-form .form-floating label i {
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
  .register-card {
    padding: 2rem 1.5rem;
  }
}
</style>
