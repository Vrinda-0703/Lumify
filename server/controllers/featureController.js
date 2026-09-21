const mongoose = require("mongoose");
const crypto = require("crypto");
const Transaction = require("../models/Transaction");
const Bill = require("../models/Bill");
const Goal = require("../models/Goal");
const GoalContribution = require("../models/GoalContribution");
const Subscription = require("../models/Subscription");
const SharedBudget = require("../models/SharedBudget");
const User = require("../models/user");
const Category = require("../models/Category");
const Budget = require("../models/Budget");
const Account = require("../models/Account");
const emailService = require("../services/emailService");
const { getCurrency } = require("../utils/currency");

const nextRecurringDate = (date, frequency) => {
    const d = new Date(date);
    if (frequency === "Weekly") d.setDate(d.getDate() + 7);
    else if (frequency === "Monthly") d.setMonth(d.getMonth() + 1);
    else if (frequency === "Yearly") d.setFullYear(d.getFullYear() + 1);
    return d;
};

const nextSubscriptionDate = (date, cycle) => {
    const d = new Date(date);
    if (cycle === "Weekly") d.setDate(d.getDate() + 7);
    else if (cycle === "Monthly") d.setMonth(d.getMonth() + 1);
    else if (cycle === "Quarterly") d.setMonth(d.getMonth() + 3);
    else if (cycle === "Yearly") d.setFullYear(d.getFullYear() + 1);
    return d;
};

const own = (Model, field = "user") => ({
    list: async (req, res) => {
        try {
            res.json(await Model.find({ [field]: req.user.id }).sort({ createdAt: -1 }));
        } catch (e) { res.status(500).json({ message: e.message }); }
    },
    get: async (req, res) => {
        try {
            const item = await Model.findOne({ _id: req.params.id, [field]: req.user.id });
            if (!item) return res.status(404).json({ message: "Not found" });
            res.json(item);
        } catch (e) { res.status(404).json({ message: "Not found" }); }
    },
    create: async (req, res) => {
        try {
            const item = await Model.create({ ...req.body, [field]: req.user.id });
            res.status(201).json(item);
        } catch (e) { res.status(400).json({ message: e.message }); }
    },
    update: async (req, res) => {
        try {
            const item = await Model.findOneAndUpdate(
                { _id: req.params.id, [field]: req.user.id },
                { $set: req.body },
                { new: true, runValidators: true }
            );
            if (!item) return res.status(404).json({ message: "Not found" });
            res.json(item);
        } catch (e) { res.status(400).json({ message: e.message }); }
    },
    remove: async (req, res) => {
        try {
            const item = await Model.findOneAndDelete({ _id: req.params.id, [field]: req.user.id });
            if (!item) return res.status(404).json({ message: "Not found" });
            res.json({ message: "Deleted" });
        } catch (e) { res.status(500).json({ message: e.message }); }
    },
});

const categories = {
    ...own(Category),
    create: async (req, res) => {
        try {
            const name = String(req.body.name || "").trim();
            const type = req.body.type;
            if (!name || !["Income", "Expense"].includes(type)) return res.status(400).json({ message: "Category name and type are required" });
            const item = await Category.create({ name, type, user: req.user.id });
            res.status(201).json(item);
        } catch (e) { res.status(400).json({ message: e.code === 11000 ? "Category already exists" : e.message }); }
    },
};

const goal = {
    ...own(Goal),
    list: async (req, res) => {
        try {
            const goals = await Goal.find({ user: req.user.id }).sort({ createdAt: -1 });
            const ids = goals.map((g) => g._id);
            const contributions = await GoalContribution.find({ user: req.user.id, goal: { $in: ids } }).sort({ date: -1 });
            res.json(goals.map((g) => ({ ...g.toObject(), contributions: contributions.filter((c) => String(c.goal) === String(g._id)) })));
        } catch (e) { res.status(500).json({ message: e.message }); }
    },
    create: async (req, res) => {
        try {
            const targetAmount = Number(req.body.targetAmount);
            const savedAmount = Number(req.body.savedAmount || 0);
            if (!String(req.body.name || "").trim() || !Number.isFinite(targetAmount) || targetAmount <= 0) return res.status(400).json({ message: "Goal name and target amount are required" });
            if (savedAmount < 0 || savedAmount > targetAmount) return res.status(400).json({ message: "Saved amount is invalid" });
            const item = await Goal.create({ user: req.user.id, name: String(req.body.name).trim(), targetAmount, savedAmount, targetDate: req.body.targetDate || null, description: req.body.description || "" });
            if (savedAmount > 0) await GoalContribution.create({ goal: item._id, user: req.user.id, amount: savedAmount, date: req.body.initialContributionDate || Date.now(), note: "Initial saved amount" });
            const contributions = await GoalContribution.find({ goal: item._id, user: req.user.id }).sort({ date: -1 });
            res.status(201).json({ ...item.toObject(), contributions });
        } catch (e) { res.status(400).json({ message: e.message }); }
    },
};

const contribute = async (req, res) => {
    try {
        const { format: fmt } = getCurrency(req);
        const amount = Number(req.body.amount);
        if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: "Enter a valid contribution" });
        const g = await Goal.findOne({ _id: req.params.id, user: req.user.id });
        if (!g) return res.status(404).json({ message: "Goal not found" });
        const remaining = Math.max(0, Number(g.targetAmount) - Number(g.savedAmount));
        if (amount > remaining) return res.status(400).json({ message: `Contribution exceeds the remaining goal amount of ${fmt(remaining)}.` });
        g.savedAmount += amount;
        await g.save();
        await GoalContribution.create({ goal: g._id, user: req.user.id, amount, date: req.body.date || Date.now(), note: req.body.note || "" });
        const contributions = await GoalContribution.find({ goal: g._id, user: req.user.id }).sort({ date: -1 });
        res.json({ ...g.toObject(), contributions });
    } catch (e) { res.status(400).json({ message: e.message }); }
};

const bills = {
    list: async (req, res) => {
        try {
            const billList = await Bill.find({ user: req.user.id }).sort({ dueDate: 1, createdAt: -1 });
            res.json(billList);
        } catch (e) { res.status(500).json({ message: e.message }); }
    },
    get: async (req, res) => {
        try {
            const bill = await Bill.findOne({ _id: req.params.id, user: req.user.id });
            if (!bill) return res.status(404).json({ message: "Bill not found" });
            res.json(bill);
        } catch (e) { res.status(404).json({ message: "Bill not found" }); }
    },
    create: async (req, res) => {
        try {
            const item = await Bill.create({ ...req.body, user: req.user.id });
            res.status(201).json(item);
        } catch (e) { res.status(400).json({ message: e.message }); }
    },
    update: async (req, res) => {
        try {
            const bill = await Bill.findOne({ _id: req.params.id, user: req.user.id });
            if (!bill) return res.status(404).json({ message: "Bill not found" });
            const wasPaid = bill.paid;
            Object.assign(bill, req.body);
            await bill.save();
            if (!wasPaid && bill.paid && bill.recurring && bill.frequency && bill.frequency !== "None") {
                const nextDate = nextRecurringDate(bill.dueDate, bill.frequency);
                const exists = await Bill.findOne({ user: req.user.id, title: bill.title, dueDate: nextDate });
                if (!exists) {
                    await Bill.create({
                        user: req.user.id,
                        title: bill.title,
                        amount: bill.amount,
                        dueDate: nextDate,
                        recurring: true,
                        frequency: bill.frequency,
                        notes: bill.notes,
                        paid: false,
                    });
                }
            }
            res.json(bill);
        } catch (e) { res.status(400).json({ message: e.message }); }
    },
    remove: async (req, res) => {
        try {
            const bill = await Bill.findOneAndDelete({ _id: req.params.id, user: req.user.id });
            if (!bill) return res.status(404).json({ message: "Bill not found" });
            res.json({ message: "Bill deleted" });
        } catch (e) { res.status(500).json({ message: e.message }); }
    },
};

const subscriptions = {
    ...own(Subscription),
    list: async (req, res) => {
        try {
            const rows = await Subscription.find({ user: req.user.id }).sort({ nextBillingDate: 1 });
            const now = new Date();
            for (const row of rows) {
                if (row.active && row.nextBillingDate && row.nextBillingDate < now) {
                    let next = new Date(row.nextBillingDate);
                    while (next < now) next = nextSubscriptionDate(next, row.billingCycle);
                    row.nextBillingDate = next;
                    await row.save();
                }
            }
            res.json(rows);
        } catch (e) { res.status(500).json({ message: e.message }); }
    },
};

const shared = {
    list: async (req, res) => {
        try {
            const userEmail = (req.user.email || "").trim().toLowerCase();
            const query = {
                $or: [
                    { owner: req.user.id },
                    { "members.user": req.user.id },
                    ...(userEmail ? [{ "members.email": userEmail }] : []),
                ],
            };
            const budgets = await SharedBudget.find(query)
                .populate("owner", "name email")
                .populate("members.user", "name email")
                .sort({ createdAt: -1 });

            // Automatically attach user ID to pending invitation matching user's registered email
            for (const b of budgets) {
                let updated = false;
                for (const m of b.members) {
                    if (userEmail && m.email && m.email.toLowerCase() === userEmail && !m.user) {
                        m.user = req.user.id;
                        updated = true;
                    }
                }
                if (updated) await b.save();
            }

            const ids = budgets.map((b) => b._id);
            const tx = await Transaction.find({ sharedBudget: { $in: ids } }).populate("user", "name email").sort({ date: -1 });
            res.json(budgets.map((b) => {
                const rows = tx.filter((t) => String(t.sharedBudget) === String(b._id));
                const spent = rows.filter((t) => t.type === "Expense").reduce((s, t) => s + Number(t.amount || 0), 0);
                const contributed = Number(b.ownerContribution || 0) + (b.members || []).reduce((s, m) => s + Number(m.contribution || 0), 0);
                return {
                    ...b.toObject(),
                    ownerContribution: Number(b.ownerContribution || 0),
                    sharedSpending: spent,
                    remaining: Number(b.amount || 0) - spent,
                    totalContributed: contributed,
                    poolBalance: contributed - spent,
                    sharedTransactions: rows,
                };
            }));
        } catch (e) { res.status(500).json({ message: e.message }); }
    },
    create: async (req, res) => {
        try {
            const name = String(req.body.name || "").trim();
            const amount = Number(req.body.amount);
            const month = Number(req.body.month);
            const year = Number(req.body.year);
            if (!name || !Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: "Name and a positive amount are required" });
            const budget = await SharedBudget.create({ name, amount, month, year, owner: req.user.id, ownerContribution: 0, members: [] });
            await budget.populate("owner", "name email");
            res.status(201).json(budget);
        } catch (e) { res.status(400).json({ message: e.message }); }
    },
    update: async (req, res) => {
        try {
            const budget = await SharedBudget.findOne({ _id: req.params.id, owner: req.user.id });
            if (!budget) return res.status(404).json({ message: "Shared budget not found or you are not the owner" });
            if (req.body.name) budget.name = String(req.body.name).trim();
            if (req.body.amount && Number(req.body.amount) > 0) budget.amount = Number(req.body.amount);
            if (req.body.month) budget.month = Number(req.body.month);
            if (req.body.year) budget.year = Number(req.body.year);
            await budget.save();
            await budget.populate("owner", "name email");
            await budget.populate("members.user", "name email");
            res.json(budget);
        } catch (e) { res.status(400).json({ message: e.message }); }
    },
    invite: async (req, res) => {
        try {
            const email = String(req.body.email || "").trim().toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return res.status(400).json({ message: "Please provide a valid email address" });
            }
            const budget = await SharedBudget.findOne({ _id: req.params.id, owner: req.user.id });
            if (!budget) return res.status(404).json({ message: "Shared budget not found or you are not authorized to invite members to this budget." });

            const inviterEmail = (req.user.email || "").trim().toLowerCase();
            if (email === inviterEmail) {
                return res.status(400).json({ message: "You cannot invite yourself to your own shared budget" });
            }

            const recipient = await User.findOne({ email }).select("_id email name");
            if (recipient && String(recipient._id) === String(req.user.id)) {
                return res.status(400).json({ message: "You are already the owner of this budget" });
            }

            // Cryptographic token and 7-day expiration
            const inviteToken = crypto.randomBytes(32).toString("hex");
            const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

            // Check if member already exists
            const existingMember = (budget.members || []).find((m) => {
                const matchUser = recipient && m.user && String(m.user) === String(recipient._id);
                const matchEmail = m.email && m.email.toLowerCase() === email;
                return matchUser || matchEmail;
            });

            if (existingMember) {
                if (existingMember.status === "accepted") {
                    return res.status(400).json({ message: "This user is already an active member of this budget" });
                }
                const isExpired = existingMember.inviteExpires && new Date(existingMember.inviteExpires) < new Date();
                if (existingMember.status === "pending" && !isExpired) {
                    return res.status(400).json({ message: "An invitation is already pending for this email address" });
                }
                // If declined or expired, refresh invitation token and expiry
                existingMember.status = "pending";
                existingMember.inviteToken = inviteToken;
                existingMember.inviteExpires = inviteExpires;
                existingMember.invitedAt = new Date();
                if (recipient) existingMember.user = recipient._id;
            } else {
                budget.members.push({
                    user: recipient ? recipient._id : null,
                    email,
                    status: "pending",
                    contribution: 0,
                    inviteToken,
                    inviteExpires,
                    invitedAt: new Date(),
                });
            }

            await budget.save();
            await budget.populate("owner", "name email");
            await budget.populate("members.user", "name email");

            // Dispatch notification via email service
            const emailResult = await emailService.sendSharedBudgetInvite({
                toEmail: email,
                inviterName: req.user.name,
                inviterEmail: req.user.email,
                budgetName: budget.name,
                budgetAmount: budget.amount,
                inviteToken,
            });

            res.json({
                message: emailResult.sent
                    ? `Invitation sent successfully to ${email}.`
                    : `Invitation created for ${email}. (In-app invitation ready for recipient)`,
                budget,
                emailResult,
                inviteToken,
            });
        } catch (e) {
            res.status(400).json({ message: e.message || "Could not invite member" });
        }
    },
    getInvitation: async (req, res) => {
        try {
            const token = String(req.params.token || "").trim();
            if (!token) return res.status(400).json({ message: "Invitation token is required" });

            const budget = await SharedBudget.findOne({ "members.inviteToken": token })
                .populate("owner", "name email")
                .populate("members.user", "name email");

            if (!budget) {
                return res.status(404).json({ message: "Invitation not found or invalid link." });
            }

            const member = budget.members.find((m) => m.inviteToken === token);
            if (!member) {
                return res.status(404).json({ message: "Invitation record not found." });
            }

            const isExpired = member.inviteExpires && new Date(member.inviteExpires) < new Date();

            res.json({
                budgetId: budget._id,
                budgetName: budget.name,
                budgetAmount: budget.amount,
                owner: {
                    name: budget.owner?.name || "Lumify Member",
                    email: budget.owner?.email || "",
                },
                recipientEmail: member.email,
                status: member.status,
                isExpired,
                inviteExpires: member.inviteExpires,
            });
        } catch (e) {
            res.status(500).json({ message: e.message || "Failed to load invitation" });
        }
    },
    respondInvitationToken: async (req, res) => {
        try {
            const token = String(req.params.token || "").trim();
            const status = req.body.status;
            if (!["accepted", "declined"].includes(status)) {
                return res.status(400).json({ message: "Invalid invitation response. Must be accepted or declined." });
            }

            const budget = await SharedBudget.findOne({ "members.inviteToken": token });
            if (!budget) {
                return res.status(404).json({ message: "Invitation not found or invalid link." });
            }

            const member = budget.members.find((m) => m.inviteToken === token);
            if (!member) {
                return res.status(404).json({ message: "Invitation member record not found." });
            }

            if (member.inviteExpires && new Date(member.inviteExpires) < new Date()) {
                return res.status(400).json({ message: "This invitation link has expired. Please ask the budget owner to resend." });
            }

            if (member.status === "accepted") {
                return res.status(400).json({ message: "This invitation has already been accepted." });
            }

            member.status = status;
            member.user = req.user.id;
            await budget.save();
            await budget.populate("owner", "name email");
            await budget.populate("members.user", "name email");

            res.json({
                message: status === "accepted" ? `Successfully joined "${budget.name}"!` : "Invitation declined.",
                budget,
            });
        } catch (e) {
            res.status(400).json({ message: e.message || "Unable to respond to invitation." });
        }
    },
    respond: async (req, res) => {
        try {
            const status = req.body.status;
            if (!["accepted", "declined"].includes(status)) return res.status(400).json({ message: "Invalid invitation response" });
            const userEmail = (req.user.email || "").trim().toLowerCase();
            const budget = await SharedBudget.findOne({
                _id: req.params.id,
                $or: [
                    { "members.user": req.user.id },
                    ...(userEmail ? [{ "members.email": userEmail }] : []),
                ],
            });
            if (!budget) return res.status(404).json({ message: "Invitation not found" });
            const member = budget.members.find((m) =>
                (m.user && String(m.user) === String(req.user.id)) ||
                (userEmail && m.email && m.email.toLowerCase() === userEmail)
            );
            if (!member) return res.status(404).json({ message: "Invitation not found" });
            member.status = status;
            member.user = req.user.id;
            await budget.save();
            await budget.populate("owner", "name email");
            await budget.populate("members.user", "name email");
            res.json(budget);
        } catch (e) { res.status(400).json({ message: e.message }); }
    },
    removeMember: async (req, res) => {
        try {
            const budget = await SharedBudget.findOne({ _id: req.params.id, owner: req.user.id });
            if (!budget) return res.status(404).json({ message: "Shared budget not found or you are not the owner" });
            const target = String(req.params.userId).toLowerCase();
            budget.members = budget.members.filter((m) =>
                String(m.user) !== target &&
                String(m._id) !== target &&
                String(m.email || "").toLowerCase() !== target
            );
            await budget.save();
            await budget.populate("owner", "name email");
            await budget.populate("members.user", "name email");
            res.json(budget);
        } catch (e) { res.status(400).json({ message: e.message }); }
    },
    leave: async (req, res) => {
        try {
            const userEmail = (req.user.email || "").trim().toLowerCase();
            const budget = await SharedBudget.findOne({
                _id: req.params.id,
                $or: [
                    { "members.user": req.user.id },
                    ...(userEmail ? [{ "members.email": userEmail }] : []),
                ],
            });
            if (!budget) return res.status(404).json({ message: "Shared budget not found" });
            budget.members = budget.members.filter((m) =>
                String(m.user) !== String(req.user.id) &&
                (!userEmail || m.email?.toLowerCase() !== userEmail)
            );
            await budget.save();
            res.json({ message: "Left shared budget" });
        } catch (e) { res.status(400).json({ message: e.message }); }
    },
    contribute: async (req, res) => {
        try {
            const amount = Number(req.body.amount);
            if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: "Enter a valid contribution" });
            const budget = await SharedBudget.findOne({ _id: req.params.id, $or: [{ owner: req.user.id }, { members: { $elemMatch: { user: req.user.id, status: "accepted" } } }] });
            if (!budget) return res.status(404).json({ message: "Shared budget not found" });
            if (String(budget.owner) === String(req.user.id)) {
                budget.ownerContribution = Number(budget.ownerContribution || 0) + amount;
            } else {
                const member = budget.members.find((m) => String(m.user) === String(req.user.id));
                if (!member || member.status !== "accepted") return res.status(403).json({ message: "Accept the invitation first" });
                member.contribution = Number(member.contribution || 0) + amount;
            }
            await budget.save();
            await budget.populate("owner", "name email");
            await budget.populate("members.user", "name email");
            res.json(budget);
        } catch (e) { res.status(400).json({ message: e.message }); }
    },
    delete: async (req, res) => {
        try {
            const budget = await SharedBudget.findOne({ _id: req.params.id, owner: req.user.id });
            if (!budget) return res.status(404).json({ message: "Shared budget not found or you are not the owner" });
            await Transaction.updateMany({ sharedBudget: budget._id }, { $set: { sharedBudget: null } });
            await SharedBudget.findByIdAndDelete(budget._id);
            res.json({ message: "Shared budget deleted successfully" });
        } catch (e) { res.status(500).json({ message: e.message }); }
    },
};

const calendar = async (req, res) => {
    try {
        const [transactions, billList, subs, goals] = await Promise.all([
            Transaction.find({ user: req.user.id }).sort({ date: 1 }),
            Bill.find({ user: req.user.id }).sort({ dueDate: 1 }),
            Subscription.find({ user: req.user.id, active: true }).sort({ nextBillingDate: 1 }),
            Goal.find({ user: req.user.id, targetDate: { $ne: null } }).sort({ targetDate: 1 }),
        ]);
        const events = [
            ...transactions.map((x) => ({ id: String(x._id), type: "transaction", title: x.title, amount: x.amount, date: x.date, meta: x.category, detail: x })),
            ...billList.map((x) => ({ id: String(x._id), type: "bill", title: x.title, amount: x.amount, date: x.dueDate, meta: x.paid ? "Paid" : "Due", detail: x })),
            ...subs.map((x) => ({ id: String(x._id), type: "subscription", title: x.name, amount: x.amount, date: x.nextBillingDate, meta: x.billingCycle, detail: x })),
            ...goals.map((x) => ({ id: String(x._id), type: "goal", title: x.name, amount: x.targetAmount, date: x.targetDate, meta: "Goal deadline", detail: x })),
        ];
        res.json(events.sort((a, b) => new Date(a.date) - new Date(b.date)));
    } catch (e) { res.status(500).json({ message: e.message }); }
};

// Lumify Intelligence / Financial Copilot with honest Financial Health Score calculation
const ai = async (req, res) => {
    try {
        const { format: fmt, locale } = getCurrency(req);
        const query = String(req.body.query || "").trim().toLowerCase();
        const userId = req.user.id;

        const [transactions, billList, subs, goals, budgets, accounts] = await Promise.all([
            Transaction.find({ user: userId }),
            Bill.find({ user: userId }),
            Subscription.find({ user: userId, active: true }),
            Goal.find({ user: userId }),
            Budget.find({ user: userId }),
            Account.find({ user: userId }),
        ]);

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        const thisMonthTx = transactions.filter((t) => {
            const d = new Date(t.date);
            return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
        });

        const income = thisMonthTx.filter((x) => x.type === "Income").reduce((s, x) => s + Number(x.amount || 0), 0);
        const expense = thisMonthTx.filter((x) => x.type === "Expense").reduce((s, x) => s + Number(x.amount || 0), 0);
        const net = income - expense;
        const savingsRate = income > 0 ? Math.max(0, Math.round((net / income) * 100)) : 0;

        const by = {};
        thisMonthTx.filter((x) => x.type === "Expense").forEach((x) => {
            by[x.category] = (by[x.category] || 0) + Number(x.amount || 0);
        });
        const top = Object.entries(by).sort((a, b) => b[1] - a[1])[0];

        const unpaidBills = billList.filter((b) => !b.paid);
        const overdueBills = unpaidBills.filter((b) => new Date(b.dueDate) < new Date());
        const upcomingBillsSum = unpaidBills.reduce((s, b) => s + Number(b.amount || 0), 0);

        const monthlySubs = subs.reduce(
            (s, x) =>
                s +
                Number(x.amount || 0) *
                    (x.billingCycle === "Yearly" ? 1 / 12 : x.billingCycle === "Quarterly" ? 1 / 3 : x.billingCycle === "Weekly" ? 52 / 12 : 1),
            0
        );

        // Honest Financial Health Score calculation (0 to 100)
        let score = 50; // base score
        const factors = [];

        // 1. Savings rate & Income presence
        if (income > 0) {
            if (savingsRate >= 30) {
                score += 25;
                factors.push({ label: "High Savings Rate", impact: "+25 pts", status: "positive", note: `${savingsRate}% saved this month` });
            } else if (savingsRate >= 20) {
                score += 20;
                factors.push({ label: "Healthy Savings Rate", impact: "+20 pts", status: "positive", note: `${savingsRate}% saved this month` });
            } else if (savingsRate >= 10) {
                score += 10;
                factors.push({ label: "Moderate Savings", impact: "+10 pts", status: "neutral", note: `${savingsRate}% saved this month` });
            } else if (savingsRate > 0) {
                score += 5;
                factors.push({ label: "Low Savings", impact: "+5 pts", status: "neutral", note: "Consider saving at least 15%" });
            } else {
                score -= 15;
                factors.push({ label: "Negative Cash Flow", impact: "-15 pts", status: "negative", note: "Expenses exceed monthly income" });
            }
        } else if (expense > 0) {
            score = 15;
            factors.push({ label: "Zero Income Deficit", impact: "-35 pts", status: "negative", note: "Expenses incurred without logged income" });
        } else {
            score = 0;
            factors.push({ label: "No Income Logged", impact: "0 pts", status: "neutral", note: "Add your monthly income to activate score" });
        }

        if (income > 0 || expense > 0) {
            // 2. Overdue bills (-20 pts if overdue, +15 if all paid/on-time)
            if (overdueBills.length > 0) {
                score -= 20;
                factors.push({ label: "Overdue Bills", impact: "-20 pts", status: "negative", note: `${overdueBills.length} bill(s) past due date` });
            } else if (billList.length > 0) {
                score += 15;
                factors.push({ label: "Clean Bill Record", impact: "+15 pts", status: "positive", note: "No overdue obligations" });
            }

            // 3. Budget adherence
            const currentBudgets = budgets.filter((b) => b.month === currentMonth && b.year === currentYear);
            if (currentBudgets.length > 0) {
                const exceeded = currentBudgets.filter((b) => {
                    const spent = (b.scope === "overall" ? expense : (by[b.category] || 0));
                    return spent > Number(b.amount);
                });
                if (exceeded.length === 0) {
                    score += 15;
                    factors.push({ label: "Within Budget Limits", impact: "+15 pts", status: "positive", note: "All active budgets on track" });
                } else {
                    score -= 10;
                    factors.push({ label: "Budget Overrun", impact: "-10 pts", status: "negative", note: `${exceeded.length} budget(s) exceeded` });
                }
            }

            // 4. Goal momentum
            if (goals.length > 0) {
                const fundedRatio = goals.reduce((s, g) => s + (Number(g.savedAmount || 0) / Number(g.targetAmount || 1)), 0) / goals.length;
                if (fundedRatio >= 0.5) {
                    score += 10;
                    factors.push({ label: "Goal Progress", impact: "+10 pts", status: "positive", note: `Goals are ${Math.round(fundedRatio * 100)}% funded on average` });
                } else {
                    score += 5;
                    factors.push({ label: "Active Goals", impact: "+5 pts", status: "neutral", note: `${goals.length} target goal(s) set` });
                }
            }

            // 5. Subscription burden
            if (income > 0 && monthlySubs > 0) {
                const subRatio = monthlySubs / income;
                if (subRatio > 0.15) {
                    score -= 10;
                    factors.push({ label: "Heavy Subscription Burden", impact: "-10 pts", status: "negative", note: `${Math.round(subRatio * 100)}% of income goes to subscriptions` });
                } else {
                    score += 5;
                    factors.push({ label: "Controlled Subscriptions", impact: "+5 pts", status: "positive", note: `${Math.round(subRatio * 100)}% of income on subscriptions` });
                }
            }
        }

        score = Math.max(0, Math.min(100, Math.round(score)));
        const rating =
            score === 0
                ? "Unrated"
                : score >= 80
                ? "Healthy"
                : score >= 60
                ? "Good"
                : score >= 40
                ? "Fair"
                : "Critical";

        // Query answering
        let answer;
        if (query) {
            if (query.includes("score") || query.includes("health")) {
                answer = `Your Lumify Financial Health Score is ${score}/100 (${rating}). Main factors: savings rate (${savingsRate}%), ${overdueBills.length ? `${overdueBills.length} overdue bill(s)` : "no overdue bills"}, and ${subs.length} active subscription(s).`;
            } else if (query.includes("upcoming") || query.includes("bill")) {
                answer = unpaidBills.length
                    ? `You have ${unpaidBills.length} unpaid bill(s) totaling ${fmt(upcomingBillsSum)}. Next due: ${unpaidBills[0].title} (${fmt(unpaidBills[0].amount)}) on ${new Date(unpaidBills[0].dueDate).toLocaleDateString(locale)}.`
                    : "You have no unpaid bills recorded. Great job keeping your obligations clear!";
            } else if (query.includes("subscription")) {
                answer = `Your estimated monthly subscription cost is ${fmt(monthlySubs)} across ${subs.length} active service(s). Yearly projected cost is ${fmt(monthlySubs * 12)}.`;
            } else if (query.includes("food") || query.includes("grocery")) {
                const foodSpent = by.Food || by.food || by.Groceries || by.groceries || 0;
                answer = `Your recorded Food spending this month is ${fmt(foodSpent)}.`;
            } else if (query.includes("biggest") || query.includes("largest") || query.includes("top")) {
                answer = top
                    ? `Your largest spending category this month is ${top[0]} at ${fmt(top[1])}.`
                    : "No expense transactions recorded this month yet.";
            } else if (query.includes("save") || query.includes("saving")) {
                answer = `This month's recorded income is ${fmt(income)} and expenses are ${fmt(expense)}, resulting in a net savings of ${fmt(net)} (${savingsRate}% savings rate).`;
            } else if (query.includes("goal")) {
                const pending = goals.reduce((s, g) => s + Math.max(0, Number(g.targetAmount || 0) - Number(g.savedAmount || 0)), 0);
                answer = `You have ${goals.length} active financial goal(s) with ${fmt(pending)} remaining to reach full funding.`;
            } else if (query.includes("burn") || query.includes("pace") || query.includes("daily") || query.includes("project")) {
                const totalDays = new Date(currentYear, currentMonth, 0).getDate();
                const daysElapsed = Math.max(1, now.getDate());
                const burn = Math.round(expense / daysElapsed);
                const projected = Math.round(burn * totalDays);
                answer = `You are spending an average of ${fmt(burn)}/day (${daysElapsed} days into this month). Projected month-end expense is ${fmt(projected)}.`;
            } else if (query.includes("runway") || query.includes("liquid") || query.includes("emergency") || query.includes("buffer")) {
                const liquid = accounts.filter((a) => a.type !== "Credit Card").reduce((s, a) => s + Math.max(0, Number(a.openingBalance || 0)), 0);
                const daysElapsed = Math.max(1, now.getDate());
                const burn = Math.max(1, Math.round(expense / daysElapsed));
                const daysRunway = Math.round(liquid / burn);
                answer = `Your liquid cash and bank reserves total ${fmt(liquid)}. At your current burn rate, that provides ~${daysRunway} days (${(daysRunway / 30).toFixed(1)} months) of living expenses.`;
            } else {
                answer = `Based on your recorded Lumify data: Monthly Income ${fmt(income)}, Expenses ${fmt(expense)}, Net ${fmt(net)} (${savingsRate}% savings rate). Health Score: ${score}/100 (${rating}).`;
            }
        } else {
            answer = `Welcome to Lumify Intelligence. Your current Financial Health Score is ${score}/100 (${rating}).`;
        }

        // Recommendations
        const recommendations = [];
        const totalDays = new Date(currentYear, currentMonth, 0).getDate();
        const daysElapsed = Math.max(1, now.getDate());
        const burn = Math.round(expense / daysElapsed);
        const projected = Math.round(burn * totalDays);
        if (income > 0 && projected > income) {
            recommendations.push({
                category: "Burn Rate",
                text: `At ${fmt(burn)}/day, projected spending (${fmt(projected)}) will exceed income by ${fmt(projected - income)}. Consider trimming discretionary spending.`,
            });
        }
        if (savingsRate < 20 && income > 0) {
            recommendations.push({
                category: "Savings",
                text: `Aim to reach a 20% savings rate by setting aside ${fmt(income * 0.2)} at the beginning of each month.`,
            });
        }
        if (overdueBills.length > 0) {
            recommendations.push({
                category: "Bills",
                text: `Settle ${overdueBills[0].title} (${fmt(overdueBills[0].amount)}) immediately to avoid late fees or credit impact.`,
            });
        }
        if (monthlySubs > 3000) {
            recommendations.push({
                category: "Subscriptions",
                text: `Your subscriptions total ${fmt(monthlySubs)}/month. Auditing unused services could save ${fmt(monthlySubs * 0.3 * 12)} annually.`,
            });
        }
        if (goals.length > 0) {
            const g = goals[0];
            const rem = Math.max(0, Number(g.targetAmount) - Number(g.savedAmount));
            if (rem > 0) {
                recommendations.push({
                    category: "Goals",
                    text: `Saving an extra ${fmt(1500)}/month would accelerate your "${g.name}" goal by approximately 2 months.`,
                });
            }
        }

        res.json({
            answer,
            score,
            rating,
            factors,
            recommendations,
            stats: {
                income,
                expense,
                net,
                savingsRate,
                topCategory: top ? top[0] : null,
                topAmount: top ? top[1] : 0,
                unpaidBills: unpaidBills.length,
                overdueBills: overdueBills.length,
                monthlySubscriptions: Math.round(monthlySubs),
            },
        });
    } catch (e) {
        console.error("AI error:", e);
        res.status(500).json({ message: "Could not analyze your data" });
    }
};

// Serious financial purchase decision tool
const purchase = async (req, res) => {
    try {
        const { format: fmt } = getCurrency(req);
        const price = Number(req.body.price);
        const item = String(req.body.item || "Purchase").trim();
        if (!Number.isFinite(price) || price <= 0) return res.status(400).json({ message: "Enter a valid purchase price" });

        const userId = req.user.id;
        const [transactions, accounts, bills, subs, goals] = await Promise.all([
            Transaction.find({ user: userId }),
            Account.find({ user: userId }),
            Bill.find({ user: userId, paid: false }),
            Subscription.find({ user: userId, active: true }),
            Goal.find({ user: userId }),
        ]);

        // Calculate total available funds accurately
        const accountOpeningTotal = accounts.reduce((total, a) => total + Number(a.openingBalance || 0), 0);
        const linked = transactions.reduce((sum, t) => {
            const amount = Number(t.amount || 0);
            if (t.type === "Income" && t.account) return sum + amount;
            if (t.type === "Expense" && t.account) return sum - amount;
            if (t.type === "Transfer" && t.destinationAccount) return sum + amount;
            if (t.type === "Transfer" && t.sourceAccount) return sum - amount;
            return sum;
        }, 0);
        const unallocated = transactions
            .filter((t) => t.type !== "Transfer" && !t.account)
            .reduce((s, t) => s + (t.type === "Income" ? Number(t.amount || 0) : -Number(t.amount || 0)), 0);

        const availableFunds = Math.max(0, accountOpeningTotal + linked + unallocated);

        // Obligations
        const upcomingBills = bills.reduce((s, x) => s + Number(x.amount || 0), 0);
        const monthlySubscriptions = subs.reduce(
            (s, x) =>
                s +
                Number(x.amount || 0) *
                    (x.billingCycle === "Yearly" ? 1 / 12 : x.billingCycle === "Quarterly" ? 1 / 3 : x.billingCycle === "Weekly" ? 52 / 12 : 1),
            0
        );

        const goalNeed = goals.reduce((s, g) => s + Math.max(0, Number(g.targetAmount || 0) - Number(g.savedAmount || 0)), 0);

        // Safety buffer: at least ₹5,000 or 25% of purchase
        const safetyBuffer = Math.max(5000, price * 0.25);
        const projectedRemaining = availableFunds - upcomingBills - monthlySubscriptions - price;

        let decision = "BUY";
        let reason = "";
        let affordabilityScore = 85;

        if (price > availableFunds) {
            decision = "NOT RECOMMENDED";
            affordabilityScore = 15;
            reason = `This purchase exceeds your total available funds (${fmt(availableFunds)}) by ${fmt(price - availableFunds)}.`;
        } else if (projectedRemaining < 0) {
            decision = "NOT RECOMMENDED";
            affordabilityScore = 30;
            reason = `Buying this would leave you with insufficient funds for ${fmt(upcomingBills)} in upcoming bills and subscriptions.`;
        } else if (projectedRemaining < safetyBuffer) {
            decision = "WAIT";
            affordabilityScore = 55;
            reason = `Buying this would reduce your remaining balance to ${fmt(projectedRemaining)}, below your recommended safety buffer of ${fmt(safetyBuffer)}.`;
        } else {
            decision = "BUY";
            affordabilityScore = 92;
            reason = `You have sufficient available funds (${fmt(availableFunds)}) to cover this purchase, obligations (${fmt(upcomingBills + monthlySubscriptions)}), and maintain a healthy safety buffer of ${fmt(safetyBuffer)}.`;
        }

        // Goal impact note
        let goalImpact = "No immediate impact on active goals.";
        if (goals.length > 0 && price >= 5000) {
            const monthsDelay = Math.max(1, Math.round(price / 5000));
            goalImpact = `This amount is equivalent to ~${monthsDelay} month(s) of regular savings towards your goal "${goals[0].name}".`;
        }

        res.json({
            item,
            price,
            decision,
            affordabilityScore,
            reason,
            availableFunds,
            upcomingBills,
            monthlySubscriptions: Math.round(monthlySubscriptions),
            goalNeed,
            safetyBuffer: Math.round(safetyBuffer),
            remaining: Math.round(projectedRemaining),
            goalImpact,
        });
    } catch (e) {
        console.error("Purchase eval error:", e);
        res.status(500).json({ message: "Could not evaluate purchase" });
    }
};

const voice = async (req, res) => {
    try {
        const text = String(req.body.text || "").trim();
        const amountMatch =
            text.match(/(?:₹|rs\.?|rupees?\s*)\s*(\d[\d,]*(?:\.\d+)?)/i) ||
            text.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:₹|rs\.?|rupees?)/i) ||
            text.match(/\b(\d[\d,]*(?:\.\d+)?)\b/);
        const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, "")) : null;
        const type = /(earned|salary|received|income|got paid|credited|bonus)/i.test(text) ? "Income" : "Expense";

        const categoryMap = [
            [/food|grocery|groceries|restaurant|dinner|lunch|cafe|swiggy|zomato|starbucks/i, "Food"],
            [/travel|transport|uber|ola|metro|bus|fuel|petrol|diesel|flight/i, "Transport"],
            [/shopping|amazon|flipkart|clothes|myntra|zara/i, "Shopping"],
            [/entertainment|movie|cinema|netflix|game|spotify|concert/i, "Entertainment"],
            [/health|medicine|doctor|pharmacy|hospital|clinic/i, "Health"],
            [/education|course|college|books|tuition|udemy/i, "Education"],
            [/bill|electricity|rent|wifi|water|gas|emi/i, "Bills"],
        ];
        const category = categoryMap.find(([regex]) => regex.test(text))?.[1] || "Other";

        const date = /yesterday/i.test(text) ? new Date(Date.now() - 86400000) : new Date();

        let title = text
            .replace(/(?:₹|rs\.?|rupees?\s*)?\d[\d,]*(?:\.\d+)?/gi, "")
            .replace(/\b(spent|spend|paid|pay|for|on|rupees?|rs|yesterday|today|using|via|with|in)\b/gi, "")
            .trim();
        if (!title || title.length < 2) title = category;

        res.json({
            text,
            parsed: {
                title: title.charAt(0).toUpperCase() + title.slice(1),
                amount,
                type,
                category,
                date: date.toISOString().slice(0, 10),
                confidence: amount && category !== "Other" ? "high" : amount ? "medium" : "low",
            },
        });
    } catch (e) {
        res.status(500).json({ message: "Could not parse voice input" });
    }
};

module.exports = { bill: bills, goal, subscription: subscriptions, contribute, categories, shared, calendar, ai, purchase, voice };
