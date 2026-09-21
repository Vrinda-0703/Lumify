const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 80,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        },
        password: {
            type: String,
            required: true,
            select: false,
        },
        preferences: {
            currency: {
                type: String,
                default: "INR",
                trim: true,
            },
            theme: {
                type: String,
                enum: ["light", "dark"],
                default: "light",
            },
            notifications: {
                billReminders: { type: Boolean, default: true },
                budgetAlerts: { type: Boolean, default: true },
                weeklyDigest: { type: Boolean, default: false },
                largeExpenses: { type: Boolean, default: true },
            },
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
