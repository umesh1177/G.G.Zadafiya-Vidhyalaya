/**
 * MongoDB database configuration via Mongoose
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  process.env.MONGODB_URL ||
  process.env.DATABASE_URL ||
  'mongodb://127.0.0.1:27017/student_management_system';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`🍃 MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error(`❌ MongoDB Connection Error: ${err.message}`);
    console.log(`⚠️ Server running in resilient mode. Retrying MongoDB in background...`);
    setTimeout(() => {
      connectDB().catch(() => {});
    }, 20000);
    return null;
  }
};

module.exports = { connectDB, mongoose };
