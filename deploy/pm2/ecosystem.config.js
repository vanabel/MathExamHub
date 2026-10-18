/**
 * PM2 ecosystem for NAS bare-metal deploy (Node 20).
 * Usage (from repo root):
 *   PM2_BIN=~/pm2-local/node_modules/.bin/pm2 $PM2_BIN start deploy/pm2/ecosystem.config.js
 *
 * Backend reads backend/.env (dotenv in server.js). Do not put secrets here.
 */
const path = require('path');

const repoRoot = path.join(__dirname, '../..');
const logsDir = path.join(repoRoot, 'logs');

module.exports = {
  apps: [
    {
      name: 'mathexam-backend',
      script: 'server.js',
      cwd: path.join(repoRoot, 'backend'),
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        // PORT=19897 and MONGODB_URI etc. belong in backend/.env
      },
      error_file: path.join(logsDir, 'backend-error.log'),
      out_file: path.join(logsDir, 'backend-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
    },
    {
      name: 'mathexam-frontend',
      script: path.join(__dirname, 'start-frontend.sh'),
      cwd: repoRoot,
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
      error_file: path.join(logsDir, 'frontend-error.log'),
      out_file: path.join(logsDir, 'frontend-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
    },
  ],
};
