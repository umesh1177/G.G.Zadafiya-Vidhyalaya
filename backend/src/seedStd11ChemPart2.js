const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Faculty = require('./models/Faculty');
const syllabusService = require('./services/syllabusService');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sms_db';

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB:', MONGODB_URI);

    // 1. Ensure & deduplicate Std 11 Chemistry (Part-1 Ch 1-6 & Part-2 Ch 7-9) for Division A & Division B
    await syllabusService.ensureStd11ChemCurriculum(['Division A', 'Division B']);
    console.log('✅ Ensured Standard 11 Chemistry (Ch 1-9) in Division A & Division B.');

    // 2. Ensure Chemistry (Board) and Chemistry (JEE) faculty exist without deleting existing data
    await Faculty.findOneAndUpdate(
      { empCode: 'FAC102' },
      {
        $set: {
          subject: 'Chemistry (Board)',
          status: 'ACTIVE',
        },
        $setOnInsert: {
          empCode: 'FAC102',
          firstName: 'Nisha',
          middleName: 'R.',
          lastName: 'Rao',
          fullName: 'Dr. Nisha R. Rao',
          role: 'Subject Faculty',
          qualification: 'Ph.D. Organic Chemistry',
          contactNo: '+91 99887 11002',
          email: 'nisha.rao@ggzv.edu.in',
          password: 'faculty123',
          joiningDate: new Date('2019-06-11'),
          experience: '6 Years',
        },
      },
      { upsert: true, new: true }
    );

    await Faculty.findOneAndUpdate(
      { empCode: 'FAC108' },
      {
        $setOnInsert: {
          empCode: 'FAC108',
          firstName: 'Harsh',
          middleName: 'D.',
          lastName: 'Patel',
          fullName: 'Prof. Harsh D. Patel',
          role: 'Subject Faculty',
          subject: 'Chemistry (JEE)',
          qualification: 'M.Sc. Chemistry (IIT), B.Ed.',
          contactNo: '+91 99887 11008',
          email: 'harsh.patel@ggzv.edu.in',
          password: 'faculty123',
          joiningDate: new Date('2021-07-01'),
          status: 'ACTIVE',
          experience: '5 Years',
        },
      },
      { upsert: true, new: true }
    );

    console.log('✅ Verified Chemistry (Board) [FAC102] and Chemistry (JEE) [FAC108] faculty accounts.');
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();

