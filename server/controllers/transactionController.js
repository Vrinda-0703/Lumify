const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const Account = require("../models/Account");
const SharedBudget = require("../models/SharedBudget");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const ensureAccount = async (id, userId) => {
    if (!id || !isValidObjectId(id)) return null;
    return Account.findOne({ _id: id, user: userId });
};

const validateNormal = (body) => {
    if (!String(body.title || "").trim()) return "Title is required";
    if (!Number(body.amount) || Number(body.amount) <= 0) return "Amount must be greater than 0";
    if (!["Income", "Expense"].includes(body.type)) return "Transaction type is invalid";
    if (!String(body.category || "").trim()) return "Category is required";
    return null;
};

const addTransaction = async (req, res) => {
    try {
        const error = validateNormal(req.body);
        if (error) return res.status(400).json({ message: error });
        if (req.body.account && !(await ensureAccount(req.body.account, req.user.id))) return res.status(400).json({ message: "Invalid account" });
        if (req.body.sharedBudget) { const shared = await SharedBudget.findOne({ _id: req.body.sharedBudget, $or: [{ owner: req.user.id }, { members: { $elemMatch: { user: req.user.id, status: "accepted" } } }] }); if (!shared) return res.status(400).json({ message: "Invalid shared budget" }); }

        const transaction = await Transaction.create({
            user: req.user.id,
            title: String(req.body.title).trim(),
            amount: Number(req.body.amount),
            type: req.body.type,
            category: String(req.body.category).trim(),
            date: req.body.date || Date.now(),
            account: req.body.account || null,
            receiptUrl: req.body.receiptUrl || "",
            receiptFileName: req.body.receiptFileName || "",
            note: req.body.note || "",
            sharedBudget: req.body.sharedBudget || null,
        });
        await transaction.populate("account", "name type");
        res.status(201).json({ message: "Transaction added successfully", transaction });
    } catch (error) {
        res.status(400).json({ message: error.message || "Could not add transaction" });
    }
};

const getTransactions = async (req, res) => {
    try {
        const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
        const query = { user: req.user.id };
        if (["Income", "Expense", "Transfer"].includes(req.query.type)) query.type = req.query.type;
        if (req.query.account && isValidObjectId(req.query.account)) query.account = req.query.account;
        if (req.query.category) query.category = req.query.category;
        if (req.query.from || req.query.to) {
            query.date = {};
            if (req.query.from) query.date.$gte = new Date(req.query.from);
            if (req.query.to) {
                const end = new Date(req.query.to);
                end.setHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        }
        const sortMap = { newest: { date: -1, createdAt: -1 }, oldest: { date: 1, createdAt: 1 }, highest: { amount: -1, date: -1 }, lowest: { amount: 1, date: -1 } };
        const sort = sortMap[req.query.sort] || sortMap.newest;
        const transactions = await Transaction.find(query).sort(sort).limit(limit).populate("account", "name type").populate("sourceAccount", "name type").populate("destinationAccount", "name type");
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: "Could not load transactions" });
    }
};

const getTransactionById = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: "Transaction not found" });
        const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user.id }).populate("account", "name type");
        if (!transaction) return res.status(404).json({ message: "Transaction not found" });
        res.json(transaction);
    } catch (error) { res.status(500).json({ message: "Could not load transaction" }); }
};

const updateTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user.id });
        if (!transaction) return res.status(404).json({ message: "Transaction not found" });
        if (transaction.type === "Transfer") return res.status(400).json({ message: "Transfers are managed separately." });
        const error = validateNormal({ ...transaction.toObject(), ...req.body });
        if (error) return res.status(400).json({ message: error });
        if (req.body.account && !(await ensureAccount(req.body.account, req.user.id))) return res.status(400).json({ message: "Invalid account" });
        if (req.body.sharedBudget) { const shared = await SharedBudget.findOne({ _id: req.body.sharedBudget, $or: [{ owner: req.user.id }, { members: { $elemMatch: { user: req.user.id, status: "accepted" } } }] }); if (!shared) return res.status(400).json({ message: "Invalid shared budget" }); }
        Object.assign(transaction, {
            title: String(req.body.title).trim(), amount: Number(req.body.amount), type: req.body.type,
            category: String(req.body.category).trim(), date: req.body.date || transaction.date,
            account: req.body.account !== undefined ? (req.body.account || null) : transaction.account,
            receiptUrl: req.body.receiptUrl ?? transaction.receiptUrl,
            receiptFileName: req.body.receiptFileName ?? transaction.receiptFileName,
            note: req.body.note ?? transaction.note,
            sharedBudget: req.body.sharedBudget !== undefined ? (req.body.sharedBudget || null) : transaction.sharedBudget,
        });
        await transaction.save();
        await transaction.populate("account", "name type");
        res.json({ message: "Transaction updated successfully", transaction });
    } catch (error) { res.status(400).json({ message: error.message || "Could not update transaction" }); }
};

const deleteTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        if (!transaction) return res.status(404).json({ message: "Transaction not found" });
        res.json({ message: "Transaction deleted successfully" });
    } catch (error) { res.status(500).json({ message: "Could not delete transaction" }); }
};

const transfer = async (req, res) => {
    try {
        const { sourceAccount, destinationAccount, amount, date, note } = req.body;
        if (!sourceAccount || !destinationAccount || sourceAccount === destinationAccount) return res.status(400).json({ message: "Choose two different accounts" });
        if (!Number(amount) || Number(amount) <= 0) return res.status(400).json({ message: "Amount must be greater than 0" });
        const [source, destination] = await Promise.all([ensureAccount(sourceAccount, req.user.id), ensureAccount(destinationAccount, req.user.id)]);
        if (!source || !destination) return res.status(400).json({ message: "Invalid source or destination account" });
        const transaction = await Transaction.create({
            user: req.user.id, type: "Transfer", amount: Number(amount), title: `Transfer: ${source.name} → ${destination.name}`,
            category: "Transfer", date: date || Date.now(), account: null, sourceAccount: source._id, destinationAccount: destination._id, note: note || "",
        });
        res.status(201).json({ message: "Transfer completed", transaction });
    } catch (error) { res.status(400).json({ message: error.message || "Could not transfer funds" }); }
};

const sharedTransactions = async (req, res) => {
    try {
        const shared = await SharedBudget.findOne({ _id: req.params.id, $or: [{ owner: req.user.id }, { members: { $elemMatch: { user: req.user.id, status: "accepted" } } }] });
        if (!shared) return res.status(404).json({ message: "Shared budget not found" });
        const rows = await Transaction.find({ sharedBudget: shared._id }).sort({ date: -1 }).populate("user", "name email");
        res.json(rows);
    } catch (error) { res.status(500).json({ message: "Could not load shared transactions" }); }
};

module.exports = { addTransaction, getTransactions, getTransactionById, updateTransaction, deleteTransaction, transfer, sharedTransactions };
