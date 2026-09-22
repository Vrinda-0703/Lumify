const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });
// Also fallback to default root .env if present
dotenv.config();

const connectDB = require("./config/db");

const os = require("os");

const app = express();

// Robust CORS handling for production (Render / Railway) + frontend (Vercel)
const configuredOrigins = (process.env.CLIENT_URL || "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
            if (!origin) return callback(null, true);
            if (configuredOrigins.length === 0) return callback(null, true);
            const cleanOrigin = origin.replace(/\/+$/, "");
            if (
                configuredOrigins.includes(cleanOrigin) ||
                cleanOrigin.endsWith(".vercel.app") ||
                cleanOrigin.includes("localhost")
            ) {
                return callback(null, true);
            }
            return callback(null, true);
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "x-currency"],
    })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/uploads", express.static(path.join(os.tmpdir(), "lumify-uploads")));

app.get("/", (_, res) => res.json({ message: "Lumify API is running", status: "ok" }));
app.get("/api/health", (_, res) => res.json({ ok: true, service: "Lumify API", timestamp: new Date().toISOString() }));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/transactions", require("./routes/transactionRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/budgets", require("./routes/budgetRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/bills", require("./routes/billRoutes"));
app.use("/api/goals", require("./routes/goalRoutes"));
app.use("/api/subscriptions", require("./routes/subscriptionRoutes"));
app.use("/api/shared-budgets", require("./routes/sharedBudgetRoutes"));
app.use("/api/calendar", require("./routes/calendarRoutes"));
app.use("/api/ai", require("./routes/aiRoutes"));
app.use("/api/receipts", require("./routes/receiptRoutes"));
app.use("/api/profile", require("./routes/profileRoutes"));
app.use("/api/accounts", require("./routes/accountRoutes"));

app.use((req, res) => res.status(404).json({ message: "Route not found" }));
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || "Server error" });
});

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
    app.listen(PORT, "0.0.0.0", () => console.log(`Lumify API running on port ${PORT}`));
    try {
        await connectDB();
    } catch (error) {
        console.warn(`Warning: Initial MongoDB connection failed: ${error.message}.`);
        console.warn("Ensure MongoDB is running locally or set MONGO_URI in server/.env to your MongoDB Atlas connection string.");
    }
}

if (require.main === module) {
    const requiredEnv = ["MONGO_URI", "JWT_SECRET"];
    const missing = requiredEnv.filter((key) => !process.env[key]);
    if (missing.length) {
        console.warn(`Warning: Missing environment variable(s): ${missing.join(", ")}`);
        console.warn("Ensure server/.env or environment variables are set before accessing database routes.");
    }
    startServer();
}

module.exports = app;
