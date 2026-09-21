const Budget = require("../models/Budget");
const Transaction = require("../models/Transaction");

const getMonthRange = (month, year) => [new Date(year, month - 1, 1), new Date(year, month, 1)];

const enrich = (budgets, transactions) => {
    const categorySpentMap = {};
    let overallSpent = 0;

    for (const t of transactions) {
        if (t.type === "Expense") {
            const amt = Number(t.amount || 0);
            categorySpentMap[t.category] = (categorySpentMap[t.category] || 0) + amt;
            overallSpent += amt;
        }
    }

    return budgets.map((budget) => {
        const spent = budget.scope === "overall" ? overallSpent : (categorySpentMap[budget.category] || 0);
        const progress = budget.amount ? Math.round((spent / budget.amount) * 100) : 0;
        return {
            ...budget.toObject(),
            displayCategory: budget.scope === "overall" ? "Overall spending" : budget.category,
            spent,
            remaining: Number(budget.amount) - spent,
            progress,
            status: progress >= 100 ? "Exceeded" : progress >= 80 ? "Warning" : "Safe",
        };
    });
};

const getBudgets = async (req, res) => {
    try {
        const now = new Date();
        const month = Number(req.query.month) || now.getMonth() + 1;
        const year = Number(req.query.year) || now.getFullYear();
        const [start, end] = getMonthRange(month, year);
        const [budgets, transactions] = await Promise.all([
            Budget.find({ user: req.user.id, month, year }).sort({ scope: -1, category: 1 }),
            Transaction.find({ user: req.user.id, type: { $in: ["Income", "Expense"] }, date: { $gte: start, $lt: end } }).select("type amount category"),
        ]);
        const enriched = enrich(budgets, transactions);
        const income = transactions.filter((t) => t.type === "Income").reduce((s, t) => s + Number(t.amount), 0);
        const expense = transactions.filter((t) => t.type === "Expense").reduce((s, t) => s + Number(t.amount), 0);
        const categoryBudgets = enriched.filter((b) => b.scope !== "overall");
        const overall = enriched.find((b) => b.scope === "overall") || null;
        const totalCategoryBudget = categoryBudgets.reduce((s, b) => s + Number(b.amount), 0);
        const totalCategorySpent = categoryBudgets.reduce((s, b) => s + Number(b.spent), 0);
        res.json({
            month,
            year,
            income,
            expense,
            savings: income - expense,
            budgets: enriched,
            overall,
            totalBudget: overall ? Number(overall.amount) : totalCategoryBudget,
            totalSpent: overall ? Number(overall.spent) : totalCategorySpent,
            totalRemaining: overall ? Number(overall.remaining) : totalCategoryBudget - totalCategorySpent,
        });
    } catch (error) {
        res.status(500).json({ message: "Could not load budgets" });
    }
};

const validate = (body) => {
    const amount = Number(body.amount);
    const month = Number(body.month);
    const year = Number(body.year);
    if (!Number.isFinite(amount) || amount <= 0) return "Budget amount must be greater than 0";
    if (!Number.isInteger(month) || month < 1 || month > 12) return "Month must be between 1 and 12";
    if (!Number.isInteger(year) || year < 2000 || year > 2200) return "Year is invalid";
    return null;
};

const addBudget = async (req, res) => {
    try {
        const error = validate(req.body);
        if (error) return res.status(400).json({ message: error });
        const scope = req.body.scope === "overall" ? "overall" : "category";
        const category = scope === "overall" ? "__OVERALL__" : String(req.body.category || "").trim();
        if (scope === "category" && !category) return res.status(400).json({ message: "Category is required" });
        const duplicate = await Budget.findOne({ user: req.user.id, category, month: Number(req.body.month), year: Number(req.body.year) });
        if (duplicate) return res.status(409).json({ message: scope === "overall" ? "An overall budget already exists for this month." : "A budget already exists for this category and month." });
        const budget = await Budget.create({ user: req.user.id, category, scope, amount: Number(req.body.amount), period: "Monthly", month: Number(req.body.month), year: Number(req.body.year) });
        res.status(201).json({ message: "Budget added successfully", budget });
    } catch (error) {
        res.status(400).json({ message: error.code === 11000 ? "A matching budget already exists." : error.message });
    }
};

const updateBudget = async (req, res) => {
    try {
        const budget = await Budget.findOne({ _id: req.params.id, user: req.user.id });
        if (!budget) return res.status(404).json({ message: "Budget not found" });
        const next = {
            scope: req.body.scope || budget.scope || "category",
            category: req.body.scope === "overall" || budget.scope === "overall" ? "__OVERALL__" : String(req.body.category ?? budget.category).trim(),
            amount: req.body.amount !== undefined ? Number(req.body.amount) : budget.amount,
            month: req.body.month !== undefined ? Number(req.body.month) : budget.month,
            year: req.body.year !== undefined ? Number(req.body.year) : budget.year,
        };
        const error = validate(next);
        if (error) return res.status(400).json({ message: error });
        if (next.scope === "category" && !next.category) return res.status(400).json({ message: "Category is required" });
        const duplicate = await Budget.findOne({ _id: { $ne: budget._id }, user: req.user.id, category: next.category, month: next.month, year: next.year });
        if (duplicate) return res.status(409).json({ message: "A matching budget already exists." });
        Object.assign(budget, next);
        await budget.save();
        res.json({ message: "Budget updated successfully", budget });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteBudget = async (req, res) => {
    try {
        const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        if (!budget) return res.status(404).json({ message: "Budget not found" });
        res.json({ message: "Budget deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Could not delete budget" });
    }
};

module.exports = { getBudgets, addBudget, updateBudget, deleteBudget };
