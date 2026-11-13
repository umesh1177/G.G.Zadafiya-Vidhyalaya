/**
 * Faculty Service Layer
 * Executes ALL CRUD operations directly in MongoDB via Mongoose.
 */

const Faculty = require('../models/Faculty');

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
}

module.exports = new FacultyService();
