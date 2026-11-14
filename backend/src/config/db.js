/**
 * G.G. Zadafiya Vidhyalaya - MongoDB Database Connection via Mongoose
 * Strictly connects to local development database during local execution.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('FATAL: MONGODB_URI environment variable is not defined in backend/.env');
  console.error('Please configure MONGODB_URI=mongodb://127.0.0.1:27017/GGZ');
  process.exit(1);
}

// Safety check: local environment safeguard
const isLocal =
  MONGODB_URI.includes('127.0.0.1') ||
  MONGODB_URI.includes('localhost') ||
  MONGODB_URI.startsWith('mongodb://');

if (!isLocal && process.env.NODE_ENV !== 'production') {
  console.warn('⚠️ WARNING: MONGODB_URI points to a remote database while in development mode.');
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`🍃 Connected to MongoDB: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error(`❌ MongoDB Connection Error: ${err.message}`);
    throw err;
  }
};

module.exports = { connectDB, mongoose };
