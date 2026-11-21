/**
 * Faculty Service Layer
 * Executes ALL CRUD operations directly in MongoDB via Mongoose.
 */

const Faculty = require('../models/Faculty');
const XLSX = require('xlsx');

class FacultyService {
  /**
   * Get all faculty members with filters directly from MongoDB
   */
  async getFaculty(filters = {}) {
    const {
      search = '',
      subject = '',
      role = '',
      status = 'ACTIVE',
      sortBy = 'name',
      sortOrder = 'asc',
    } = filters;

    const query = {};

    if (status) query.status = status;
    if (subject) query.subject = subject;
    if (role) query.role = role;

    if (search && search.trim() !== '') {
      const q = search.trim();
      query.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { empCode: { $regex: q, $options: 'i' } },
        { subject: { $regex: q, $options: 'i' } },
      ];
    }

    const sortObj = {};
    const orderNum = sortOrder.toLowerCase() === 'desc' ? -1 : 1;

    if (sortBy === 'empCode' || sortBy === 'code') {
      sortObj.empCode = orderNum;
    } else if (sortBy === 'joiningDate' || sortBy === 'date') {
      sortObj.joiningDate = orderNum;
    } else {
      sortObj.fullName = orderNum;
    }

    const faculty = await Faculty.find(query).sort(sortObj);
    return faculty;
  }

  /**
   * Get single faculty member by ID or empCode
   */
  async getFacultyById(id) {
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      return await Faculty.findById(id);
    }
    return await Faculty.findOne({ empCode: id.toUpperCase() });
  }

  /**
   * Create new faculty member directly in MongoDB
   */
  async createFaculty(data) {
    const firstName = data.firstName || '';
    const middleName = data.middleName || '';
    const lastName = data.lastName || '';
    const fullName = data.fullName || [firstName, middleName, lastName].filter(Boolean).join(' ') || data.name;

    let empCode = data.empCode;
    if (!empCode) {
      const count = await Faculty.countDocuments();
      empCode = `FAC${100 + count + 1}`;
    }

    const newFaculty = await Faculty.create({
      empCode: empCode.toUpperCase(),
      firstName,
      middleName,
      lastName,
      fullName,
      role: data.role || 'Subject Faculty',
      subject: data.subject || 'Physics',
      qualification: data.qualification || 'M.Sc., B.Ed.',
      contactNo: data.contactNo,
      email: data.email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@ggzv.edu.in`,
      password: data.password || 'faculty123',
      joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
      status: data.status || 'ACTIVE',
      experience: data.experience || '3 Years',
    });

    return newFaculty;
  }

  /**
   * Update faculty member directly in MongoDB
   */
  async updateFaculty(id, data) {
    let faculty = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      faculty = await Faculty.findById(id);
    } else {
      faculty = await Faculty.findOne({ empCode: id.toUpperCase() });
    }

    if (!faculty) {
      throw new Error(`Faculty with ID ${id} not found in database.`);
    }

    const firstName = data.firstName !== undefined ? data.firstName : faculty.firstName;
    const middleName = data.middleName !== undefined ? data.middleName : faculty.middleName;
    const lastName = data.lastName !== undefined ? data.lastName : faculty.lastName;
    const fullName = data.fullName || [firstName, middleName, lastName].filter(Boolean).join(' ') || faculty.fullName;

    faculty.firstName = firstName;
    faculty.middleName = middleName;
    faculty.lastName = lastName;
    faculty.fullName = fullName;
    if (data.empCode) faculty.empCode = data.empCode.toUpperCase();
    if (data.role) faculty.role = data.role;
    if (data.subject) faculty.subject = data.subject;
    if (data.qualification !== undefined) faculty.qualification = data.qualification;
    if (data.contactNo !== undefined) faculty.contactNo = data.contactNo;
    if (data.email !== undefined) faculty.email = data.email;
    if (data.password) faculty.password = data.password;
    if (data.joiningDate) faculty.joiningDate = new Date(data.joiningDate);
    if (data.status) faculty.status = data.status;
    if (data.experience !== undefined) faculty.experience = data.experience;
    if (data.resignationDate) faculty.resignationDate = new Date(data.resignationDate);

    await faculty.save();
    return faculty;
  }

  /**
   * Delete faculty member directly from MongoDB
   */
  async deleteFaculty(id) {
    let result = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      result = await Faculty.findByIdAndDelete(id);
    } else {
      result = await Faculty.findOneAndDelete({ empCode: id.toUpperCase() });
    }

    if (!result) {
      throw new Error(`Faculty with ID ${id} not found.`);
    }
    return true;
  }

  /**
   * Aggregate faculty statistics directly from MongoDB
   */
  async getStatistics() {
    const active = await Faculty.find({ status: 'ACTIVE' });
    const subjectFaculty = active.filter(f => f.role === 'Subject Faculty').length;
    const assistantFaculty = active.filter(f => f.role === 'Assistant Faculty').length;
    const deactivated = await Faculty.countDocuments({ status: 'DEACTIVATED' });

    return {
      total: active.length,
      subjectFaculty,
      assistantFaculty,
      deactivated,
    };
  }

  /**
   * Generate clean Excel template for bulk faculty import
   */
  generateTemplate() {
    const wb = XLSX.utils.book_new();

    const headers = [
      'Employee Code',
      'First Name',
      'Middle Name',
      'Last Name',
      'Role',
      'Subject',
      'Qualification',
      'Contact No',
      'Email',
      'Experience',
      'Joining Date',
      'Password',
      'Status',
    ];

    const sampleRows = [
      {
        'Employee Code': 'FAC101',
        'First Name': 'Ramesh',
        'Middle Name': 'Mohanbhai',
        'Last Name': 'Shah',
        'Role': 'Subject Faculty',
        'Subject': 'Physics',
        'Qualification': 'M.Sc., B.Ed.',
        'Contact No': '9825012345',
        'Email': 'ramesh.shah@ggzv.edu.in',
        'Experience': '5 Years',
        'Joining Date': '2024-06-01',
        'Password': 'faculty123',
        'Status': 'ACTIVE',
      },
      {
        'Employee Code': 'FAC102',
        'First Name': 'Bhavna',
        'Middle Name': 'Kishorbhai',
        'Last Name': 'Patel',
        'Role': 'Assistant Faculty',
        'Subject': 'Lab — Chemistry',
        'Qualification': 'B.Sc.',
        'Contact No': '9879012345',
        'Email': 'bhavna.patel@ggzv.edu.in',
        'Experience': '3 Years',
        'Joining Date': '2025-01-10',
        'Password': 'faculty123',
        'Status': 'ACTIVE',
      },
      {
        'Employee Code': 'FAC103',
        'First Name': 'Ketan',
        'Middle Name': 'Dineshbhai',
        'Last Name': 'Mehta',
        'Role': 'Subject Faculty',
        'Subject': 'Mathematics',
        'Qualification': 'M.Sc., M.Ed.',
        'Contact No': '9898012345',
        'Email': 'ketan.mehta@ggzv.edu.in',
        'Experience': '8 Years',
        'Joining Date': '2022-07-15',
        'Password': 'faculty123',
        'Status': 'ACTIVE',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
    ws['!cols'] = [
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
      { wch: 15 },
      { wch: 28 },
      { wch: 14 },
      { wch: 15 },
      { wch: 14 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Faculty_Template');

    const instructions = [
      ['Column Header', 'Required / Optional', 'Allowed Formats / Values', 'Description / Guidance'],
      ['Employee Code', 'OPTIONAL', 'FAC101, FAC102... (or blank)', 'Unique faculty ID code. Leave blank to auto-generate.'],
      ['First Name', 'REQUIRED', 'Ramesh, Bhavna...', 'Faculty first name.'],
      ['Middle Name', 'OPTIONAL', 'Mohanbhai...', 'Father / middle name.'],
      ['Last Name', 'REQUIRED', 'Shah, Patel, Mehta...', 'Faculty surname.'],
      ['Role', 'REQUIRED', 'Subject Faculty or Assistant Faculty', 'Designation / permission role.'],
      ['Subject', 'REQUIRED', 'Physics, Chemistry, Mathematics, Biology, Lab...', 'Primary teaching department or lab stream.'],
      ['Qualification', 'OPTIONAL', 'M.Sc., B.Ed., Ph.D...', 'Highest academic qualification.'],
      ['Contact No', 'REQUIRED', '9825012345 (10 digits)', 'Primary telephone number.'],
      ['Email', 'OPTIONAL', 'name@ggzv.edu.in', 'Official login email.'],
      ['Experience', 'OPTIONAL', '3 Years, 5 Years...', 'Teaching experience.'],
      ['Joining Date', 'OPTIONAL', 'YYYY-MM-DD (e.g. 2024-06-01)', 'Date of appointment.'],
      ['Password', 'OPTIONAL', 'faculty123 (default)', 'Faculty portal login password.'],
      ['Status', 'OPTIONAL', 'ACTIVE (default) or DEACTIVATED', 'Employment status.'],
    ];
    const wsInst = XLSX.utils.aoa_to_sheet(instructions);
    wsInst['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 34 }, { wch: 55 }];
    XLSX.utils.book_append_sheet(wb, wsInst, 'Instructions');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return { buffer, fileName: 'Faculty_Import_Template.xlsx' };
  }

  /**
   * Bulk upload faculty from Excel buffer or base64
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

    if (!buffer && !Array.isArray(payload.faculty)) {
      throw new Error('Please provide an Excel file or faculty records to upload.');
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
      rawRows = payload.faculty;
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

    let maxEmpCodeNum = 100;
    if (!previewOnly) {
      try {
        const existingFaculty = await Faculty.find({});
        for (const f of existingFaculty) {
          const match = (f.empCode || '').match(/^FAC(\d+)$/i);
          if (match) {
            const n = parseInt(match[1], 10);
            if (n > maxEmpCodeNum) maxEmpCodeNum = n;
          }
        }
      } catch (err) {
        console.warn('Could not query existing faculty for max empCode:', err.message);
      }
    }

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

      let empCode = getVal('employee code', 'emp code', 'empcode', 'code', 'employee id');
      const firstName = getVal('first name', 'firstname', 'first_name', 'name');
      const middleName = getVal('middle name', 'middlename', 'middle_name');
      const lastName = getVal('last name', 'lastname', 'last_name', 'surname');
      const roleRaw = getVal('role', 'faculty role', 'designation');
      const subjectRaw = getVal('subject', 'department');
      const qualification = getVal('qualification', 'degree', 'education') || 'M.Sc., B.Ed.';
      const contactNo = getVal('contact no', 'contact', 'mobile', 'phone');
      const email = getVal('email', 'email id', 'mail');
      const experience = getVal('experience') || '3 Years';
      const joiningDateRaw = getVal('joining date', 'join date');
      const password = getVal('password') || 'faculty123';
      const statusRaw = getVal('status');

      if (!empCode && !firstName && !lastName && !contactNo) {
        continue;
      }

      const rowErrors = [];
      if (!firstName) rowErrors.push('First Name is required');
      if (!lastName) rowErrors.push('Last Name is required');
      if (!contactNo) rowErrors.push('Contact No is required');

      let role = 'Subject Faculty';
      const rUpper = roleRaw.toUpperCase();
      if (rUpper.includes('ASSISTANT')) {
        role = 'Assistant Faculty';
      } else if (rUpper.includes('PRINCIPAL')) {
        role = 'Principal';
      } else {
        role = 'Subject Faculty';
      }

      const subject = subjectRaw || (role === 'Assistant Faculty' ? 'Lab — General' : 'Physics');
      const status = statusRaw.toUpperCase() === 'DEACTIVATED' ? 'DEACTIVATED' : 'ACTIVE';
      const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
      const cleanEmail = email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@ggzv.edu.in`;

      if (rowErrors.length > 0) {
        results.errorCount++;
        results.errors.push({
          row: rowNum,
          faculty: fullName || empCode || `Row ${rowNum}`,
          message: rowErrors.join('; '),
        });
        continue;
      }

      if (!empCode) {
        maxEmpCodeNum += 1;
        empCode = `FAC${maxEmpCodeNum}`;
      } else {
        empCode = empCode.toUpperCase();
      }

      const facultyData = {
        empCode,
        firstName,
        middleName,
        lastName,
        fullName,
        role,
        subject,
        qualification,
        contactNo,
        email: cleanEmail,
        experience,
        password,
        status,
        joiningDate: joiningDateRaw ? new Date(joiningDateRaw) : new Date(),
      };

      if (previewOnly) {
        results.preview.push(facultyData);
        continue;
      }

      let existing = await Faculty.findOne({ empCode });
      if (!existing && cleanEmail) {
        existing = await Faculty.findOne({ email: cleanEmail });
      }

      if (existing) {
        existing.firstName = firstName;
        existing.middleName = middleName;
        existing.lastName = lastName;
        existing.fullName = fullName;
        existing.role = role;
        existing.subject = subject;
        existing.qualification = qualification;
        existing.contactNo = contactNo;
        if (email) existing.email = email;
        existing.experience = experience;
        if (password) existing.password = password;
        existing.status = status;
        if (joiningDateRaw) existing.joiningDate = new Date(joiningDateRaw);
        await existing.save();
        results.updatedCount++;
        results.data.push(existing);
      } else {
        const created = await Faculty.create(facultyData);
        results.createdCount++;
        results.data.push(created);
      }
    }

    results.message = previewOnly
      ? `Validated ${results.preview.length} faculty rows (${results.errorCount} errors found).`
      : `Successfully processed ${results.createdCount + results.updatedCount} faculty members (${results.createdCount} new, ${results.updatedCount} updated). ${results.errorCount} skipped due to errors.`;

    return results;
  }
}

module.exports = new FacultyService();
