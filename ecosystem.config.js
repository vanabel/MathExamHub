// PM2 会自动加载 backend/.env 文件（通过 dotenv）
// 但也可以在这里显式指定环境变量，优先级高于 .env 文件
const path = require("path");
const logsDir = path.join(__dirname, "logs");

module.exports = {
  apps: [
    {
      name: "mathexam-backend",
      script: "server.js",
      cwd: path.join(__dirname, "backend"),
      instances: 1,
      exec_mode: "fork",
      watch: false,
      // dotenv 会在 server.js 中自动加载 backend/.env 文件
      // 这里的环境变量会覆盖 .env 文件中的值（如果需要）
      env: {
        NODE_ENV: "production"
        // PORT 和 MONGODB_URI 等配置请在 backend/.env 文件中设置
        // 参考 backend/.env.example 创建 backend/.env 文件
        // PM2 启动时会自动加载 backend/.env 文件（server.js 中使用 dotenv）
      },
      error_file: path.join(logsDir, "backend-error.log"),
      out_file: path.join(logsDir, "backend-out.log"),
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 4000
    },
    {
      name: "mathexam-frontend",
      // 使用启动脚本，避免 PM2 传参问题
      // 需先执行: npm install -g serve
      script: path.join(__dirname, "start-frontend.sh"),
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      watch: false,
      env: {
        NODE_ENV: "production"
      },
      error_file: path.join(logsDir, "frontend-error.log"),
      out_file: path.join(logsDir, "frontend-out.log"),
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 4000
    }
  ]
};
