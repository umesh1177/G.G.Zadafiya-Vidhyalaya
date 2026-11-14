const Faculty = require('../models/Faculty');
const Student = require('../models/Student');
const { verifyPassword, hashPassword, createAuthToken } = require('../utils/security');

const SCHOOL_NAME = 'G.G. Zadafiya Vidhyalaya';

class AuthController {
  /**
   * POST /api/auth/login
   * Authenticates staff credentials (Principal, Subject Faculty, Assistant Faculty)
   * Student login is strictly disabled for the client-facing application.
   */
  async login(req, res) {
    try {
      const { identifier, username, email, password } = req.body;
      const queryId = (identifier || username || email || '').trim();
      const pass = (password || '').trim();

      if (!queryId || !pass) {
        return res.status(400).json({
          success: false,
          message: 'Email/Username/Employee Code and Password are required.',
        });
      }

      // Check for disabled student login attempts first to prevent unauthorized access
      const isStudentQuery =
        queryId.toLowerCase() === 'student' ||
        queryId.toLowerCase().includes('student') ||
        (!isNaN(queryId) && Number(queryId) > 0 && Number(queryId) < 1000);

      if (isStudentQuery) {
        const student = await Student.findOne({
          $or: [
            { email: { $regex: new RegExp(`^${queryId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
            ...(!isNaN(queryId) ? [{ rollNo: Number(queryId) }] : []),
          ],
        });
        if (student) {
          return res.status(403).json({
            success: false,
            message: 'Student portal login is disabled for the client-facing application. Student records are accessible only through authorized staff management.',
          });
        }
      }

      // 1. Look up Faculty/Staff member in MongoDB
      const escapedId = queryId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const faculty = await Faculty.findOne({
        $or: [
          { email: { $regex: new RegExp(`^${escapedId}$`, 'i') } },
          { empCode: queryId.toUpperCase() },
        ],
        status: { $ne: 'DEACTIVATED' },
      });

      if (faculty) {
        // Secure verification (constant-time + supports transparent migration of initial plain passwords)
        const { valid, needsRehash } = verifyPassword(pass, faculty.password);

        if (valid) {
          // Transparent migration: if stored password was plain, safely hash it now
          if (needsRehash) {
            faculty.password = hashPassword(pass);
            await faculty.save();
          }

          const isAssistant = faculty.role === 'Assistant Faculty';
          const isPrincipal = faculty.role === 'Principal';
          const role = isAssistant ? 'assistant' : isPrincipal ? 'principal' : 'faculty';
          const redirect = isAssistant ? '/assistant' : isPrincipal ? '/principal' : '/faculty';

          // Construct user response payload (password never included)
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

          // Issue cryptographically signed token
          const token = createAuthToken({
            id: faculty._id.toString(),
            empCode: faculty.empCode,
            role,
            subject: faculty.subject,
          });

          return res.json({
            success: true,
            token,
            user: userPayload,
          });
        }
      }

      // If credentials do not match any active staff account, reject cleanly
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your email / employee code and password.',
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
   * Validates active session token and returns fresh user info
   */
  async getCurrentUser(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Not authenticated.' });
      }

      const faculty = await Faculty.findById(req.user.id);
      if (!faculty || faculty.status === 'DEACTIVATED') {
        return res.status(401).json({ success: false, message: 'Account not found or inactive.' });
      }

      const isAssistant = faculty.role === 'Assistant Faculty';
      const isPrincipal = faculty.role === 'Principal';
      const role = isAssistant ? 'assistant' : isPrincipal ? 'principal' : 'faculty';
      const redirect = isAssistant ? '/assistant' : isPrincipal ? '/principal' : '/faculty';

      return res.json({
        success: true,
        user: {
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
        },
      });
    } catch (err) {
      console.error('getCurrentUser error:', err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve session user.' });
    }
  }

  /**
   * POST /api/auth/logout
   */
  async logout(req, res) {
    return res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  }

  /**
   * PUT /api/auth/change-password
   */
  async changePassword(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Both current password and new password are required.',
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long.',
        });
      }

      const faculty = await Faculty.findById(req.user.id);
      if (!faculty) {
        return res.status(404).json({ success: false, message: 'Faculty user not found.' });
      }

      const { valid } = verifyPassword(currentPassword, faculty.password);
      if (!valid) {
        return res.status(400).json({ success: false, message: 'Incorrect current password.' });
      }

      faculty.password = hashPassword(newPassword);
      await faculty.save();

      return res.json({
        success: true,
        message: 'Password changed successfully.',
      });
    } catch (err) {
      console.error('changePassword error:', err);
      return res.status(500).json({ success: false, message: 'Failed to change password.' });
    }
  }
}

module.exports = new AuthController();
