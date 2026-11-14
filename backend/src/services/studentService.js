/**
 * Student Service Layer
 * Executes ALL CRUD operations directly in MongoDB via Mongoose.
 */

const Student = require('../models/Student');

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
}

module.exports = new StudentService();
