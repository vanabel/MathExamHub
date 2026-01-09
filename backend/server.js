// 加载环境变量（必须在最开始）
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const crypto = require('crypto');
// 使用环境变量中的 SESSION_SECRET，如果没有则生成一个随机字符串
const secret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const app = express();
// 启用 CORS 中间件 - 配置为允许前端地址并支持 credentials
const allowedOrigins = [
  'http://localhost:8080',  // Vue CLI 默认端口
  'http://localhost:5173',  // Vite 默认端口
  'http://localhost:3000',  // 其他常见端口
  'http://127.0.0.1:8080',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'https://exam.vanabel.cn',  // 生产环境域名
  'http://192.168.2.38:19896'  // 本地 IP 访问
];

app.use(cors({
  origin: function (origin, callback) {
    // 允许没有 origin 的请求（如移动应用或 Postman）
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // 开发环境：允许所有 localhost 端口
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true, // 允许发送 cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// 导入路由文件
const authRoutes = require('./routes/auth');
const questionRoutes = require('./routes/questions');
// 连接数据库
const connectDB = require('./config/database');
// 配置body-parser中间件 
app.use(express.json()); // 解析JSON格式的请求体
app.use(express.urlencoded({extended: false})); // 解析表单数据
// 配置 express-session 中间件
app.use(
  session({
    secret: secret,
    resave: true,
    saveUninitialized: true,
    cookie: {
      httpOnly: true, // 防止 XSS 攻击
      secure: false, // 开发环境使用 false，生产环境使用 true（需要 HTTPS）
      sameSite: 'lax', // 允许跨站请求发送 cookie
      maxAge: 24 * 60 * 60 * 1000 // 24 小时
    }
  })
);
// 设置Passport.js配置
require('./config/passport')(passport);

// 使用Passport.js中间件
app.use(passport.initialize());
app.use(passport.session());

// 注册路由（添加 /api 前缀）
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);

// 提供静态文件服务（用于访问上传的图片和PDF）
const path = require('path');
const expressStatic = express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    // 确保 PDF 文件使用正确的 Content-Type
    if (filePath.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    }
  },
  // 确保正确处理中文文件名
  dotfiles: 'ignore',
  etag: true,
  extensions: ['pdf', 'png', 'jpg', 'jpeg', 'gif'],
  index: false,
  maxAge: '1d',
  redirect: false
});
app.use('/api/uploads', expressStatic);
// 定义一个根路由
app.get('/', (req, res) => {
  res.send('Welcome to the question library application.'); // 可以根据你的需求修改响应内容
});


// 启动Express服务器（等待数据库连接）
const port = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // 等待数据库连接
    await connectDB();
    
    // 数据库连接成功后再启动服务器
    app.listen(port, () => {
      console.log(`✓ Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
