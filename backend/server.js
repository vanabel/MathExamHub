// 加载环境变量（必须在最开始）
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const crypto = require('crypto');
const connectDB = require('./config/database');

const secret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const app = express();

const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Bank-Id'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(session({
  secret,
  resave: true,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

require('./config/passport')(passport);
app.use(passport.initialize());
app.use(passport.session());

const authRoutes = require('./routes/auth');
const questionRoutes = require('./routes/questions');
const knowledgePointRoutes = require('./routes/knowledgePoints');
const bankRoutes = require('./routes/banks');
const examBlueprintRoutes = require('./routes/examBlueprints');
const examRoutes = require('./routes/exams');
const adminRoutes = require('./routes/admin');
const onboardingRoutes = require('./routes/onboarding');
const path = require('path');

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'mathexam-backend',
    mongoReadyState: require('mongoose').connection.readyState,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/knowledge-points', knowledgePointRoutes);
app.use('/api/banks', bankRoutes);
app.use('/api/exam-blueprints', examBlueprintRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/admin', adminRoutes);

const requireAuth = require('./middleware/requireAuth');
app.use('/api/uploads', requireAuth, express.static(path.join(__dirname, 'uploads')));

app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'API 路由不存在',
    method: req.method,
    path: req.originalUrl,
  });
});

app.get('/', (req, res) => {
  res.send('MathExamHub API. Use /api/health and /api/questions/*');
});

const port = process.env.PORT || 3000;

async function startServer() {
  await connectDB();
  app.listen(port, () => {
    console.log(`✓ Server is running on port ${port} (API prefix: /api)`);
  });
}

startServer().catch((error) => {
  console.error('✗ Failed to start server:', error);
  process.exit(1);
});
