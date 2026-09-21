const mongoose = require("mongoose");

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
