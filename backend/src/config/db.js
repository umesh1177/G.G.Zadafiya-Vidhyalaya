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
  'mongodb+srv://hp1707697_db_user:Umesh%402005@cluster0.5ox9og7.mongodb.net/student_management_system?retryWrites=true&w=majority';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`🍃 MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error(`❌ MongoDB Connection Error: ${err.message}`);
    throw err;
  }
};

module.exports = { connectDB, mongoose };
