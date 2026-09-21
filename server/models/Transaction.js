const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null, index: true },
        type: { type: String, enum: ["Income", "Expense", "Transfer"], required: true, index: true },
        amount: { type: Number, required: true, min: 0.01 },
        category: { type: String, required: true, trim: true },
        title: { type: String, required: true, trim: true, maxlength: 160 },
        date: { type: Date, default: Date.now, index: true },
        receiptUrl: { type: String, default: "" },
        receiptFileName: { type: String, default: "" },
        sourceAccount: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
        destinationAccount: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
        note: { type: String, default: "", maxlength: 500 },
        sharedBudget: { type: mongoose.Schema.Types.ObjectId, ref: "SharedBudget", default: null, index: true },
    },
    { timestamps: true }
);

transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, category: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);
