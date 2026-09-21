const app = require("../server/index");
const connectDB = require("../server/config/db");

module.exports = async (req, res) => {
    try {
        await connectDB();
    } catch (err) {
        console.error("Database connection error in serverless handler:", err);
    }
    return app(req, res);
};
