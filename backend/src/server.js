const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { connectDB } = require('./config/db');
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
const cbtRoutes = require('./routes/cbtRoutes');
const accessRoutes = require('./routes/accessRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Disable Express ETag 304 caching and enforce no-store on API responses for immediate CRUD updates
app.set('etag', false);

// Middlewares
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'SMS Backend API (MongoDB)', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/syllabus', syllabusRoutes);
app.use('/api/lt', ltRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/discipline', disciplineRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/cbt', cbtRoutes);
app.use('/api/access', accessRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// Serve static syllabus images
app.use('/syllabus', express.static(path.join(__dirname, '../public/syllabus')));

// Serve frontend static build files in production if dist exists
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

// Start Server with MongoDB Connection
const startServer = async () => {
  try {
    const conn = await connectDB();
    if (conn) {
      try {
        await syllabusService.ensureStd11ChemCurriculum(['Division A', 'Division B']);
        await syllabusService.ensureStd11PhysicsCurriculum(['Division A', 'Division B']);
        await syllabusService.ensureStd11MathsCurriculum(['Division A', 'Division B']);
        await syllabusService.ensureStd11BiologyCurriculum(['Division A', 'Division B']);
      } catch (err) {
        console.warn('Curriculum check warning:', err.message);
      }
    }
    app.listen(PORT, () => {
      console.log(`🚀 SMS Backend API running on http://localhost:${PORT}`);
      console.log(`📡 CBT endpoints: http://localhost:${PORT}/api/cbt/exams`);
      console.log(`📡 Student endpoints: http://localhost:${PORT}/api/students`);
      console.log(`📡 Faculty endpoints: http://localhost:${PORT}/api/faculty`);
    });
  } catch (err) {
    console.error('Server startup error:', err.message);
  }
};

startServer();

module.exports = app;
