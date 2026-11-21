/**
 * Student Service Layer
 * Executes ALL CRUD operations directly in MongoDB via Mongoose.
 */

const Student = require('../models/Student');
const XLSX = require('xlsx');

class StudentService {
  /**
   * Get all students with filtering, search, and sorting directly from MongoDB
   */
  async getStudents(filters = {}) {
    const {
      search = '',
      standard = '',
      division = '',
      streamGroup = '',
      status = 'ACTIVE',
      sortBy = 'rollNo',
      sortOrder = 'asc',
    } = filters;

    const query = {};

    if (status) query.status = status;
    if (standard) query.standard = standard;
    if (division) query.division = division;
    if (streamGroup) query.streamGroup = streamGroup;

    if (search && search.trim() !== '') {
      const q = search.trim();
      const numSearch = parseInt(q, 10);
      const orClauses = [
        { fullName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { contactNo: { $regex: q, $options: 'i' } },
      ];
      if (!isNaN(numSearch)) {
        orClauses.push({ rollNo: numSearch });
      }
      query.$or = orClauses;
    }

    const sortObj = {};
    const orderNum = sortOrder.toLowerCase() === 'desc' ? -1 : 1;

    if (sortBy === 'rollNo') {
      sortObj.rollNo = orderNum;
    } else if (sortBy === 'fullName' || sortBy === 'name') {
      sortObj.fullName = orderNum;
    } else if (sortBy === 'admissionDate') {
      sortObj.admissionDate = orderNum;
    } else {
      sortObj.rollNo = 1;
    }

    const students = await Student.find(query).sort(sortObj);
    return students;
  }

  /**
   * Get single student by MongoDB _id or rollNo
   */
  async getStudentById(id) {
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      return await Student.findById(id);
    }
    return await Student.findOne({ rollNo: Number(id) });
  }

  /**
   * Check if roll number is unique in the standard and division
   */
  async checkRollNoUnique(rollNo, standard, division, excludeId = null) {
    const num = Number(rollNo);
    const query = {
      rollNo: num,
      standard,
      division,
    };
    if (excludeId && excludeId.match(/^[0-9a-fA-F]{24}$/)) {
      query._id = { $ne: excludeId };
    }
    const existing = await Student.findOne(query);
    return !existing;
  }

  /**
   * Create student directly in MongoDB
   */
  async createStudent(data) {
    const rollNo = Number(data.rollNo);
    const standard = data.standard || 'STD_11';
    const division = data.division || 'A';

    const isUnique = await this.checkRollNoUnique(rollNo, standard, division);
    if (!isUnique) {
      throw new Error(`Roll No ${rollNo} already exists in Standard ${standard.replace('STD_', '')}-${division}.`);
    }

    const firstName = data.firstName || '';
    const middleName = data.middleName || '';
    const lastName = data.lastName || '';
    const fullName = data.fullName || [firstName, middleName, lastName].filter(Boolean).join(' ');

    const password = data.password ? String(data.password).trim() : String(rollNo);

    const newStudent = await Student.create({
      rollNo,
      firstName,
      middleName,
      lastName,
      fullName,
      password,
      standard,
      division,
      streamGroup: data.streamGroup || 'GROUP_A',
      admissionDate: data.admissionDate ? new Date(data.admissionDate) : new Date(),
      contactNo: data.contactNo,
      email: data.email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@student.edu.in`,
      status: data.status || 'ACTIVE',
      schoolName: data.schoolName || 'G.G. Zadafiya Vidhyalaya',
      attendancePercent: data.attendancePercent || 95.0,
      graduationYear: data.graduationYear ? Number(data.graduationYear) : null,
      currentPursuit: data.currentPursuit || null,
      endingDate: data.endingDate ? new Date(data.endingDate) : null,
    });

    return newStudent;
  }

  /**
   * Update student directly in MongoDB
   */
  async updateStudent(id, data) {
    let student = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      student = await Student.findById(id);
    } else {
      student = await Student.findOne({ rollNo: Number(id) });
    }

    if (!student) {
      throw new Error(`Student with ID ${id} not found in database.`);
    }

    const rollNo = data.rollNo !== undefined ? Number(data.rollNo) : student.rollNo;
    const standard = data.standard || student.standard;
    const division = data.division || student.division;

    if (rollNo !== student.rollNo || standard !== student.standard || division !== student.division) {
      const isUnique = await this.checkRollNoUnique(rollNo, standard, division, student._id.toString());
      if (!isUnique) {
        throw new Error(`Roll No ${rollNo} already exists in Standard ${standard.replace('STD_', '')}-${division}.`);
      }
    }

    const firstName = data.firstName !== undefined ? data.firstName : student.firstName;
    const middleName = data.middleName !== undefined ? data.middleName : student.middleName;
    const lastName = data.lastName !== undefined ? data.lastName : student.lastName;
    const fullName = data.fullName || [firstName, middleName, lastName].filter(Boolean).join(' ');

    student.rollNo = rollNo;
    student.firstName = firstName;
    student.middleName = middleName;
    student.lastName = lastName;
    student.fullName = fullName;
    student.standard = standard;
    student.division = division;
    if (data.streamGroup) student.streamGroup = data.streamGroup;
    if (data.contactNo !== undefined) student.contactNo = data.contactNo;
    if (data.email !== undefined) student.email = data.email;
    if (data.admissionDate) student.admissionDate = new Date(data.admissionDate);
    if (data.status) student.status = data.status;
    if (data.password !== undefined) student.password = String(data.password).trim();
    if (data.graduationYear !== undefined) student.graduationYear = data.graduationYear ? Number(data.graduationYear) : null;
    if (data.currentPursuit !== undefined) student.currentPursuit = data.currentPursuit;
    if (data.endingDate) student.endingDate = new Date(data.endingDate);

    await student.save();
    return student;
  }

  /**
   * Delete student directly from MongoDB
   */
  async deleteStudent(id) {
    let result = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      result = await Student.findByIdAndDelete(id);
    } else {
      result = await Student.findOneAndDelete({ rollNo: Number(id) });
    }

    if (!result) {
      throw new Error(`Student with ID ${id} not found.`);
    }
    return true;
  }

  /**
   * Aggregate statistics directly from MongoDB
   */
  async getStatistics() {
    const active = await Student.find({ status: 'ACTIVE' });
    const groupA = active.filter(s => s.streamGroup === 'GROUP_A').length;
    const groupB = active.filter(s => s.streamGroup === 'GROUP_B').length;
    const groupAB = active.filter(s => s.streamGroup === 'GROUP_AB').length;
    const alumni = await Student.countDocuments({ status: 'ALUMNI' });

    return {
      totalStudents: active.length,
      groupA,
      groupB,
      groupAB,
      totalAlumni: alumni,
    };
  }

  /**
   * Generate clean Excel template for bulk student import
   */
  generateTemplate() {
    const wb = XLSX.utils.book_new();

    const headers = [
      'Roll No',
      'First Name',
      'Middle Name',
      'Last Name',
      'Standard',
      'Division',
      'Stream Group',
      'Contact No',
      'Email',
      'Status',
      'Admission Date',
      'Password',
    ];

    const sampleRows = [
      {
        'Roll No': 1,
        'First Name': 'Aarav',
        'Middle Name': 'Rajeshbhai',
        'Last Name': 'Patel',
        'Standard': 'STD_11',
        'Division': 'A',
        'Stream Group': 'GROUP_A (PCM)',
        'Contact No': '9876543210',
        'Email': 'aarav.patel@student.edu.in',
        'Status': 'ACTIVE',
        'Admission Date': '2026-06-15',
        'Password': '1',
      },
      {
        'Roll No': 2,
        'First Name': 'Priya',
        'Middle Name': 'Kiritbhai',
        'Last Name': 'Shah',
        'Standard': 'STD_11',
        'Division': 'A',
        'Stream Group': 'GROUP_B (PCB)',
        'Contact No': '9825123456',
        'Email': 'priya.shah@student.edu.in',
        'Status': 'ACTIVE',
        'Admission Date': '2026-06-15',
        'Password': '2',
      },
      {
        'Roll No': 101,
        'First Name': 'Meet',
        'Middle Name': 'Pravinbhai',
        'Last Name': 'Vekariya',
        'Standard': 'STD_12',
        'Division': 'B',
        'Stream Group': 'GROUP_A (PCM)',
        'Contact No': '9712345678',
        'Email': 'meet.vekariya@student.edu.in',
        'Status': 'ACTIVE',
        'Admission Date': '2025-06-10',
        'Password': '101',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
    ws['!cols'] = [
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 10 },
      { wch: 18 },
      { wch: 15 },
      { wch: 28 },
      { wch: 10 },
      { wch: 15 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Students_Template');

    const instructions = [
      ['Column Header', 'Required / Optional', 'Allowed Formats / Values', 'Description / Guidance'],
      ['Roll No', 'REQUIRED', '1, 2, 3, 101... (numbers)', 'Unique student roll number within Standard & Division.'],
      ['First Name', 'REQUIRED', 'Aarav, Priya, Rohan...', 'Student first name.'],
      ['Middle Name', 'OPTIONAL', 'Rajeshbhai, Kiritbhai...', 'Father / guardian name.'],
      ['Last Name', 'REQUIRED', 'Patel, Shah, Mehta...', 'Student surname.'],
      ['Standard', 'REQUIRED', 'STD_11 or 11, STD_12 or 12', 'Academic standard.'],
      ['Division', 'REQUIRED', 'A, B, C, or D', 'Class division.'],
      ['Stream Group', 'REQUIRED', 'GROUP_A (PCM), GROUP_B (PCB), or GROUP_AB (PCMB)', 'Science stream group.'],
      ['Contact No', 'REQUIRED', '9876543210 (10 digits)', 'Primary parent / student contact phone.'],
      ['Email', 'OPTIONAL', 'student@ggzv.edu.in', 'Student login email address.'],
      ['Status', 'OPTIONAL', 'ACTIVE (default) or ALUMNI', 'Active or alumni student status.'],
      ['Admission Date', 'OPTIONAL', 'YYYY-MM-DD (e.g. 2026-06-15)', 'Admission date.'],
      ['Password', 'OPTIONAL', 'Default is student Roll Number', 'Student portal login password.'],
    ];
    const wsInst = XLSX.utils.aoa_to_sheet(instructions);
    wsInst['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 34 }, { wch: 55 }];
    XLSX.utils.book_append_sheet(wb, wsInst, 'Instructions');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return { buffer, fileName: 'Student_Import_Template.xlsx' };
  }

  /**
   * Bulk upload students from Excel buffer or base64
   */
  async bulkUpload(payload = {}) {
    let buffer = null;
    if (payload.fileBase64) {
      const raw = payload.fileBase64.includes(',')
        ? payload.fileBase64.split(',')[1]
        : payload.fileBase64;
      buffer = Buffer.from(raw, 'base64');
    } else if (Buffer.isBuffer(payload)) {
      buffer = payload;
    } else if (payload.buffer) {
      buffer = payload.buffer;
    }

    if (!buffer && !Array.isArray(payload.students)) {
      throw new Error('Please provide an Excel file or student records to upload.');
    }

    let rawRows = [];
    if (buffer) {
      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
      const sheetName =
        workbook.SheetNames.find((n) => !n.toLowerCase().includes('instruction')) ||
        workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } else {
      rawRows = payload.students;
    }

    if (!rawRows || rawRows.length === 0) {
      throw new Error('The uploaded Excel file contains no data rows.');
    }

    const previewOnly = Boolean(payload.previewOnly);
    const results = {
      totalRows: rawRows.length,
      createdCount: 0,
      updatedCount: 0,
      errorCount: 0,
      errors: [],
      preview: [],
      data: [],
    };

    for (let idx = 0; idx < rawRows.length; idx++) {
      const row = rawRows[idx];
      const rowNum = idx + 2;

      const getVal = (...keys) => {
        for (const k of keys) {
          for (const rowKey of Object.keys(row)) {
            if (rowKey.trim().toLowerCase() === k.toLowerCase()) {
              const v = row[rowKey];
              if (v !== undefined && v !== null && String(v).trim() !== '') {
                return String(v).trim();
              }
            }
          }
        }
        return '';
      };

      const rollNoRaw = getVal('roll no', 'rollno', 'roll number', 'roll_no', 'roll', 'નંબર', 'રોલ નંબર');
      const firstName = getVal('first name', 'firstname', 'first_name', 'name', 'નામ', 'પ્રથમ નામ');
      const middleName = getVal('middle name', 'middlename', 'middle_name', 'father name', 'પિતાનું નામ');
      const lastName = getVal('last name', 'lastname', 'last_name', 'surname', 'અટક');
      const stdRaw = getVal('standard', 'std', 'class', 'ધોરણ');
      const divRaw = getVal('division', 'div', 'section', 'વર્ગ');
      const groupRaw = getVal('stream group', 'stream', 'group', 'streamgroup', 'પ્રવાહ', 'ગ્રૂપ');
      const contactNo = getVal('contact no', 'contact', 'mobile', 'mobile no', 'phone', 'મોબાઈલ');
      const email = getVal('email', 'email id', 'mail');
      const statusRaw = getVal('status');
      const admissionDateRaw = getVal('admission date', 'date of admission', 'admission');
      const passwordRaw = getVal('password');

      if (!rollNoRaw && !firstName && !lastName && !contactNo) {
        continue;
      }

      const rowErrors = [];
      const rollNo = parseInt(rollNoRaw, 10);
      if (isNaN(rollNo) || rollNo <= 0) {
        rowErrors.push('Invalid Roll No (must be positive number)');
      }
      if (!firstName) {
        rowErrors.push('First Name is required');
      }
      if (!lastName) {
        rowErrors.push('Last Name is required');
      }

      let standard = 'STD_11';
      const stdUpper = stdRaw.toUpperCase();
      if (stdUpper.includes('12')) {
        standard = 'STD_12';
      } else if (stdUpper.includes('11')) {
        standard = 'STD_11';
      } else if (stdRaw) {
        rowErrors.push(`Unknown standard "${stdRaw}" (use STD_11 or STD_12)`);
      }

      let division = 'A';
      const divUpper = divRaw.toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(divUpper)) {
        division = divUpper;
      } else if (divRaw) {
        rowErrors.push(`Invalid division "${divRaw}" (use A, B, C, or D)`);
      }

      let streamGroup = 'GROUP_A';
      const grpUpper = groupRaw.toUpperCase();
      if (grpUpper.includes('AB') || grpUpper.includes('PCMB')) {
        streamGroup = 'GROUP_AB';
      } else if (grpUpper.includes('B') || grpUpper.includes('PCB') || grpUpper.includes('MED') || grpUpper.includes('BIO')) {
        streamGroup = 'GROUP_B';
      } else if (grpUpper.includes('A') || grpUpper.includes('PCM') || grpUpper.includes('ENG') || grpUpper.includes('JEE')) {
        streamGroup = 'GROUP_A';
      }

      if (!contactNo) {
        rowErrors.push('Contact No is required');
      }

      const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
      const status = statusRaw.toUpperCase() === 'ALUMNI' ? 'ALUMNI' : 'ACTIVE';
      const cleanEmail = email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@student.edu.in`;
      const password = passwordRaw || String(rollNo || '');

      if (rowErrors.length > 0) {
        results.errorCount++;
        results.errors.push({
          row: rowNum,
          student: fullName || `Roll ${rollNoRaw}`,
          message: rowErrors.join('; '),
        });
        continue;
      }

      const studentData = {
        rollNo,
        firstName,
        middleName,
        lastName,
        fullName,
        standard,
        division,
        streamGroup,
        contactNo,
        email: cleanEmail,
        status,
        password,
        admissionDate: admissionDateRaw ? new Date(admissionDateRaw) : new Date(),
      };

      if (previewOnly) {
        results.preview.push(studentData);
        continue;
      }

      const existing = await Student.findOne({ standard, division, rollNo });
      if (existing) {
        existing.firstName = firstName;
        existing.middleName = middleName;
        existing.lastName = lastName;
        existing.fullName = fullName;
        existing.streamGroup = streamGroup;
        existing.contactNo = contactNo;
        if (email) existing.email = email;
        existing.status = status;
        if (passwordRaw) existing.password = passwordRaw;
        if (admissionDateRaw) existing.admissionDate = new Date(admissionDateRaw);
        await existing.save();
        results.updatedCount++;
        results.data.push(existing);
      } else {
        const created = await Student.create(studentData);
        results.createdCount++;
        results.data.push(created);
      }
    }

    results.message = previewOnly
      ? `Validated ${results.preview.length} student rows (${results.errorCount} errors found).`
      : `Successfully processed ${results.createdCount + results.updatedCount} students (${results.createdCount} new, ${results.updatedCount} updated). ${results.errorCount} skipped due to errors.`;

    return results;
  }
}

module.exports = new StudentService();
