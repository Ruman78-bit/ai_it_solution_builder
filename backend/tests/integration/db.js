/**
 * Database helper for integration tests.
 *
 * Uses MONGODB_URI_TEST if set (point it at a throwaway database - it is wiped),
 * otherwise starts an in-memory MongoDB with mongodb-memory-server. The first run
 * downloads a MongoDB binary (~100 MB) to ~/.cache/mongodb-binaries.
 */
const mongoose = require('mongoose');
const { connectDB } = require('../../src/config/db');

let memoryServer;

async function setupDB() {
  let uri = process.env.MONGODB_URI_TEST;
  if (!uri) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    try {
      memoryServer = await MongoMemoryServer.create();
    } catch (err) {
      throw new Error(
        `Could not start in-memory MongoDB (${err.message}). ` +
          'Set MONGODB_URI_TEST to a disposable database, e.g. mongodb://127.0.0.1:27017/itsb_test'
      );
    }
    uri = memoryServer.getUri('itsb_test');
  }
  await connectDB(uri);
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
}

async function clearDB() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

async function teardownDB() {
  if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}

module.exports = { setupDB, clearDB, teardownDB };
