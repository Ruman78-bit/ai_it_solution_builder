const mongoose = require('mongoose');

// Reject query objects that contain operators like {$gt: ""} coming from user input.
mongoose.set('sanitizeFilter', true);
mongoose.set('strictQuery', true);

async function connectDB(uri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
