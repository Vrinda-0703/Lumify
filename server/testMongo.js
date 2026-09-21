const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/lumify";

async function test() {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });

  try {
    await client.connect();
    console.log("✅ Connected using MongoDB Driver!");
  } catch (err) {
    console.error("❌ Driver Error:", err.message);
  } finally {
    await client.close();
  }
}

test();