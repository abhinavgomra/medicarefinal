const mongoose = require('mongoose');
const env = require('./env');
let MongoMemoryServer;

try {
    // Loaded dynamically so production installs can skip it
    ({ MongoMemoryServer } = require('mongodb-memory-server'));
} catch (_) {
    MongoMemoryServer = null;
}

async function connectDatabase() {
    try {
        if (env.MONGODB_URI) {
            await mongoose.connect(env.MONGODB_URI);
            console.log('MongoDB connected:', env.MONGODB_URI);
            return;
        }
        throw new Error('MONGODB_URI not provided');
    } catch (err) {
        if (!env.USE_IN_MEMORY_DB || !MongoMemoryServer) {
            console.error('MongoDB connection error:', err.message);
            throw err;
        }
        console.warn('MongoDB not available; starting in-memory database for development...');
        const mem = await MongoMemoryServer.create();
        const uri = mem.getUri('medicare');
        await mongoose.connect(uri);
        console.log('In-memory MongoDB connected');
    }
}

module.exports = connectDatabase;
