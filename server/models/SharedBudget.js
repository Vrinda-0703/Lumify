const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        email: { type: String, required: true, lowercase: true, trim: true },
        status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
        contribution: { type: Number, default: 0, min: 0 },
        inviteToken: { type: String, index: true },
        inviteExpires: { type: Date },
        invitedAt: { type: Date, default: Date.now },
    },
    { _id: true }
);

const schema = new mongoose.Schema(
    {
        owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        name: { type: String, required: true, trim: true, maxlength: 100 },
        amount: { type: Number, required: true, min: 0 },
        month: { type: Number, required: true, min: 1, max: 12 },
        year: { type: Number, required: true, min: 2000, max: 2200 },
        ownerContribution: { type: Number, default: 0, min: 0 },
        members: { type: [memberSchema], default: [] },
    },
    { timestamps: true }
);

schema.index({ owner: 1, month: 1, year: 1 });

module.exports = mongoose.model("SharedBudget", schema);
