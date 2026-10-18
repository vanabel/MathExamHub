// main.js
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import { createApp } from "vue";
import App from "./App.vue";
import VueMathjaxNext from "vue-mathjax-next";
import axios from "axios"; // 导入 axios
import router from "./router"; // 导入路由配置
import { loginUrlWithRedirect } from "./utils/authRedirect";
const isProduction = process.env.NODE_ENV === 'production';
axios.defaults.baseURL =
  process.env.VUE_APP_API_BASE_URL ||
  '/api';
axios.defaults.withCredentials = true; // 允许发送 cookies（用于 session）

axios.interceptors.request.use((config) => {
  const bankId = localStorage.getItem('currentBankId');
  if (bankId) {
    config.headers['X-Bank-Id'] = bankId;
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('currentBankId');
      const path = `${window.location.pathname}${window.location.search}`;
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = loginUrlWithRedirect(path);
      }
    }
    return Promise.reject(error);
  },
);

const app = createApp(App);
app.use(router); // 使用路由配置
app.config.globalProperties.$axios = axios; // 将Axios添加到Vue实例中
app.use(VueMathjaxNext);
app.mount("#app");
