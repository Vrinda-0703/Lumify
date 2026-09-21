const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const { getCurrency } = require("../utils/currency");

const range = (year, month) => [new Date(year, month - 1, 1), new Date(year, month, 1)];
const totals = (rows) => ({ income: rows.filter(t=>t.type === "Income").reduce((s,t)=>s+Number(t.amount),0), expense: rows.filter(t=>t.type === "Expense").reduce((s,t)=>s+Number(t.amount),0) });

const getAnalytics = async (req, res) => {
    try {
        const { format: fmt } = getCurrency(req);
        const all = await Transaction.find({ user: req.user.id }).sort({ date: -1 });
        const now = new Date();
        let month = Number(req.query.month) || now.getMonth() + 1;
        let year = Number(req.query.year) || now.getFullYear();
        let [start, end] = range(year, month);
        let rows = all.filter(t => new Date(t.date) >= start && new Date(t.date) < end);
        if (!req.query.month && !req.query.year && !rows.length && all.length) {
            const latest = new Date(all[0].date); month = latest.getMonth()+1; year = latest.getFullYear(); [start,end] = range(year,month); rows = all.filter(t => new Date(t.date)>=start && new Date(t.date)<end);
        }
        const {income,expense} = totals(rows); const savings = income-expense; const savingsRate = income ? Math.round(savings/income*100) : 0;
        const expenseByCategory = {}; rows.filter(t=>t.type === "Expense").forEach(t=>expenseByCategory[t.category]=(expenseByCategory[t.category]||0)+Number(t.amount));
        const top = Object.entries(expenseByCategory).sort((a,b)=>b[1]-a[1])[0];
        const prevDate = new Date(year,month-2,1); const prevMonth=prevDate.getMonth()+1, prevYear=prevDate.getFullYear(); const [ps,pe]=range(prevYear,prevMonth); const previous=all.filter(t=>new Date(t.date)>=ps&&new Date(t.date)<pe); const prevTotals=totals(previous);
        const pct=(current,prev)=>prev?Math.round(((current-prev)/prev)*100):null;
        const budgets=await Budget.find({user:req.user.id,month,year}); const budgetVsActual=budgets.map(b=>{const actual=b.scope==="overall"?expense:(expenseByCategory[b.category]||0);return {category:b.scope==="overall"?"Overall spending":b.category,budget:Number(b.amount),actual,status:actual>b.amount?"Exceeded":"Under budget"}});
        const insights=[]; if(!rows.length) insights.push({type:"info",title:"No transactions yet",message:"Add transactions to see personalized analytics."}); else { if(expense>income) insights.push({type:"danger",title:"Spending is above income",message:"Your expenses are higher than your income for this month."}); if(top) insights.push({type:"info",title:"Top spending category",message:`${top[0]} is your largest expense at ${fmt(top[1])}.`}); if(pct(expense,prevTotals.expense)!==null) insights.push({type:pct(expense,prevTotals.expense)>0?"warning":"success",title:"Month-over-month change",message:`Expenses ${pct(expense,prevTotals.expense)>=0?"increased":"decreased"} ${Math.abs(pct(expense,prevTotals.expense))}% compared with last month.`}); }
        res.json({selectedMonth:month,selectedYear:year,expenseByCategory,incomeVsExpense:{income,expense},savings,savingsRate,topCategory:top?.[0]||"No expenses yet",topCategoryAmount:top?.[1]||0,previousMonth:{income:prevTotals.income,expense:prevTotals.expense},comparisons:{income:pct(income,prevTotals.income),expense:pct(expense,prevTotals.expense),savings:pct(savings,prevTotals.income-prevTotals.expense)},budgetVsActual,insights});
    } catch (error) { res.status(500).json({ message: "Could not load analytics" }); }
};
module.exports = { getAnalytics };
