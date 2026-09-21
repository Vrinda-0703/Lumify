const mongoose = require("mongoose");
require("dotenv").config();

const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/lumify";

mongoose
  .connect(uri, { serverSelectionTimeoutMS: 8000 })
  .then(() => {
    console.log("✅ Connected to MongoDB!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Connection error:", err.message);
    process.exit(1);
  });