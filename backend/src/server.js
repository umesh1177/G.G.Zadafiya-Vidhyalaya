const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
require('dotenv').config();

const { connectDB } = require('./config/db');
const { sanitizeRequest, errorHandler } = require('./middleware/validateMiddleware');
const { csrfProtection } = require('./middleware/csrfMiddleware');
const syllabusService = require('./services/syllabusService');
const studentRoutes = require('./routes/studentRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const authRoutes = require('./routes/authRoutes');
const syllabusRoutes = require('./routes/syllabusRoutes');
const ltRoutes = require('./routes/ltRoutes');
const reportRoutes = require('./routes/reportRoutes');
const examRoutes = require('./routes/examRoutes');
const disciplineRoutes = require('./routes/disciplineRoutes');
const noticeRoutes = require('./routes/noticeRoutes');

// 1. Startup Environment Validation
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('FATAL: MONGODB_URI environment variable is required.');
  process.exit(1);
}

const sessionSecret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
if (isProd && !sessionSecret) {
  console.error('FATAL: SESSION_SECRET is required in production environment.');
  process.exit(1);
}

const app = express();

// Trust reverse proxy (e.g. Render, Nginx, Cloudflare) in production for secure cookies
if (isProd) {
  app.set('trust proxy', 1);
}

// Disable Express ETag 304 caching
app.set('etag', false);

// 2. Strict CORS Configuration with Explicit Origin Allowlist
const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
];
const envOrigins = (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. same-origin static requests, local scripts)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS Error: Origin "${origin}" is not allowed by policy.`));
    },
    credentials: true,
  })
);

// 3. Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (isProd) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// 4. Request Body Parsers with Rational Size Limits
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));
app.use(sanitizeRequest);

// 5. Server-Side Session Storage with MongoDB
app.use(
  session({
    name: 'ggzv_session',
    secret: sessionSecret || 'ggzv_local_dev_session_secret_2026_xyz',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGODB_URI,
      collectionName: 'sessions',
      ttl: 24 * 60 * 60, // 24 hours
      autoRemove: 'native',
      touchAfter: 3600, // Touch session only once per hour if unmodified
    }),
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    },
  })
);

// 6. Anti-CSRF Protection Middleware
app.use('/api', csrfProtection);

// Prevent caching on all API responses
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// 7. Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SMS Backend API (MongoDB Sessions)',
    timestamp: new Date().toISOString(),
  });
});

// 8. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/syllabus', syllabusRoutes);
app.use('/api/lt', ltRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/discipline', disciplineRoutes);
app.use('/api/notices', noticeRoutes);

// 9. Centralized Error Handling Middleware
app.use(errorHandler);

// 10. Serve static syllabus images
app.use('/syllabus', express.static(path.join(__dirname, '../public/syllabus')));

// 11. Serve frontend static build files in production if dist exists
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/syllabus')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// 12. Start Server with MongoDB Connection
const startServer = async () => {
  try {
    await connectDB();
    await syllabusService.ensureStd11ChemCurriculum(['Division A', 'Division B']);
    await syllabusService.ensureStd11PhysicsCurriculum(['Division A', 'Division B']);
    await syllabusService.ensureStd11MathsCurriculum(['Division A', 'Division B']);
    await syllabusService.ensureStd11BiologyCurriculum(['Division A', 'Division B']);

    app.listen(PORT, () => {
      console.log(`🚀 SMS Backend API running on http://localhost:${PORT}`);
      console.log(`🍃 Connected to MongoDB with Session Store: ${MONGODB_URI}`);
      console.log(`📡 Allowed Origins: ${allowedOrigins.join(', ')}`);
    });
  } catch (err) {
    console.error('Failed to start server due to MongoDB connection issue:', err.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
