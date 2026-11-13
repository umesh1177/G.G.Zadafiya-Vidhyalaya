const { connectDB } = require('./src/config/db');
const Faculty = require('./src/models/Faculty');

async function test() {
  await connectDB();
  const facs = await Faculty.find({}).sort({ role: 1, subject: 1 });
  console.log('Total faculties:', facs.length);
  facs.forEach(f => {
    console.log(`[${f.role}] ${f.empCode} - ${f.fullName} | Subject: "${f.subject}"`);
  });
  process.exit(0);
}
test();

