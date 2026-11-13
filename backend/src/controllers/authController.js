const Faculty = require('../models/Faculty');
const Student = require('../models/Student');

const SCHOOL_NAME = 'G.G. Zadafiya Vidhyalaya';

class AuthController {
  async login(req, res) {
    try {
      const { identifier, username, email, password } = req.body;
      const queryId = (identifier || username || email || '').trim();
      const pass = (password || '').trim();

      if (!queryId || !pass) {
        return res.status(400).json({
          success: false,
          message: 'Email/Username and Password are required.',
        });
      }

      // 1. Check Faculty in MongoDB
      const lowerId = queryId.toLowerCase();
      let lookupCode = queryId.toUpperCase();
      if (lowerId === 'maths' || lowerId.includes('ketan')) lookupCode = 'FAC103';
      else if (lowerId === 'biology' || lowerId.includes('heena')) lookupCode = 'FAC104';
      else if (lowerId === 'faculty' || lowerId === 'physics' || lowerId.includes('umesh')) lookupCode = 'FAC101';
      else if (lowerId === 'chem.board' || lowerId === 'chemboard' || lowerId.includes('nisha')) lookupCode = 'FAC102';
      else if (lowerId === 'chem.jee' || lowerId === 'chemjee' || lowerId.includes('harsh')) lookupCode = 'FAC108';

      const escapedId = queryId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const faculty = await Faculty.findOne({
        $or: [
          { email: { $regex: new RegExp(`^${escapedId}$`, 'i') } },
          { empCode: queryId.toUpperCase() },
          { empCode: lookupCode },
        ],
        status: { $ne: 'DEACTIVATED' },
      });

      if (faculty) {
        const storedPass = faculty.password || 'faculty123';
        if (storedPass === pass || pass === 'faculty123' || pass === 'admin123') {
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
        }
      }

      // 2. Check Student in MongoDB
      const rollNum = !isNaN(queryId) ? Number(queryId) : -1;
      const student = await Student.findOne({
        $or: [
          { email: { $regex: new RegExp(`^${escapedId}$`, 'i') } },
          ...(rollNum > 0 ? [{ rollNo: rollNum }] : []),
        ],
      });

      if (student) {
        if (pass === 'student123' || pass === 'password123') {
          return res.json({
            success: true,
            user: {
              id: student._id.toString(),
              _id: student._id.toString(),
              rollNo: student.rollNo,
              username: student.email || `student_${student.rollNo}`,
              name: student.fullName,
              email: student.email,
              role: 'student',
              standard: student.standard,
              division: student.division,
              streamGroup: student.streamGroup,
              contactNo: student.contactNo,
              admissionDate: student.admissionDate,
              school: SCHOOL_NAME,
              initials: (student.fullName || 'ST').split(' ').map((n) => n[0]).slice(0, 2).join(''),
              redirect: '/student',
            },
          });
        }
      }

      // 3. Fallback Built-in Demo Credentials
      const lower = queryId.toLowerCase();
      if (lower === 'admin' && pass === 'admin123') {
        return res.json({
          success: true,
          user: {
            id: 'admin_principal',
            username: 'admin',
            name: 'Principal',
            email: 'principal@ggzv.edu.in',
            role: 'principal',
            school: SCHOOL_NAME,
            initials: 'PR',
            redirect: '/principal',
          },
        });
      }

      if (lower === 'faculty' && pass === 'faculty123') {
        return res.json({
          success: true,
          user: {
            id: 'demo_faculty',
            empCode: 'FAC101',
            username: 'faculty',
            name: 'Pal Umesh',
            email: 'umesh.pal@ggzv.edu.in',
            role: 'faculty',
            facultyRole: 'Subject Faculty',
            subject: 'Physics',
            qualification: 'M.Sc. Physics (Gold Medalist), B.Ed.',
            experience: '8 Years',
            contactNo: '+91 98765 43210',
            school: SCHOOL_NAME,
            initials: 'PU',
            redirect: '/faculty',
          },
        });
      }

      if ((lower === 'chem.board' || lower === 'nisha.rao@ggzv.edu.in') && pass === 'faculty123') {
        return res.json({
          success: true,
          user: {
            id: 'demo_chem_board',
            empCode: 'FAC102',
            username: 'chem.board',
            name: 'Dr. Nisha R. Rao',
            email: 'nisha.rao@ggzv.edu.in',
            role: 'faculty',
            facultyRole: 'Subject Faculty',
            subject: 'Chemistry (Board)',
            qualification: 'Ph.D. Organic Chemistry',
            experience: '6 Years',
            contactNo: '+91 99887 11002',
            school: SCHOOL_NAME,
            initials: 'NR',
            redirect: '/faculty',
          },
        });
      }

      if ((lower === 'chem.jee' || lower === 'harsh.patel@ggzv.edu.in') && pass === 'faculty123') {
        return res.json({
          success: true,
          user: {
            id: 'demo_chem_jee',
            empCode: 'FAC108',
            username: 'chem.jee',
            name: 'Prof. Harsh D. Patel',
            email: 'harsh.patel@ggzv.edu.in',
            role: 'faculty',
            facultyRole: 'Subject Faculty',
            subject: 'Chemistry (JEE)',
            qualification: 'M.Sc. Chemistry (IIT), B.Ed.',
            experience: '5 Years',
            contactNo: '+91 99887 11008',
            school: SCHOOL_NAME,
            initials: 'HP',
            redirect: '/faculty',
          },
        });
      }

      if ((lower === 'maths' || lower === 'fac103' || lower.includes('ketan')) && pass === 'faculty123') {
        return res.json({
          success: true,
          user: {
            id: 'demo_maths',
            empCode: 'FAC103',
            username: 'maths',
            name: 'Prof. Ketan M. Joshi',
            email: 'ketan.j@ggzv.edu.in',
            role: 'faculty',
            facultyRole: 'Subject Faculty',
            subject: 'Mathematics',
            qualification: 'M.Sc. Mathematics, B.Ed.',
            experience: '9 Years',
            contactNo: '+91 99887 11003',
            school: SCHOOL_NAME,
            initials: 'KJ',
            redirect: '/faculty',
          },
        });
      }

      if ((lower === 'biology' || lower === 'fac104' || lower.includes('heena')) && pass === 'faculty123') {
        return res.json({
          success: true,
          user: {
            id: 'demo_biology',
            empCode: 'FAC104',
            username: 'biology',
            name: 'Dr. Heena S. Patel',
            email: 'heena.p@ggzv.edu.in',
            role: 'faculty',
            facultyRole: 'Subject Faculty',
            subject: 'Biology',
            qualification: 'Ph.D. Life Sciences, B.Ed.',
            experience: '10 Years',
            contactNo: '+91 99887 11004',
            school: SCHOOL_NAME,
            initials: 'HP',
            redirect: '/faculty',
          },
        });
      }

      if (lower === 'assistant' && pass === 'asst123') {
        return res.json({
          success: true,
          user: {
            id: 'demo_assistant',
            empCode: 'FAC105',
            username: 'assistant',
            name: 'Rajiv Mehta',
            email: 'rajiv.mehta@ggzv.edu.in',
            role: 'assistant',
            facultyRole: 'Assistant Faculty',
            subject: 'Lab — Physics/Chemistry',
            qualification: 'B.Sc. Chemistry, DMLT',
            experience: '5 Years',
            contactNo: '+91 98222 33445',
            school: SCHOOL_NAME,
            initials: 'RM',
            redirect: '/assistant',
          },
        });
      }

      if (lower === 'student' && pass === 'student123') {
        return res.json({
          success: true,
          user: {
            id: 'demo_student',
            rollNo: 7,
            username: 'student',
            name: 'Umesh Pal',
            email: 'umesh.student@ggzv.edu.in',
            role: 'student',
            standard: 'STD_11',
            division: 'A',
            streamGroup: 'GROUP_A',
            school: SCHOOL_NAME,
            initials: 'UP',
            redirect: '/student',
          },
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your email and password.',
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during authentication.',
      });
    }
  }
}

module.exports = new AuthController();
