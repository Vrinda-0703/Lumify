const mongoose = require("mongoose");

const schema = new mongoose.Schema({
    goal: { type: mongoose.Schema.Types.ObjectId, ref: "Goal", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    date: { type: Date, default: Date.now, index: true },
    note: { type: String, default: "", maxlength: 200 },
}, { timestamps: true });

schema.index({ goal: 1, date: -1 });
module.exports = mongoose.model("GoalContribution", schema);
