const Account = require("../models/Account");
const Transaction = require("../models/Transaction");

const calculateAccount = (account, transactions) => {
    const opening = Number(account.openingBalance || 0);
    let income = 0;
    let expense = 0;
    let incomingTransfers = 0;
    let outgoingTransfers = 0;
    for (const t of transactions) {
        const amount = Number(t.amount || 0);
        if (t.type === "Income" && String(t.account) === String(account._id)) income += amount;
        if (t.type === "Expense" && String(t.account) === String(account._id)) expense += amount;
        if (t.type === "Transfer" && String(t.destinationAccount) === String(account._id)) incomingTransfers += amount;
        if (t.type === "Transfer" && String(t.sourceAccount) === String(account._id)) outgoingTransfers += amount;
    }
    return { ...account.toObject(), income, expense, incomingTransfers, outgoingTransfers, balance: opening + income - expense + incomingTransfers - outgoingTransfers };
};

const listAccounts = async (req, res) => {
    try {
        const [accounts, transactions] = await Promise.all([
            Account.find({ user: req.user.id }).sort({ createdAt: -1 }),
            Transaction.find({ user: req.user.id }).select("type amount account sourceAccount destinationAccount"),
        ]);
        res.json(accounts.map((account) => calculateAccount(account, transactions)));
    } catch (error) { res.status(500).json({ message: "Could not load accounts" }); }
};

const createAccount = async (req, res) => {
    try {
        const name = String(req.body.name || "").trim();
        if (!name) return res.status(400).json({ message: "Account name is required" });
        const account = await Account.create({ user: req.user.id, name, type: req.body.type, openingBalance: Number(req.body.openingBalance || 0), color: req.body.color, notes: req.body.notes || "" });
        res.status(201).json(account);
    } catch (error) { res.status(400).json({ message: error.message }); }
};

const updateAccount = async (req, res) => {
    try {
        const account = await Account.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { $set: { name: String(req.body.name || "").trim(), type: req.body.type, openingBalance: Number(req.body.openingBalance || 0), color: req.body.color, notes: req.body.notes || "" } }, { new: true, runValidators: true });
        if (!account) return res.status(404).json({ message: "Account not found" });
        res.json(account);
    } catch (error) { res.status(400).json({ message: error.message }); }
};

const deleteAccount = async (req, res) => {
    try {
        const account = await Account.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        if (!account) return res.status(404).json({ message: "Account not found" });
        await Transaction.updateMany({ user: req.user.id, account: account._id }, { $set: { account: null } });
        await Transaction.updateMany({ user: req.user.id, sourceAccount: account._id }, { $set: { sourceAccount: null } });
        await Transaction.updateMany({ user: req.user.id, destinationAccount: account._id }, { $set: { destinationAccount: null } });
        res.json({ message: "Account deleted" });
    } catch (error) { res.status(500).json({ message: "Could not delete account" }); }
};

const accountTransactions = async (req, res) => {
    try {
        const account = await Account.findOne({ _id: req.params.id, user: req.user.id }).select("_id");
        if (!account) return res.status(404).json({ message: "Account not found" });
        const transactions = await Transaction.find({ user: req.user.id, $or: [{ account: account._id }, { sourceAccount: account._id }, { destinationAccount: account._id }] }).sort({ date: -1 });
        res.json(transactions);
    } catch (error) { res.status(500).json({ message: "Could not load account transactions" }); }
};

module.exports = { listAccounts, createAccount, updateAccount, deleteAccount, accountTransactions };
