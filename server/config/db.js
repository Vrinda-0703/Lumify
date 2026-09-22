const mongoose = require("mongoose");
const dns = require("dns");

// Ensure reliable DNS resolution for mongodb+srv:// on Windows/local ISPs
try {
    dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch (_) {}

let cachedPromise = null;

async function connectDB() {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is not configured");
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
            return conn;
        }).catch((err) => {
            cachedPromise = null;
            throw err;
        });
    }

    return cachedPromise;
}

module.exports = connectDB;
