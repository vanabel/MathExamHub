// 加载环境变量（必须在最开始）
require('dotenv').config();

const express = require('express');
const passport = require('passport');
const session = require('express-session');
const crypto = require('crypto');
const connectDB = require('./config/database');
const { parseCorsOrigins } = require('./config/corsOrigins');
const { createCorsPolicyMiddleware } = require('./middleware/corsPolicy');

const secret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const app = express();

app.use(...createCorsPolicyMiddleware(parseCorsOrigins()));

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
  const pkg = require('./package.json');
  const payload = {
    ok: true,
    version: pkg.version,
    service: 'mathexam-backend',
    mongoReadyState: require('mongoose').connection.readyState,
  };
  const commit = process.env.GIT_COMMIT || process.env.SOURCE_COMMIT;
  if (commit) payload.commit = commit;
  res.json(payload);
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
