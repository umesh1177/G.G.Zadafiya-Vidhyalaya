const express = require('express');
const path = require('path');
const session = require('express-session');

// ─── Data ───────────────────────────────────────────────────────────────
const principalData  = require('./data/principal');
const facultyData    = require('./data/faculty');
const assistantData  = require('./data/assistant');
const studentData    = require('./data/student');

// ─── Credentials ────────────────────────────────────────────────────────
const CREDENTIALS = {
  admin:     { password: 'admin123',    role: 'principal',  redirect: '/principal/' },
  faculty:   { password: 'faculty123',  role: 'faculty',    redirect: '/faculty/' },
  assistant: { password: 'asst123',     role: 'assistant',  redirect: '/assistant/' },
  student:   { password: 'student123',  role: 'student',    redirect: '/student/' },
};

const app = express();

// ─── Session ────────────────────────────────────────────────────────────
app.use(session({
  secret: 'svvs-combined-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 }, // 8 hours
}));

// ─── Body parser ────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ─── Auth middleware ─────────────────────────────────────────────────────
function requireAuth(role) {
  return (req, res, next) => {
    if (req.session && req.session.role === role) return next();
    res.redirect('/login?error=Please+log+in+first');
  };
}

// ─── Static assets — each dashboard served under its prefix ─────────────
// These must come BEFORE the route groups so /principal/css/... works
app.use('/principal', express.static(path.join(__dirname, 'public', 'principal')));
app.use('/faculty',   express.static(path.join(__dirname, 'public', 'faculty')));
app.use('/assistant', express.static(path.join(__dirname, 'public', 'assistant')));
app.use('/student',   express.static(path.join(__dirname, 'public', 'student')));

// ─── EJS helpers — render from a specific views subfolder ───────────────
function makeRender(subfolder) {
  return function(res, template, locals) {
    const viewsDir = path.join(__dirname, 'views', subfolder, 'pages');
    res.render(path.join(viewsDir, template + '.ejs'), locals);
  };
}

// ─── Login page ──────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  if (req.session && req.session.role) {
    return res.redirect(CREDENTIALS[
      Object.keys(CREDENTIALS).find(k => CREDENTIALS[k].role === req.session.role)
    ]?.redirect || '/login');
  }
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  if (req.session && req.session.role) {
    const cred = Object.values(CREDENTIALS).find(c => c.role === req.session.role);
    return res.redirect(cred ? cred.redirect : '/login');
  }
  res.render(path.join(__dirname, 'views', 'login.ejs'), {
    error: req.query.error || null
  });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const cred = CREDENTIALS[username];
  if (cred && cred.password === password) {
    req.session.role = cred.role;
    req.session.username = username;
    return res.redirect(cred.redirect);
  }
  res.redirect('/login?error=Invalid+username+or+password');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  PRINCIPAL DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
const principalRouter = express.Router();

principalRouter.use((req, res, next) => {
  res.locals.data = principalData;
  next();
});

const renderPrincipal = (res, template, extra) => {
  const viewsDir = path.join(__dirname, 'views', 'principal', 'pages');
  res.render(path.join(viewsDir, template + '.ejs'), extra || {});
};

principalRouter.get('/', (req, res) => renderPrincipal(res, 'home'));
principalRouter.get('/student-management', (req, res) => renderPrincipal(res, 'student-management'));
principalRouter.get('/faculty-management', (req, res) => renderPrincipal(res, 'faculty-management'));
principalRouter.get('/faculty-management/new', (req, res) => renderPrincipal(res, 'faculty-new'));
principalRouter.get('/profile', (req, res) => renderPrincipal(res, 'profile'));
principalRouter.get('/exam-analysis', (req, res) => renderPrincipal(res, 'exam-analysis'));
principalRouter.get('/exam-analysis/:id', (req, res) => {
  const exam = principalData.examAnalysisDetail[req.params.id] || principalData.examAnalysisDetail[101];
  renderPrincipal(res, 'exam-analysis-detail', { exam });
});
principalRouter.get('/lt-analysis', (req, res) => renderPrincipal(res, 'lt-analysis'));
principalRouter.get('/lt-analysis/:id', (req, res) => {
  const lt = principalData.ltAnalysisDetail[req.params.id] || principalData.ltAnalysisDetail[1];
  renderPrincipal(res, 'lt-analysis-detail', { lt });
});
principalRouter.get('/syllabus-tracking', (req, res) => renderPrincipal(res, 'syllabus-tracking'));
principalRouter.get('/progress-report', (req, res) => renderPrincipal(res, 'progress-report'));
principalRouter.get('/discipline-remark', (req, res) => renderPrincipal(res, 'discipline-remark'));
principalRouter.get('/notice-message', (req, res) => renderPrincipal(res, 'notice-message'));
principalRouter.get('/logout', (req, res) => { req.session.destroy(() => res.redirect('/login')); });
principalRouter.get('/assistant', (req, res) => renderPrincipal(res, 'assistant-faculty'));
principalRouter.get('/faculty-dashboard', (req, res) => renderPrincipal(res, 'faculty-dashboard'));

app.use('/principal', requireAuth('principal'), principalRouter);

// ═══════════════════════════════════════════════════════════════════════════
//  FACULTY DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
const facultyRouter = express.Router();

facultyRouter.use((req, res, next) => {
  res.locals.data = facultyData;
  next();
});

const renderFaculty = (res, template, extra) => {
  const viewsDir = path.join(__dirname, 'views', 'faculty', 'pages');
  res.render(path.join(viewsDir, template + '.ejs'), extra || {});
};

facultyRouter.get('/', (req, res) => renderFaculty(res, 'home'));
facultyRouter.get('/set-lt', (req, res) => renderFaculty(res, 'set-lt'));
facultyRouter.get('/exam-unit', (req, res) => renderFaculty(res, 'exam-unit'));
facultyRouter.get('/syllabus', (req, res) => renderFaculty(res, 'syllabus'));
facultyRouter.get('/notice', (req, res) => renderFaculty(res, 'notice'));
facultyRouter.get('/profile', (req, res) => renderFaculty(res, 'profile'));
facultyRouter.get('/logout', (req, res) => { req.session.destroy(() => res.redirect('/login')); });

app.use('/faculty', requireAuth('faculty'), facultyRouter);

// ═══════════════════════════════════════════════════════════════════════════
//  ASSISTANT FACULTY DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
const assistantRouter = express.Router();

assistantRouter.use((req, res, next) => {
  res.locals.data = assistantData;
  next();
});

const renderAssistant = (res, template, extra) => {
  const viewsDir = path.join(__dirname, 'views', 'assistant', 'pages');
  res.render(path.join(viewsDir, template + '.ejs'), extra || {});
};

assistantRouter.get('/', (req, res) => renderAssistant(res, 'home'));
assistantRouter.get('/lt', (req, res) => renderAssistant(res, 'lt'));
assistantRouter.get('/lt/history/:id', (req, res) => renderAssistant(res, 'lt-history-detail', { ltId: parseInt(req.params.id) }));
assistantRouter.get('/lt/enter-marks/:id', (req, res) => renderAssistant(res, 'lt-enter-marks', { ltId: parseInt(req.params.id) }));
assistantRouter.get('/exam', (req, res) => renderAssistant(res, 'exam'));
assistantRouter.get('/exam/enter-marks/:id', (req, res) => renderAssistant(res, 'exam-enter-marks', { examId: parseInt(req.params.id) }));
assistantRouter.get('/exam/view-marks/:id', (req, res) => renderAssistant(res, 'exam-view-marks', { examId: parseInt(req.params.id) }));
assistantRouter.get('/result', (req, res) => renderAssistant(res, 'result'));
assistantRouter.get('/hall-ticket', (req, res) => renderAssistant(res, 'hall-ticket'));
assistantRouter.get('/notice', (req, res) => renderAssistant(res, 'notice'));
assistantRouter.get('/discipline-remark', (req, res) => renderAssistant(res, 'discipline-remark'));
assistantRouter.get('/logout', (req, res) => { req.session.destroy(() => res.redirect('/login')); });

app.use('/assistant', requireAuth('assistant'), assistantRouter);

// ═══════════════════════════════════════════════════════════════════════════
//  STUDENT / PARENT DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
const studentRouter = express.Router();

studentRouter.use((req, res, next) => {
  res.locals.data = studentData;
  next();
});

const renderStudent = (res, template, extra) => {
  const viewsDir = path.join(__dirname, 'views', 'student', 'pages');
  res.render(path.join(viewsDir, template + '.ejs'), extra || {});
};

studentRouter.get('/', (req, res) => renderStudent(res, 'home'));
studentRouter.get('/lt-analysis', (req, res) => renderStudent(res, 'lt-analysis'));
studentRouter.get('/progress-report', (req, res) => renderStudent(res, 'progress-report'));
studentRouter.get('/exam-result', (req, res) => renderStudent(res, 'exam-result'));
studentRouter.get('/result', (req, res) => renderStudent(res, 'result'));
studentRouter.get('/hall-ticket', (req, res) => renderStudent(res, 'hall-ticket'));
studentRouter.get('/notice-message', (req, res) => renderStudent(res, 'notice-message'));
studentRouter.get('/discipline-remark', (req, res) => renderStudent(res, 'discipline-remark'));
studentRouter.get('/logout', (req, res) => { req.session.destroy(() => res.redirect('/login')); });

app.use('/student', requireAuth('student'), studentRouter);

// ─── Start ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n╔═══════════════════════════════════════════════╗`);
  console.log(`║  Combined Dashboard running on port ${PORT}     ║`);
  console.log(`╠═══════════════════════════════════════════════╣`);
  console.log(`║  http://localhost:${PORT}                        ║`);
  console.log(`╠═══════════════════════════════════════════════╣`);
  console.log(`║  Credentials:                                 ║`);
  console.log(`║  admin     / admin123    → Principal          ║`);
  console.log(`║  faculty   / faculty123  → Subject Faculty    ║`);
  console.log(`║  assistant / asst123     → Asst. Faculty      ║`);
  console.log(`║  student   / student123  → Student/Parent     ║`);
  console.log(`╚═══════════════════════════════════════════════╝\n`);
});
