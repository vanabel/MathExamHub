// main.js
import "bootstrap/dist/css/bootstrap.css";
import { createApp } from "vue";
import App from "./App.vue";
import VueMathjaxNext from "vue-mathjax-next";
import axios from "axios"; // 导入 axios
import router from "./router"; // 导入路由配置
const isProduction = process.env.NODE_ENV === 'production';
axios.defaults.baseURL =
  process.env.VUE_APP_API_BASE_URL ||
  (isProduction ? '/api' : 'http://localhost:3000/api');
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
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
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
