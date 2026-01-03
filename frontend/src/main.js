// main.js
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap/dist/js/bootstrap.bundle.js";
import { createApp } from "vue";
import App from "./App.vue";
import VueMathjaxNext from "vue-mathjax-next";
import axios from "axios"; // 导入 axios
import router from "./router"; // 导入路由配置

// 使用环境变量配置 API 地址
// 开发环境: http://localhost:3000
// 生产环境: /api (通过 nginx 反向代理)
// 如果在浏览器中运行，使用相对路径 /api；否则使用环境变量或默认值
const isProduction = process.env.NODE_ENV === 'production';
axios.defaults.baseURL = process.env.VUE_APP_API_BASE_URL || (isProduction ? '/api' : 'http://localhost:3000');
axios.defaults.withCredentials = true; // 允许发送 cookies（用于 session）

const app = createApp(App);
app.use(router); // 使用路由配置
app.config.globalProperties.$axios = axios; // 将Axios添加到Vue实例中
app.use(VueMathjaxNext);
app.mount("#app");
