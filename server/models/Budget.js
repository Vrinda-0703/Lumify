const mongoose = require("mongoose");

const schema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: { type: String, required: true, trim: true },
    scope: { type: String, enum: ["category", "overall"], default: "category", index: true },
    amount: { type: Number, required: true, min: 0.01 },
    period: { type: String, enum: ["Monthly"], default: "Monthly" },
    month: { type: Number, required: true, min: 1, max: 12, index: true },
    year: { type: Number, required: true, min: 2000, max: 2200, index: true },
}, { timestamps: true });

schema.index({ user: 1, category: 1, month: 1, year: 1 }, { unique: true });
module.exports = mongoose.model("Budget", schema);
