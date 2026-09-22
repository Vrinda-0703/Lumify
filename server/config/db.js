const mongoose = require("mongoose");
const dns = require("dns");

// Ensure reliable DNS resolution for mongodb+srv:// on Windows/local ISPs
try {
    dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch (_) {}

let cachedPromise = null;
let lastError = null;

async function connectDB() {
    if (!process.env.MONGO_URI) {
        lastError = "MONGO_URI is not configured";
        throw new Error(lastError);
    }

    // Reuse existing connection if alive
    if (mongoose.connection.readyState >= 1) {
        return mongoose.connection;
    }

    if (!cachedPromise) {
        mongoose.set("strictQuery", true);
        cachedPromise = mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
        }).then((conn) => {
            console.log("MongoDB connected");
            lastError = null;
            return conn;
        }).catch((err) => {
            cachedPromise = null;
            lastError = err.message || String(err);
            console.error("MongoDB connection error:", lastError);
            throw err;
        });
    }

    return cachedPromise;
}

const getLastError = () => lastError;

module.exports = connectDB;
module.exports.getLastError = getLastError;
