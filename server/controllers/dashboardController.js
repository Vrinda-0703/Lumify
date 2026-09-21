const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const Account = require("../models/Account");
const Bill = require("../models/Bill");
const Goal = require("../models/Goal");
const Subscription = require("../models/Subscription");
const { getCurrency } = require("../utils/currency");

const monthOf = (date) => {
    const d = new Date(date);
    return { month: d.getMonth() + 1, year: d.getFullYear() };
};

const getDashboard = async (req, res) => {
    try {
        const userId = req.user.id;
        const curr = getCurrency(req);
        const fmt = curr.format;

        const [transactions, accounts, bills, goals, subs] = await Promise.all([
            Transaction.find({ user: userId }).sort({ date: -1, createdAt: -1 }),
            Account.find({ user: userId }).sort({ createdAt: -1 }),
            Bill.find({ user: userId }).sort({ dueDate: 1 }),
            Goal.find({ user: userId }).sort({ createdAt: -1 }),
            Subscription.find({ user: userId, active: true }).sort({ nextBillingDate: 1 }),
        ]);

        const now = new Date();
        let activeMonth = now.getMonth() + 1;
        let activeYear = now.getFullYear();

        let active = transactions.filter(
            (t) => monthOf(t.date).month === activeMonth && monthOf(t.date).year === activeYear
        );

        if (!active.length && transactions.length) {
            const latest = monthOf(transactions[0].date);
            activeMonth = latest.month;
            activeYear = latest.year;
            active = transactions.filter(
                (t) => monthOf(t.date).month === activeMonth && monthOf(t.date).year === activeYear
            );
        }

        // Previous month calculation for genuine comparisons
        const prevMonth = activeMonth === 1 ? 12 : activeMonth - 1;
        const prevYear = activeMonth === 1 ? activeYear - 1 : activeYear;
        const prevMonthTx = transactions.filter(
            (t) => monthOf(t.date).month === prevMonth && monthOf(t.date).year === prevYear
        );
        const prevMonthExpense = prevMonthTx
            .filter((t) => t.type === "Expense")
            .reduce((s, t) => s + Number(t.amount || 0), 0);

        const income = active.filter((t) => t.type === "Income").reduce((s, t) => s + Number(t.amount || 0), 0);
        const expense = active.filter((t) => t.type === "Expense").reduce((s, t) => s + Number(t.amount || 0), 0);
        const moneySaved = income - expense;
        const savingsRate = income > 0 ? Math.max(0, Math.round((moneySaved / income) * 100)) : 0;

        const allTimeIncome = transactions.filter((t) => t.type === "Income").reduce((s, t) => s + Number(t.amount || 0), 0);
        const allTimeExpense = transactions.filter((t) => t.type === "Expense").reduce((s, t) => s + Number(t.amount || 0), 0);
        const unallocated = transactions
            .filter((t) => t.type !== "Transfer" && !t.account)
            .reduce((s, t) => s + (t.type === "Income" ? Number(t.amount || 0) : -Number(t.amount || 0)), 0);

        const accountOpeningTotal = accounts.reduce((total, a) => total + Number(a.openingBalance || 0), 0);
        const linked = transactions.reduce((sum, t) => {
            const amount = Number(t.amount || 0);
            if (t.type === "Income" && t.account) return sum + amount;
            if (t.type === "Expense" && t.account) return sum - amount;
            if (t.type === "Transfer" && t.destinationAccount) return sum + amount;
            if (t.type === "Transfer" && t.sourceAccount) return sum - amount;
            return sum;
        }, 0);

        const totalBalance = accountOpeningTotal + linked + unallocated;

        // Calculate individual account current balances
        const accountsWithBalance = accounts.map((a) => {
            const op = Number(a.openingBalance || 0);
            let inc = 0, exp = 0, inT = 0, outT = 0;
            for (const t of transactions) {
                const amt = Number(t.amount || 0);
                if (t.type === "Income" && String(t.account) === String(a._id)) inc += amt;
                if (t.type === "Expense" && String(t.account) === String(a._id)) exp += amt;
                if (t.type === "Transfer" && String(t.destinationAccount) === String(a._id)) inT += amt;
                if (t.type === "Transfer" && String(t.sourceAccount) === String(a._id)) outT += amt;
            }
            return {
                ...a.toObject(),
                currentBalance: op + inc - exp + inT - outT,
                balance: op + inc - exp + inT - outT,
            };
        });

        // Budgets
        const budgets = await Budget.find({ user: userId, month: activeMonth, year: activeYear }).sort({ createdAt: -1 });
        const budgetsWithSpending = budgets.map((b) => {
            const spent = active
                .filter((t) => t.type === "Expense" && (b.scope === "overall" ? true : t.category === b.category))
                .reduce((s, t) => s + Number(t.amount || 0), 0);
            const amt = Number(b.amount || 0);
            const progress = amt > 0 ? Math.round((spent / amt) * 100) : 0;
            return {
                ...b.toObject(),
                spent,
                remaining: amt - spent,
                progress,
                status: progress >= 100 ? "Exceeded" : progress >= 80 ? "Warning" : "Safe",
            };
        });

        const totalPlannedBudget = budgets.reduce((s, b) => s + Number(b.amount || 0), 0);
        const totalBudgetSpent = budgetsWithSpending.reduce((s, b) => s + b.spent, 0);
        const totalBudgetRemaining = Math.max(0, totalPlannedBudget - totalBudgetSpent);
        const budgetUtilization = totalPlannedBudget > 0 ? Math.min(100, Math.round((totalBudgetSpent / totalPlannedBudget) * 100)) : 0;

        // Category spending breakdown
        const categoryMap = {};
        active.filter((t) => t.type === "Expense").forEach((t) => {
            categoryMap[t.category] = (categoryMap[t.category] || 0) + Number(t.amount || 0);
        });
        const categoryData = Object.entries(categoryMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // Previous month category map for category comparison
        const prevCategoryMap = {};
        prevMonthTx.filter((t) => t.type === "Expense").forEach((t) => {
            prevCategoryMap[t.category] = (prevCategoryMap[t.category] || 0) + Number(t.amount || 0);
        });

        // Monthly 6-month cash flow
        const monthlyData = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(activeYear, activeMonth - 1 - i, 1);
            const m = d.getMonth() + 1;
            const y = d.getFullYear();
            const rows = transactions.filter((t) => monthOf(t.date).month === m && monthOf(t.date).year === y);
            monthlyData.push({
                month: d.toLocaleString("en-IN", { month: "short" }),
                income: rows.filter((t) => t.type === "Income").reduce((s, t) => s + Number(t.amount || 0), 0),
                expense: rows.filter((t) => t.type === "Expense").reduce((s, t) => s + Number(t.amount || 0), 0),
            });
        }

        // Upcoming bills (unpaid, due soonest)
        const upcomingBills = bills
            .filter((b) => !b.paid)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 4);

        const overdueBills = bills.filter((b) => !b.paid && new Date(b.dueDate) < new Date());

        // Goals progress
        const goalsProgress = goals.slice(0, 4).map((g) => {
            const target = Number(g.targetAmount || 0);
            const saved = Number(g.savedAmount || 0);
            const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
            return {
                ...g.toObject(),
                progress: pct,
                remaining: Math.max(0, target - saved),
            };
        });

        // Subscriptions summary
        const monthlySubsCost = subs.reduce((total, s) => {
            const amt = Number(s.amount || 0);
            if (s.billingCycle === "Yearly") return total + amt / 12;
            if (s.billingCycle === "Quarterly") return total + amt / 3;
            if (s.billingCycle === "Weekly") return total + (amt * 52) / 12;
            return total + amt;
        }, 0);

        // DATA-DRIVEN FINANCIAL HEALTH SCORE (0-100)
        let healthScore = 50;
        const healthFactors = [];

        if (income > 0) {
            if (savingsRate >= 30) {
                healthScore += 25;
                healthFactors.push({ factor: "Savings Rate", score: 25, label: `Strong ${savingsRate}% savings rate`, positive: true });
            } else if (savingsRate >= 20) {
                healthScore += 20;
                healthFactors.push({ factor: "Savings Rate", score: 20, label: `Healthy ${savingsRate}% savings rate`, positive: true });
            } else if (savingsRate >= 10) {
                healthScore += 10;
                healthFactors.push({ factor: "Savings Rate", score: 10, label: `Moderate ${savingsRate}% savings rate`, positive: true });
            } else if (savingsRate > 0) {
                healthScore += 5;
                healthFactors.push({ factor: "Savings Rate", score: 5, label: `Low ${savingsRate}% savings rate`, positive: false });
            } else {
                healthScore -= 15;
                healthFactors.push({ factor: "Cash Flow", score: -15, label: "Deficit spending (expenses exceed income)", positive: false });
            }
        } else if (expense > 0) {
            // Expenses incurred with ZERO income: severe deficit
            healthScore = 15;
            healthFactors.push({ factor: "Cash Flow Deficit", score: -35, label: `Expenses incurring with ${fmt(0)} recorded income`, positive: false });
        } else {
            // Zero income and zero expenses: unrated / initial state
            healthScore = 0;
            healthFactors.push({ factor: "Income Stream", score: 0, label: "No income or transactions recorded this month", positive: false });
        }

        if (income > 0 || expense > 0) {
            if (overdueBills.length > 0) {
                healthScore -= 20;
                healthFactors.push({ factor: "Bill Due Dates", score: -20, label: `${overdueBills.length} overdue bill(s)`, positive: false });
            } else if (bills.length > 0) {
                healthScore += 15;
                healthFactors.push({ factor: "Bill Management", score: 15, label: "All bills paid and on time", positive: true });
            }

            if (budgets.length > 0) {
                const exceededBudgets = budgetsWithSpending.filter((b) => b.status === "Exceeded");
                if (exceededBudgets.length === 0) {
                    healthScore += 15;
                    healthFactors.push({ factor: "Budget Adherence", score: 15, label: "All category budgets within safe limits", positive: true });
                } else {
                    healthScore -= 10;
                    healthFactors.push({ factor: "Budget Overrun", score: -10, label: `${exceededBudgets.length} budget(s) exceeded`, positive: false });
                }
            }

            if (goals.length > 0) {
                healthScore += 10;
                healthFactors.push({ factor: "Goal Progress", score: 10, label: `${goals.length} active financial goal(s) tracking`, positive: true });
            }
        }

        healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));
        const healthRating =
            healthScore === 0
                ? "UNRATED"
                : healthScore >= 80
                ? "EXCELLENT"
                : healthScore >= 65
                ? "GOOD"
                : healthScore >= 45
                ? "FAIR"
                : "CRITICAL";

        // ADVANCED MULTI-VECTOR FINANCIAL INTELLIGENCE ENGINE
        const today = new Date();
        const isCurrentMonth = today.getMonth() + 1 === activeMonth && today.getFullYear() === activeYear;
        const totalDaysInMonth = new Date(activeYear, activeMonth, 0).getDate();
        const daysElapsed = isCurrentMonth ? Math.max(1, today.getDate()) : totalDaysInMonth;
        const daysRemaining = isCurrentMonth ? Math.max(0, totalDaysInMonth - daysElapsed) : 0;
        const dailyBurnRate = Math.round(expense / daysElapsed);
        const projectedMonthExpense = isCurrentMonth ? Math.round(dailyBurnRate * totalDaysInMonth) : expense;

        const candidateInsights = [];

        // 1. Budget Breaches & Limit Warnings
        const exceededBudgets = budgetsWithSpending.filter((b) => b.status === "Exceeded");
        const warningBudgets = budgetsWithSpending.filter((b) => b.status === "Warning");
        if (exceededBudgets.length > 0) {
            const b = exceededBudgets[0];
            const name = b.scope === "overall" ? "Overall Budget" : b.category;
            candidateInsights.push({
                priority: 1,
                type: "danger",
                tag: "Budget Breach",
                title: `${name} Exceeded Limit`,
                text: `${name} has reached ${b.progress}% utilization (${fmt(b.spent)} of ${fmt(b.amount)}). Discretionary spending here should be paused immediately.`,
            });
        } else if (warningBudgets.length > 0) {
            const b = warningBudgets[0];
            const name = b.scope === "overall" ? "Overall Budget" : b.category;
            candidateInsights.push({
                priority: 2,
                type: "warning",
                tag: "Budget Alert",
                title: `${name} Nearing Limit`,
                text: `${name} is at ${b.progress}% of its limit with ${daysRemaining} days remaining in the month (${fmt(b.remaining)} buffer left).`,
            });
        }

        // 2. Overdue Bills & Upcoming Bill Clusters
        if (overdueBills.length > 0) {
            const sumOverdue = overdueBills.reduce((s, b) => s + Number(b.amount || 0), 0);
            candidateInsights.push({
                priority: 1,
                type: "danger",
                tag: "Overdue Bills",
                title: "Overdue Obligations Alert",
                text: `You have ${overdueBills.length} overdue bill(s) totaling ${fmt(sumOverdue)}. Settle them immediately to prevent late penalties or credit score impact.`,
            });
        } else if (upcomingBills.length > 0) {
            const in7Days = upcomingBills.filter((b) => {
                const diffDays = (new Date(b.dueDate) - today) / (1000 * 60 * 60 * 24);
                return diffDays >= 0 && diffDays <= 7;
            });
            if (in7Days.length > 1) {
                const sum7 = in7Days.reduce((s, b) => s + Number(b.amount || 0), 0);
                candidateInsights.push({
                    priority: 2,
                    type: "warning",
                    tag: "Bills Cluster",
                    title: "Upcoming Bill Concentration",
                    text: `${in7Days.length} bills totaling ${fmt(sum7)} are due within the next 7 days. Ensure your payment accounts maintain adequate liquidity.`,
                });
            } else {
                const nextB = upcomingBills[0];
                candidateInsights.push({
                    priority: 3,
                    type: "warning",
                    tag: "Upcoming Bill",
                    title: `Bill Due: ${nextB.title}`,
                    text: `${nextB.title} (${fmt(nextB.amount)}) is due on ${new Date(nextB.dueDate).toLocaleDateString(curr.locale)}.`,
                });
            }
        }

        // 3. Projected Burn Rate & Month-End Budget Pacing
        if (isCurrentMonth && expense > 0) {
            if (totalPlannedBudget > 0) {
                if (projectedMonthExpense > totalPlannedBudget) {
                    const overrun = projectedMonthExpense - totalPlannedBudget;
                    candidateInsights.push({
                        priority: 2,
                        type: "warning",
                        tag: "Burn Rate",
                        title: "Month-End Budget Overrun Pace",
                        text: `At ${fmt(dailyBurnRate)}/day, you're projected to spend ${fmt(projectedMonthExpense)} by month-end, exceeding your ${fmt(totalPlannedBudget)} budget ceiling by ${fmt(overrun)}.`,
                    });
                } else {
                    candidateInsights.push({
                        priority: 4,
                        type: "success",
                        tag: "Budget Pacing",
                        title: "Disciplined Spending Pace",
                        text: `At ${fmt(dailyBurnRate)}/day, your projected month-end spend is ${fmt(projectedMonthExpense)}—under your ${fmt(totalPlannedBudget)} total budget ceiling.`,
                    });
                }
            } else if (income > 0) {
                if (projectedMonthExpense > income) {
                    const deficit = projectedMonthExpense - income;
                    candidateInsights.push({
                        priority: 2,
                        type: "warning",
                        tag: "Cash Flow",
                        title: "Projected Cash Flow Deficit",
                        text: `At ${fmt(dailyBurnRate)}/day, projected monthly expenses (${fmt(projectedMonthExpense)}) will outstrip your income (${fmt(income)}) by ${fmt(deficit)}.`,
                    });
                } else {
                    candidateInsights.push({
                        priority: 4,
                        type: "success",
                        tag: "Pacing",
                        title: "Positive Cash Flow Trajectory",
                        text: `At your current burn rate of ${fmt(dailyBurnRate)}/day, you're on track for a ${fmt(income - projectedMonthExpense)} month-end savings surplus.`,
                    });
                }
            }
        }

        // 4. Missing Income Warning or Zero Activity Setup Guide
        if (income === 0 && expense > 0) {
            candidateInsights.push({
                priority: 1,
                type: "danger",
                tag: "Cash Flow",
                title: "Unrecorded Monthly Income",
                text: `You've recorded ${fmt(expense)} in expenses without logging your income. Add your salary or earnings to stabilize your health score and unlock savings projections.`,
            });
        } else if (income === 0 && expense === 0) {
            candidateInsights.push({
                priority: 5,
                type: "info",
                tag: "Onboarding",
                title: "Welcome to Lumify Intelligence",
                text: "Add your monthly income and log your first transaction to unlock real-time burn rates, automated budget warnings, and AI financial recommendations.",
            });
        }

        // 5. Emergency Runway Cushion
        const liquidAccounts = accountsWithBalance.filter((a) => a.type !== "Credit Card");
        const totalLiquid = liquidAccounts.reduce((s, a) => s + Math.max(0, a.currentBalance), 0);
        if (totalLiquid > 0 && dailyBurnRate > 0) {
            const runwayDays = Math.round(totalLiquid / dailyBurnRate);
            const runwayMonths = (runwayDays / 30).toFixed(1);
            if (runwayDays < 30) {
                candidateInsights.push({
                    priority: 1,
                    type: "danger",
                    tag: "Runway",
                    title: "Low Cash Runway Buffer",
                    text: `Available liquid reserves (${fmt(totalLiquid)}) provide only ~${runwayDays} days of expenses at your current burn rate. Prioritize emergency reserves.`,
                });
            } else if (runwayMonths >= 3) {
                candidateInsights.push({
                    priority: 4,
                    type: "success",
                    tag: "Runway",
                    title: "Solid Emergency Cushion",
                    text: `Your liquid cash reserves (${fmt(totalLiquid)}) provide ~${runwayMonths} months of living expense runway. Excellent financial foundation!`,
                });
            }
        }

        // 6. Subscription Burden Ratio
        if (income > 0 && monthlySubsCost > 0) {
            const subRatio = Math.round((monthlySubsCost / income) * 100);
            if (subRatio >= 15) {
                candidateInsights.push({
                    priority: 2,
                    type: "warning",
                    tag: "Subscriptions",
                    title: "Heavy Subscription Burden",
                    text: `Active subscriptions consume ${subRatio}% of your income (${fmt(monthlySubsCost)}/mo across ${subs.length} services). Consider cancelling underused apps.`,
                });
            } else {
                candidateInsights.push({
                    priority: 5,
                    type: "info",
                    tag: "Subscriptions",
                    title: "Controlled Recurring Costs",
                    text: `${subs.length} active subscription(s) cost ${fmt(monthlySubsCost)}/mo (${subRatio}% of income), well within the safe 10% benchmark.`,
                });
            }
        } else if (monthlySubsCost > 0) {
            candidateInsights.push({
                priority: 5,
                type: "info",
                tag: "Subscriptions",
                title: "Active Subscriptions",
                text: `You have ${subs.length} active subscription(s) totaling ${fmt(monthlySubsCost)}/month.`,
            });
        }

        // 7. Unbudgeted Category Spending
        const budgetedCategories = new Set(budgets.map((b) => b.category).filter(Boolean));
        const unbudgetedExpenses = categoryData.filter((c) => !budgetedCategories.has(c.name) && c.value >= 1500);
        if (unbudgetedExpenses.length > 0 && budgets.length > 0) {
            const topUnbudgeted = unbudgetedExpenses[0];
            candidateInsights.push({
                priority: 3,
                type: "info",
                tag: "Optimization",
                title: `Unbudgeted ${topUnbudgeted.name} Spend`,
                text: `${fmt(topUnbudgeted.value)} was spent on ${topUnbudgeted.name} without an allocated budget limit. Setting a category cap helps eliminate silent money leaks.`,
            });
        }

        // 8. Category Concentration Risk
        if (categoryData.length > 1 && expense >= 2000) {
            const top = categoryData[0];
            const pct = Math.round((top.value / expense) * 100);
            if (pct >= 45) {
                candidateInsights.push({
                    priority: 3,
                    type: "warning",
                    tag: "Concentration",
                    title: `Heavy ${top.name} Concentration`,
                    text: `${top.name} represents ${pct}% (${fmt(top.value)}) of your entire month's spending. Reviewing this category will have the biggest impact on your savings.`,
                });
            }
        }

        // 9. Month-over-Month Spending Shifts
        if (prevMonthExpense > 0 && expense > 0) {
            const diff = expense - prevMonthExpense;
            const pctChange = Math.round((Math.abs(diff) / prevMonthExpense) * 100);
            if (pctChange >= 8) {
                candidateInsights.push({
                    priority: diff > 0 ? 3 : 4,
                    type: diff > 0 ? "warning" : "success",
                    tag: "Trend",
                    title: diff > 0 ? "Monthly Expense Spike" : "Spending Reduction",
                    text: diff > 0
                        ? `Overall monthly expenses rose ${pctChange}% compared to last month (${fmt(expense)} vs ${fmt(prevMonthExpense)}).`
                        : `Overall spending dropped ${pctChange}% compared with last month (saved ${fmt(Math.abs(diff))} more). Keep up the great pace!`,
                });
            }
        }

        // 10. Goal Momentum
        const nearGoal = goalsProgress.find((g) => g.progress >= 85 && g.progress < 100);
        if (nearGoal) {
            candidateInsights.push({
                priority: 4,
                type: "success",
                tag: "Goals",
                title: `Milestone Near: ${nearGoal.name}`,
                text: `You're at ${nearGoal.progress}% of your '${nearGoal.name}' goal! Only ${fmt(nearGoal.remaining)} remaining to reach 100%.`,
            });
        }

        // 11. High Savings Rate Celebration
        if (savingsRate >= 30 && income > 0) {
            candidateInsights.push({
                priority: 4,
                type: "success",
                tag: "Savings",
                title: "Super Saver Status",
                text: `You're saving ${savingsRate}% of your monthly income (${fmt(moneySaved)} surplus), far exceeding the 20% standard wealth-building benchmark.`,
            });
        }

        // Sort by priority (1 = highest urgency) and deduplicate
        candidateInsights.sort((a, b) => a.priority - b.priority);
        const seenTitles = new Set();
        const insights = [];
        for (const item of candidateInsights) {
            if (!seenTitles.has(item.title)) {
                seenTitles.add(item.title);
                insights.push(item);
            }
        }

        // Primary spotlight insight
        const primaryInsight = insights[0] || {
            type: "info",
            tag: "Insight",
            title: "Lumify Intelligence",
            text: "Add transactions and budgets to unlock real-time financial tracking and predictive insights.",
        };

        res.json({
            totalBalance,
            totalIncome: income,
            totalExpense: expense,
            moneySaved,
            savingsRate,
            allTimeIncome,
            allTimeExpense,
            activeMonth,
            activeYear,
            recentTransactions: transactions.slice(0, 6),
            budgets: budgetsWithSpending,
            totalBudget: totalPlannedBudget,
            totalBudgetSpent,
            totalBudgetRemaining,
            budgetUtilization,
            monthlyData,
            categoryData,
            accounts: accountsWithBalance,
            upcomingBills,
            goals: goalsProgress,
            subscriptions: {
                activeCount: subs.length,
                monthlyCost: Math.round(monthlySubsCost),
                yearlyCost: Math.round(monthlySubsCost * 12),
                items: subs.slice(0, 4),
            },
            financialHealth: {
                score: healthScore,
                rating: healthRating,
                factors: healthFactors,
                summary:
                    healthScore === 0
                        ? "No income or transactions logged yet. Add your income to calculate your live Financial Health Score."
                        : healthScore < 45
                        ? `Critical cash flow: spending with ${fmt(0)} recorded income or deficit. Log your income to stabilize.`
                        : healthScore >= 75
                        ? "Your finances are in great shape with strong savings and controlled spending."
                        : healthScore >= 60
                        ? "Good financial standing. Keep an eye on upcoming bills and category budgets."
                        : "Focus on reducing discretionary expenses to rebuild monthly surplus.",
            },
            primaryInsight,
            insights,
        });
    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).json({ message: "Could not load dashboard" });
    }
};

module.exports = { getDashboard };
