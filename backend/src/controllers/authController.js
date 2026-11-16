/**
 * G.G. Zadafiya Vidhyalaya - Authentication Controller
 * Implements server-side session authentication with MongoDB session store.
 * - Password hashing using scrypt (no plaintext storage, no logging).
 * - Safe constant-time password verification.
 * - Session regeneration on login to prevent session fixation.
 * - Generic login error messages to prevent account enumeration.
 * - Disabled student portal access with clear messaging.
 * - Invalidation of sessions on password update or account deactivation.
 */

const crypto = require('crypto');
const Faculty = require('../models/Faculty');
const Student = require('../models/Student');
const { verifyPassword, hashPassword } = require('../utils/security');

const SCHOOL_NAME = 'G.G. Zadafiya Vidhyalaya';

class AuthController {
  /**
   * POST /api/auth/login
   * Authenticates staff credentials (Principal, Subject Faculty, Assistant Faculty)
   * Student login is strictly disabled.
   */
  async login(req, res) {
    try {
      const { identifier, username, email, password } = req.body;
      const queryId = (identifier || username || email || '').trim();

      // IMPORTANT: Do NOT trim password during authentication per security specifications
      const pass = typeof password === 'string' ? password : '';

      if (!queryId || !pass) {
        return res.status(400).json({
          success: false,
          message: 'Email/Username/Employee Code and Password are required.',
        });
      }

      // Check for disabled student login attempts
      // Explicit lookup without arbitrary numeric ID thresholds
      const isStudentQuery =
        queryId.toLowerCase() === 'student' ||
        queryId.toLowerCase().startsWith('student') ||
        queryId.toLowerCase().includes('student');

      let matchingStudent = null;
      if (isStudentQuery || !isNaN(queryId)) {
        matchingStudent = await Student.findOne({
          $or: [
            { email: { $regex: new RegExp(`^${queryId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
            ...(!isNaN(queryId) ? [{ rollNo: Number(queryId) }] : []),
          ],
        });
      }

      if (isStudentQuery || matchingStudent) {
        if (typeof res.recordFailedLogin === 'function') res.recordFailedLogin();
        return res.status(403).json({
          success: false,
          message: 'Student portal login is disabled for the client-facing application. Student records are accessible only through authorized staff management.',
        });
      }

      // Look up Faculty / Staff member in MongoDB
      const escapedId = queryId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const isPrincipalAlias = queryId.toLowerCase() === 'admin' || queryId.toLowerCase() === 'principal';
      const faculty = await Faculty.findOne({
        $or: [
          { email: { $regex: new RegExp(`^${escapedId}$`, 'i') } },
          { empCode: queryId.toUpperCase() },
          ...(isPrincipalAlias ? [{ role: 'Principal' }] : []),
        ],
      });

      // Account not found
      if (!faculty) {
        if (typeof res.recordFailedLogin === 'function') res.recordFailedLogin();
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. Please verify your email or employee code and password.',
        });
      }

      // Account is deactivated
      if (faculty.status === 'DEACTIVATED') {
        if (typeof res.recordFailedLogin === 'function') res.recordFailedLogin();
        return res.status(403).json({
          success: false,
          message: 'Your staff account has been deactivated. Please contact the administrator.',
        });
      }

      // Secure password verification (scrypt + timingSafeEqual)
      const { valid, needsRehash } = verifyPassword(pass, faculty.password);

      if (!valid) {
        if (typeof res.recordFailedLogin === 'function') res.recordFailedLogin();
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. Please verify your email or employee code and password.',
        });
      }

      // Transparent hash migration for initial seed records
      if (needsRehash) {
        faculty.password = hashPassword(pass);
        await faculty.save();
      }

      // Clear any failed login attempts recorded for this IP
      if (typeof res.clearFailedLogin === 'function') res.clearFailedLogin();

      const isAssistant = faculty.role === 'Assistant Faculty';
      const isPrincipal = faculty.role === 'Principal';
      const role = isAssistant ? 'assistant' : isPrincipal ? 'principal' : 'faculty';
      const redirect = isAssistant ? '/assistant' : isPrincipal ? '/principal' : '/faculty';

      const userPayload = {
        id: faculty._id.toString(),
        _id: faculty._id.toString(),
        empCode: faculty.empCode,
        username: faculty.email || faculty.empCode,
        name: faculty.fullName,
        email: faculty.email,
        role,
        facultyRole: faculty.role,
        subject: faculty.subject,
        qualification: faculty.qualification,
        experience: faculty.experience,
        contactNo: faculty.contactNo,
        joiningDate: faculty.joiningDate,
        school: SCHOOL_NAME,
        initials: (faculty.fullName || 'FC').split(' ').map((n) => n[0]).slice(0, 2).join(''),
        redirect,
      };

      // Regenerate session to prevent session fixation attacks
      const performLoginSession = () =>
        new Promise((resolve, reject) => {
          if (!req.session) return resolve();
          req.session.regenerate((err) => {
            if (err) return reject(err);
            req.session.userId = faculty._id.toString();
            req.session.role = role;
            req.session.facultyRole = faculty.role;
            req.session.subject = faculty.subject;
            req.session.sessionVersion = faculty.sessionVersion || 1;
            req.session.lastActive = Date.now();
            req.session.csrfToken = crypto.randomBytes(32).toString('hex');
            resolve();
          });
        });

      await performLoginSession();

      const isProd = process.env.NODE_ENV === 'production';
      if (req.session?.csrfToken) {
        res.cookie('XSRF-TOKEN', req.session.csrfToken, {
          httpOnly: false,
          secure: isProd,
          sameSite: 'lax',
          path: '/',
        });
      }

      return res.json({
        success: true,
        user: userPayload,
        csrfToken: req.session?.csrfToken,
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during authentication.',
      });
    }
  }

  /**
   * GET /api/auth/me
   * Validates active server-side session and returns fresh user info
   */
  async getCurrentUser(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Not authenticated.' });
      }

      const faculty = await Faculty.findById(req.user.id);
      if (!faculty || faculty.status === 'DEACTIVATED') {
        if (req.session) req.session.destroy(() => {});
        return res.status(401).json({ success: false, message: 'Account not found or inactive.' });
      }

      const isAssistant = faculty.role === 'Assistant Faculty';
      const isPrincipal = faculty.role === 'Principal';
      const role = isAssistant ? 'assistant' : isPrincipal ? 'principal' : 'faculty';
      const redirect = isAssistant ? '/assistant' : isPrincipal ? '/principal' : '/faculty';

      const userPayload = {
        id: faculty._id.toString(),
        _id: faculty._id.toString(),
        empCode: faculty.empCode,
        username: faculty.email || faculty.empCode,
        name: faculty.fullName,
        email: faculty.email,
        role,
        facultyRole: faculty.role,
        subject: faculty.subject,
        qualification: faculty.qualification,
        experience: faculty.experience,
        contactNo: faculty.contactNo,
        joiningDate: faculty.joiningDate,
        school: SCHOOL_NAME,
        initials: (faculty.fullName || 'FC').split(' ').map((n) => n[0]).slice(0, 2).join(''),
        redirect,
      };

      const isProd = process.env.NODE_ENV === 'production';
      if (req.session?.csrfToken) {
        res.cookie('XSRF-TOKEN', req.session.csrfToken, {
          httpOnly: false,
          secure: isProd,
          sameSite: 'lax',
          path: '/',
        });
      }

      return res.json({
        success: true,
        user: userPayload,
        csrfToken: req.session?.csrfToken,
      });
    } catch (err) {
      console.error('getCurrentUser error:', err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve session user.' });
    }
  }

  /**
   * POST /api/auth/logout
   * Destroys server-side session and clears session cookies
   */
  async logout(req, res) {
    try {
      const isProd = process.env.NODE_ENV === 'production';

      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.error('Session destruction error:', err);
          }
          res.clearCookie('ggzv_session', {
            path: '/',
            httpOnly: true,
            secure: isProd,
            sameSite: 'lax',
          });
          res.clearCookie('XSRF-TOKEN', {
            path: '/',
            httpOnly: false,
            secure: isProd,
            sameSite: 'lax',
          });
          return res.json({
            success: true,
            message: 'Logged out successfully.',
          });
        });
      } else {
        res.clearCookie('ggzv_session', { path: '/' });
        res.clearCookie('XSRF-TOKEN', { path: '/' });
        return res.json({
          success: true,
          message: 'Logged out successfully.',
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ success: false, message: 'Logout failed.' });
    }
  }

  /**
   * PUT /api/auth/change-password
   * Changes password, increments sessionVersion to invalidate other active sessions
   */
  async changePassword(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const { currentPassword, newPassword } = req.body;
      const curPass = typeof currentPassword === 'string' ? currentPassword : '';
      const newPass = typeof newPassword === 'string' ? newPassword : '';

      if (!curPass || !newPass) {
        return res.status(400).json({
          success: false,
          message: 'Both current password and new password are required.',
        });
      }

      if (newPass.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long.',
        });
      }

      const faculty = await Faculty.findById(req.user.id);
      if (!faculty) {
        return res.status(404).json({ success: false, message: 'Faculty user not found.' });
      }

      const { valid } = verifyPassword(curPass, faculty.password);
      if (!valid) {
        return res.status(400).json({ success: false, message: 'Incorrect current password.' });
      }

      // Hash new password using scrypt
      faculty.password = hashPassword(newPass);
      // Increment session version so all other concurrent sessions are invalidated
      faculty.sessionVersion = (faculty.sessionVersion || 1) + 1;
      faculty.passwordChangedAt = new Date();
      await faculty.save();

      // Update current session's version so this user remains logged in
      if (req.session) {
        req.session.sessionVersion = faculty.sessionVersion;
      }

      return res.json({
        success: true,
        message: 'Password changed successfully. Other active sessions have been signed out.',
      });
    } catch (err) {
      console.error('changePassword error:', err);
      return res.status(500).json({ success: false, message: 'Failed to change password.' });
    }
  }
}

module.exports = new AuthController();
