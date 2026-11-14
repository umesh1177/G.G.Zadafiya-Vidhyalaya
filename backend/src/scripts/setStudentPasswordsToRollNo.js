/**
 * Script to update all student records in MongoDB:
 * Sets every student's password to their rollNo (as a string).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { connectDB, mongoose } = require('../config/db');
const Student = require('../models/Student');

async function setStudentPasswords() {
  try {
    await connectDB();
    console.log('Fetching all students from MongoDB...');

    const students = await Student.find();
    console.log(`Found ${students.length} student(s) in MongoDB.`);

    let updatedCount = 0;
    for (const student of students) {
      const rollPass = String(student.rollNo);
      student.password = rollPass;
      await student.save();
      console.log(`✓ Updated Student [Roll No: ${student.rollNo}] - ${student.fullName} (${student.standard}-${student.division}) -> Password set to: "${rollPass}"`);
      updatedCount++;
    }

    console.log(`\n🎉 Successfully updated password to rollNo for ${updatedCount} student(s).`);
  } catch (err) {
    console.error('Error updating student passwords:', err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  }
}

setStudentPasswords();
