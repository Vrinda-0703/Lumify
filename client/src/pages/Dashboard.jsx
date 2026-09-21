import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import TransactionForm from "../components/Forms/TransactionForm";
import { getDashboardData } from "../services/dashboardService";
import { getAccounts } from "../services/accountService";
import { addTransaction } from "../services/transactionService";
import { billService } from "../services/featureService";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import {
    ArrowDownLeft,
    ArrowUpRight,
    WalletCards,
    Plus,
    Sparkles,
    Calendar,
    Target,
    Repeat,
    AlertCircle,
    RefreshCw,
    TrendingUp,
    ShieldCheck,
    ChevronRight,
} from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";

const colors = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e", "#6366f1", "#ec4899"];

export default function Dashboard() {
    const navigate = useNavigate();
    const { money, currencySymbol, currency } = useCurrency();
    const [data, setData] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [formType, setFormType] = useState("Expense");

    const user = JSON.parse(localStorage.getItem("user") || "null");

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const [d, a] = await Promise.all([getDashboardData(), getAccounts()]);
            setData(d || {});
            setAccounts(Array.isArray(a) ? a : []);
        } catch (e) {
            setError(e.response?.data?.message || "Unable to load your financial data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [currency]);

    const monthLabel = useMemo(() => {
        if (!data?.activeYear || !data?.activeMonth) {
            return new Date().toLocaleString("en-IN", { month: "long", year: "numeric" });
        }
        return new Date(data.activeYear, data.activeMonth - 1, 1).toLocaleString("en-IN", {
            month: "long",
            year: "numeric",
        });
    }, [data]);

    const accountTotal = useMemo(() => {
        return accounts.reduce(
            (s, a) => s + Number(a.balance ?? a.currentBalance ?? a.openingBalance ?? 0),
            0
        );
    }, [accounts]);

    const totalBalance = Number(data?.totalBalance || 0);
    const totalIncome = Number(data?.totalIncome || 0);
    const totalExpense = Number(data?.totalExpense || 0);
    const savingsRate = Number(data?.savingsRate || 0);
    const budgetUtilization = Number(data?.budgetUtilization || 0);
    const totalBudgetRemaining = Number(data?.totalBudgetRemaining || 0);
    const health = data?.financialHealth || { score: 70, rating: "GOOD", summary: "Calculated based on spending and savings adherence." };
    const primaryInsight = data?.primaryInsight || (data?.insights && data.insights[0]) || null;

    const markBillPaid = async (billId) => {
        try {
            await billService.update(billId, { paid: true });
            await load();
        } catch (err) {
            console.error("Could not mark bill as paid:", err);
        }
    };

    const handleQuickAdd = async (payload) => {
        try {
            await addTransaction(payload);
            setShowForm(false);
            await load();
        } catch (err) {
            setError(err.response?.data?.message || "Could not save transaction");
        }
    };

    return (
        <div className="page-shell">
            <Sidebar />
            <main className="page-main">
                {/* Page Header */}
                <div className="page-header">
                    <div>
                        <p className="eyebrow">COMMAND CENTER</p>
                        <h1 className="page-title">
                            Welcome back, {user?.name ? user.name.split(" ")[0] : "there"} 👋
                        </h1>
                        <p className="page-subtitle">
                            Here is your live financial status and cash flow intelligence for {monthLabel}.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            type="button"
                            className="primary-btn text-xs sm:text-sm"
                            onClick={() => {
                                setFormType("Income");
                                setShowForm(true);
                            }}
                        >
                            <Plus size={15} /> Add Income
                        </button>
                        <button
                            type="button"
                            className="primary-btn text-xs sm:text-sm"
                            onClick={() => {
                                setFormType("Expense");
                                setShowForm(true);
                            }}
                        >
                            <Plus size={15} /> Add Expense
                        </button>
                    </div>
                </div>

                {/* Error State with Retry */}
                {error && (
                    <div className="surface p-6 mb-6 rounded-2xl border border-rose-500/30 text-center">
                        <AlertCircle className="mx-auto text-rose-500 mb-2" size={32} />
                        <h3 className="font-bold text-lg mb-1" style={{ color: "var(--text-primary)" }}>
                            Unable to load your financial data
                        </h3>
                        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                            {error}
                        </p>
                        <button onClick={load} className="primary-btn w-auto text-xs">
                            <RefreshCw size={14} /> Retry
                        </button>
                    </div>
                )}

                {/* Loading Skeleton */}
                {loading && !error && (
                    <div className="space-y-6">
                        <div className="surface p-12 text-center rounded-2xl animate-pulse">
                            <p style={{ color: "var(--text-secondary)" }}>
                                Generating your Lumify financial overview…
                            </p>
                        </div>
                    </div>
                )}

                {!loading && !error && (
                    <>
                        {/* TOP SECTION: BALANCE CARD & FINANCIAL HEALTH SCORE */}
                        <div className="grid gap-6 lg:grid-cols-3">
                            {/* Main Balance Card (2 cols) */}
                            <section className="balance-card lg:col-span-2">
                                <div className="balance-card-glow" />
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <p
                                            className="text-xs font-black tracking-[0.16em] uppercase"
                                            style={{ color: "var(--balance-card-title)" }}
                                        >
                                            TOTAL ESTIMATED BALANCE
                                        </p>
                                        {savingsRate > 0 && (
                                            <span className="badge success text-xs">
                                                <TrendingUp size={12} className="mr-1 inline" /> {savingsRate}% Saved this month
                                            </span>
                                        )}
                                    </div>

                                    <h2
                                        className="mt-3 text-4xl sm:text-5xl font-black tracking-tight"
                                        style={{ color: "var(--balance-card-amount)" }}
                                    >
                                        {money(totalBalance)}
                                    </h2>

                                    <p
                                        className="mt-2 text-xs sm:text-sm font-medium max-w-xl"
                                        style={{ color: "var(--balance-card-sub)" }}
                                    >
                                        Calculated across active accounts, verified opening balances, and recorded cash flow.
                                    </p>

                                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="balance-mini">
                                            <div
                                                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
                                                style={{ color: "var(--balance-card-chip-label)" }}
                                            >
                                                <ArrowDownLeft size={16} className="text-emerald-500" />
                                                Monthly Income
                                            </div>
                                            <p className="mt-2 text-xl font-black text-emerald-500">
                                                {money(totalIncome)}
                                            </p>
                                        </div>

                                        <div className="balance-mini">
                                            <div
                                                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
                                                style={{ color: "var(--balance-card-chip-label)" }}
                                            >
                                                <ArrowUpRight size={16} className="text-rose-500" />
                                                Monthly Expenses
                                            </div>
                                            <p className="mt-2 text-xl font-black text-rose-500">
                                                {money(totalExpense)}
                                            </p>
                                        </div>

                                        <div className="balance-mini">
                                            <div
                                                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
                                                style={{ color: "var(--balance-card-chip-label)" }}
                                            >
                                                <WalletCards size={16} className="text-cyan-500" />
                                                Remaining Budget
                                            </div>
                                            <p className={`mt-2 text-xl font-black ${totalBudgetRemaining < 0 ? "text-rose-500" : "text-cyan-500"}`}>
                                                {money(totalBudgetRemaining)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* FINANCIAL HEALTH SCORE CARD (1 col) */}
                            <section
                                className="surface p-6 rounded-2xl flex flex-col justify-between border"
                                style={{
                                    borderColor:
                                        health.score >= 75
                                            ? "rgba(16, 185, 129, 0.3)"
                                            : health.score >= 60
                                            ? "rgba(139, 92, 246, 0.3)"
                                            : health.score > 0
                                            ? "rgba(244, 63, 94, 0.3)"
                                            : "var(--border)",
                                }}
                            >
                                <div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-xl bg-violet-500/15 flex items-center justify-center text-violet-500">
                                                <ShieldCheck size={18} />
                                            </div>
                                            <div>
                                                <p className="eyebrow">HEALTH SCORE</p>
                                                <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                                                    Financial Health
                                                </h3>
                                            </div>
                                        </div>
                                        <span
                                            className={`badge font-bold text-xs ${
                                                health.score >= 75
                                                    ? "success"
                                                    : health.score >= 60
                                                    ? "info"
                                                    : health.score > 0
                                                    ? "danger"
                                                    : "chip"
                                            }`}
                                        >
                                            {health.rating}
                                        </span>
                                    </div>

                                    {/* Big Score Meter */}
                                    <div className="mt-5 flex items-baseline gap-2">
                                        <span className="text-5xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
                                            {health.score}
                                        </span>
                                        <span className="text-base text-secondary font-bold">/ 100</span>
                                    </div>

                                    {/* Score bar */}
                                    <div className="mt-3 h-2 w-full rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${
                                                health.score >= 75
                                                    ? "bg-emerald-500"
                                                    : health.score >= 60
                                                    ? "bg-violet-500"
                                                    : health.score > 0
                                                    ? "bg-rose-500"
                                                    : "bg-slate-400"
                                            }`}
                                            style={{ width: `${Math.min(100, Math.max(0, health.score))}%` }}
                                        />
                                    </div>

                                    <p className="mt-4 text-xs text-secondary leading-relaxed">
                                        {health.summary}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => navigate("/ai")}
                                    className="secondary-btn mt-5 w-full text-xs py-2 justify-center flex items-center gap-1.5"
                                >
                                    <Sparkles size={14} className="text-violet-500" />
                                    Explore Detailed Score Breakdown
                                </button>
                            </section>
                        </div>

                        {/* DATA-DRIVEN LUMIFY INSIGHT SPOTLIGHT BANNER */}
                        {primaryInsight && (
                            <div
                                className="mt-6 p-4 sm:p-5 rounded-2xl flex items-center justify-between gap-4 border shadow-sm transition"
                                style={{
                                    background:
                                        primaryInsight.type === "danger"
                                            ? "rgba(239, 68, 68, 0.08)"
                                            : primaryInsight.type === "warning"
                                            ? "rgba(245, 158, 11, 0.08)"
                                            : primaryInsight.type === "success"
                                            ? "rgba(16, 185, 129, 0.08)"
                                            : "rgba(124, 58, 237, 0.08)",
                                    borderColor:
                                        primaryInsight.type === "danger"
                                            ? "rgba(239, 68, 68, 0.25)"
                                            : primaryInsight.type === "warning"
                                            ? "rgba(245, 158, 11, 0.25)"
                                            : primaryInsight.type === "success"
                                            ? "rgba(16, 185, 129, 0.25)"
                                            : "rgba(124, 58, 237, 0.25)",
                                }}
                            >
                                <div className="flex items-center gap-3.5">
                                    <div
                                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                                            primaryInsight.type === "danger"
                                                ? "bg-rose-500/20 text-rose-500"
                                                : primaryInsight.type === "warning"
                                                ? "bg-amber-500/20 text-amber-500"
                                                : primaryInsight.type === "success"
                                                ? "bg-emerald-500/20 text-emerald-500"
                                                : "bg-violet-500/20 text-violet-500"
                                        }`}
                                    >
                                        <Sparkles size={19} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`text-[11px] font-black tracking-wider uppercase ${
                                                    primaryInsight.type === "danger"
                                                        ? "text-rose-500"
                                                        : primaryInsight.type === "warning"
                                                        ? "text-amber-500"
                                                        : primaryInsight.type === "success"
                                                        ? "text-emerald-500"
                                                        : "text-violet-500"
                                                }`}
                                            >
                                                {primaryInsight.tag || primaryInsight.title || "Lumify Insight"}
                                            </span>
                                            <span className="text-secondary text-xs">· Financial Intelligence</span>
                                        </div>
                                        <p className="text-xs sm:text-sm font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>
                                            {primaryInsight.text}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate("/ai")}
                                    className="hidden sm:flex items-center gap-1 text-xs font-bold text-violet-500 hover:text-violet-600 shrink-0"
                                >
                                    Ask Copilot <ChevronRight size={14} />
                                </button>
                            </div>
                        )}

                        {/* Cash Flow & Category Charts */}
                        <div className="mt-6 grid gap-6 xl:grid-cols-3">
                            <section className="surface p-6 xl:col-span-2 rounded-2xl">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="eyebrow">CASH FLOW DYNAMICS</p>
                                        <h2 className="section-title mt-1">Income vs Expenses</h2>
                                    </div>
                                    <span className="chip text-xs">Last 6 Months</span>
                                </div>
                                <div className="mt-5">
                                    <ResponsiveContainer width="100%" height={290}>
                                        <LineChart data={data?.monthlyData || []}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                            <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                                            <YAxis
                                                stroke="var(--text-muted)"
                                                fontSize={12}
                                                tickFormatter={(v) => `${currencySymbol}${v >= 1000 ? `${v / 1000}k` : v}`}
                                            />
                                            <Tooltip
                                                formatter={(v) => [money(v), ""]}
                                                contentStyle={{
                                                    backgroundColor: "var(--bg-card)",
                                                    borderColor: "var(--border)",
                                                    color: "var(--text-primary)",
                                                    borderRadius: "12px",
                                                    fontSize: "12px",
                                                    boxShadow: "var(--shadow)",
                                                }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                                            <Line
                                                type="monotone"
                                                name="Income"
                                                dataKey="income"
                                                stroke="#10b981"
                                                strokeWidth={3}
                                                dot={{ r: 3 }}
                                            />
                                            <Line
                                                type="monotone"
                                                name="Expense"
                                                dataKey="expense"
                                                stroke="#f43f5e"
                                                strokeWidth={3}
                                                dot={{ r: 3 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </section>

                            <section className="surface p-6 rounded-2xl">
                                <p className="eyebrow">SPENDING MIX</p>
                                <h2 className="section-title mt-1">Top Categories</h2>
                                {(data?.categoryData || []).length > 0 ? (
                                    <div className="mt-4">
                                        <ResponsiveContainer width="100%" height={210}>
                                            <PieChart>
                                                <Pie
                                                    data={data.categoryData}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    innerRadius={48}
                                                    outerRadius={78}
                                                    paddingAngle={3}
                                                >
                                                    {data.categoryData.map((x, i) => (
                                                        <Cell key={x.name} fill={colors[i % colors.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(v) => [money(v), ""]}
                                                    contentStyle={{
                                                        backgroundColor: "var(--bg-card)",
                                                        borderColor: "var(--border)",
                                                        color: "var(--text-primary)",
                                                        borderRadius: "12px",
                                                        fontSize: "12px",
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="mt-2 space-y-1.5 max-h-24 overflow-y-auto">
                                            {data.categoryData.slice(0, 4).map((c, i) => (
                                                <div key={c.name} className="flex items-center justify-between text-xs">
                                                    <span className="flex items-center gap-2 text-secondary">
                                                        <span
                                                            className="w-2.5 h-2.5 rounded-full"
                                                            style={{ background: colors[i % colors.length] }}
                                                        />
                                                        {c.name}
                                                    </span>
                                                    <strong className="text-primary">{money(c.value)}</strong>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="empty-state mt-5">
                                        No expenses recorded in {monthLabel} yet.
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* Budget Control Overview */}
                        <section className="surface mt-6 p-6 rounded-2xl">
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div>
                                    <p className="eyebrow">BUDGET UTILIZATION</p>
                                    <h2 className="section-title mt-1">
                                        {budgetUtilization}% of Planned Budget Used
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    className="secondary-btn text-xs"
                                    onClick={() => navigate("/budget")}
                                >
                                    Manage Budgets →
                                </button>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-4 h-3 w-full rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        budgetUtilization >= 100
                                            ? "bg-rose-500"
                                            : budgetUtilization >= 80
                                            ? "bg-amber-500"
                                            : "bg-emerald-500"
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(0, budgetUtilization))}%` }}
                                />
                            </div>

                            {(data?.budgets || []).length === 0 ? (
                                <div className="empty-state mt-5">
                                    <p>No budgets set for {monthLabel}. Set limits to automatically track your burn rate.</p>
                                    <button
                                        type="button"
                                        className="primary-btn mt-3 w-auto text-xs"
                                        onClick={() => navigate("/budget")}
                                    >
                                        <Plus size={14} /> Set Budget
                                    </button>
                                </div>
                            ) : (
                                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {data.budgets.slice(0, 6).map((b) => (
                                        <div className="surface-elevated p-4 rounded-2xl" key={b._id}>
                                            <div className="flex items-center justify-between">
                                                <strong className="text-sm">
                                                    {b.scope === "overall" ? "Overall Spending" : b.category}
                                                </strong>
                                                <span
                                                    className={`badge text-xs ${
                                                        b.status === "Exceeded"
                                                            ? "danger"
                                                            : b.status === "Warning"
                                                            ? "warning"
                                                            : "success"
                                                    }`}
                                                >
                                                    {b.status}
                                                </span>
                                            </div>
                                            <div
                                                className="mt-3 h-2 w-full rounded-full overflow-hidden"
                                                style={{ background: "var(--border)" }}
                                            >
                                                <div
                                                    className={`h-full rounded-full ${
                                                        b.status === "Exceeded"
                                                            ? "bg-rose-500"
                                                            : b.status === "Warning"
                                                            ? "bg-amber-500"
                                                            : "bg-emerald-500"
                                                    }`}
                                                    style={{ width: `${Math.min(100, b.progress || 0)}%` }}
                                                />
                                            </div>
                                            <div className="mt-2 flex justify-between text-xs text-secondary">
                                                <span>{money(b.spent)} spent</span>
                                                <span className={b.remaining < 0 ? "text-rose-500 font-bold" : ""}>
                                                    {money(b.remaining)} {b.remaining < 0 ? "over" : "left"}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Four-Column Fintech Highlights: Accounts, Upcoming Bills, Goals, Subscriptions */}
                        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                            {/* Wallets & Accounts */}
                            <section className="surface p-5 rounded-2xl flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <WalletCards size={16} className="text-cyan-500" />
                                            <h3 className="font-bold text-sm">Wallets &amp; Accounts</h3>
                                        </div>
                                        <button
                                            className="text-xs font-bold text-violet-500"
                                            onClick={() => navigate("/tools")}
                                        >
                                            View
                                        </button>
                                    </div>
                                    <p className="mt-3 text-2xl font-black text-cyan-500">
                                        {money(accountTotal)}
                                    </p>
                                    <div className="mt-3 space-y-2">
                                        {accounts.slice(0, 3).map((a) => (
                                            <div
                                                key={a._id}
                                                className="surface-elevated flex items-center justify-between p-2.5 rounded-xl text-xs"
                                            >
                                                <span className="font-semibold truncate max-w-[110px]">{a.name}</span>
                                                <span className="font-mono">
                                                    {money(a.balance ?? a.currentBalance ?? a.openingBalance)}
                                                </span>
                                            </div>
                                        ))}
                                        {!accounts.length && (
                                            <p className="text-xs text-secondary">No accounts added yet.</p>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* Upcoming Bills */}
                            <section className="surface p-5 rounded-2xl flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-amber-500" />
                                            <h3 className="font-bold text-sm">Upcoming Bills</h3>
                                        </div>
                                        <button
                                            className="text-xs font-bold text-violet-500"
                                            onClick={() => navigate("/tools")}
                                        >
                                            View
                                        </button>
                                    </div>
                                    <p className="mt-3 text-2xl font-black text-amber-500">
                                        {(data?.upcomingBills || []).length} Due
                                    </p>
                                    <div className="mt-3 space-y-2">
                                        {(data?.upcomingBills || []).slice(0, 3).map((b) => (
                                            <div
                                                key={b._id}
                                                className="surface-elevated flex items-center justify-between p-2.5 rounded-xl text-xs"
                                            >
                                                <div>
                                                    <span className="font-semibold block truncate max-w-[100px]">{b.title}</span>
                                                    <span className="text-[10px] text-secondary">
                                                        {new Date(b.dueDate).toLocaleDateString("en-IN", {
                                                            day: "numeric",
                                                            month: "short",
                                                        })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <strong className="text-rose-500">{money(b.amount)}</strong>
                                                    <button
                                                        type="button"
                                                        onClick={() => markBillPaid(b._id)}
                                                        className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 font-bold"
                                                        title="Mark paid"
                                                    >
                                                        Paid
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {!(data?.upcomingBills || []).length && (
                                            <p className="text-xs text-secondary">No upcoming unpaid bills.</p>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* Goals Progress */}
                            <section className="surface p-5 rounded-2xl flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Target size={16} className="text-emerald-500" />
                                            <h3 className="font-bold text-sm">Goals Progress</h3>
                                        </div>
                                        <button
                                            className="text-xs font-bold text-violet-500"
                                            onClick={() => navigate("/tools")}
                                        >
                                            View
                                        </button>
                                    </div>
                                    <p className="mt-3 text-2xl font-black text-emerald-500">
                                        {(data?.goals || []).length} Active
                                    </p>
                                    <div className="mt-3 space-y-2">
                                        {(data?.goals || []).slice(0, 3).map((g) => (
                                            <div key={g._id} className="surface-elevated p-2.5 rounded-xl text-xs">
                                                <div className="flex justify-between font-semibold">
                                                    <span className="truncate max-w-[110px]">{g.name}</span>
                                                    <span>{g.progress}%</span>
                                                </div>
                                                <div
                                                    className="mt-1.5 h-1.5 w-full rounded-full overflow-hidden"
                                                    style={{ background: "var(--border)" }}
                                                >
                                                    <div
                                                        className="h-full bg-emerald-500 rounded-full"
                                                        style={{ width: `${g.progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        {!(data?.goals || []).length && (
                                            <p className="text-xs text-secondary">No goals created yet.</p>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* Subscriptions Overview */}
                            <section className="surface p-5 rounded-2xl flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Repeat size={16} className="text-violet-500" />
                                            <h3 className="font-bold text-sm">Subscriptions</h3>
                                        </div>
                                        <button
                                            className="text-xs font-bold text-violet-500"
                                            onClick={() => navigate("/tools")}
                                        >
                                            View
                                        </button>
                                    </div>
                                    <p className="mt-3 text-2xl font-black text-violet-500">
                                        {money(data?.subscriptions?.monthlyCost || 0)}
                                        <span className="text-xs font-normal text-secondary ml-1">/mo</span>
                                    </p>
                                    <div className="mt-3 space-y-2">
                                        {(data?.subscriptions?.items || []).slice(0, 3).map((s) => (
                                            <div
                                                key={s._id}
                                                className="surface-elevated flex items-center justify-between p-2.5 rounded-xl text-xs"
                                            >
                                                <span className="font-semibold truncate max-w-[110px]">{s.name}</span>
                                                <span className="text-secondary">{money(s.amount)}</span>
                                            </div>
                                        ))}
                                        {!(data?.subscriptions?.items || []).length && (
                                            <p className="text-xs text-secondary">No active subscriptions.</p>
                                        )}
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Recent Transactions & Smart Financial Insights */}
                        <div className="mt-6 grid gap-6 lg:grid-cols-2">
                            {/* Recent Transactions */}
                            <section className="surface p-6 rounded-2xl">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="eyebrow">TRANSACTION HISTORY</p>
                                        <h2 className="section-title mt-1">Recent Activity</h2>
                                    </div>
                                    <button
                                        type="button"
                                        className="secondary-btn text-xs"
                                        onClick={() => navigate("/transactions")}
                                    >
                                        View All
                                    </button>
                                </div>
                                <div className="mt-4 space-y-2.5">
                                    {(data?.recentTransactions || []).map((t) => (
                                        <div
                                            key={t._id}
                                            className="surface-elevated flex items-center justify-between p-3.5 rounded-xl transition"
                                        >
                                            <div>
                                                <p className="font-semibold text-sm">{t.title}</p>
                                                <p className="text-xs text-secondary mt-0.5">
                                                    {t.category} ·{" "}
                                                    {new Date(t.date).toLocaleDateString("en-IN", {
                                                        day: "numeric",
                                                        month: "short",
                                                    })}
                                                </p>
                                            </div>
                                            <strong
                                                className={`text-sm font-bold ${
                                                    t.type === "Income"
                                                        ? "text-emerald-500"
                                                        : t.type === "Transfer"
                                                        ? "text-cyan-500"
                                                        : "text-rose-500"
                                                }`}
                                            >
                                                {t.type === "Income" ? "+" : t.type === "Expense" ? "-" : ""}
                                                {money(t.amount)}
                                            </strong>
                                        </div>
                                    ))}
                                    {!(data?.recentTransactions || []).length && (
                                        <p className="text-sm text-secondary py-4 text-center">
                                            No transactions recorded yet.
                                        </p>
                                    )}
                                </div>
                            </section>

                            {/* Lumify Intelligence / Copilot Highlight */}
                            <section
                                className="surface p-6 rounded-2xl flex flex-col justify-between"
                                style={{
                                    border: "1px solid rgba(124, 58, 237, 0.25)",
                                    background:
                                        "radial-gradient(circle at 90% 10%, rgba(124, 58, 237, 0.08), transparent 60%), var(--bg-card)",
                                }}
                            >
                                <div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-violet-500/15 flex items-center justify-center text-violet-500">
                                            <Sparkles size={20} />
                                        </div>
                                        <div>
                                            <p className="eyebrow">FINANCIAL INTELLIGENCE</p>
                                            <h2 className="section-title mt-0.5">Lumify Copilot Insights</h2>
                                        </div>
                                    </div>

                                    <div className="mt-5 space-y-3">
                                        {(data?.insights || []).slice(0, 4).map((insight, i) => (
                                            <div
                                                key={i}
                                                className="surface-elevated p-3.5 rounded-2xl border transition"
                                                style={{
                                                    borderColor:
                                                        insight.type === "danger"
                                                            ? "rgba(239, 68, 68, 0.3)"
                                                            : insight.type === "warning"
                                                            ? "rgba(245, 158, 11, 0.3)"
                                                            : insight.type === "success"
                                                            ? "rgba(16, 185, 129, 0.3)"
                                                            : "rgba(124, 58, 237, 0.2)",
                                                }}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <h4 className="font-bold text-xs" style={{ color: "var(--text-primary)" }}>
                                                        {insight.title}
                                                    </h4>
                                                    {insight.tag && (
                                                        <span
                                                            className={`badge text-[10px] ${
                                                                insight.type === "danger"
                                                                    ? "danger"
                                                                    : insight.type === "warning"
                                                                    ? "warning"
                                                                    : insight.type === "success"
                                                                    ? "success"
                                                                    : ""
                                                            }`}
                                                        >
                                                            {insight.tag}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-secondary mt-1.5 leading-relaxed">
                                                    {insight.text}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="primary-btn mt-5 w-full py-3 text-xs sm:text-sm font-bold"
                                    onClick={() => navigate("/ai")}
                                >
                                    <Sparkles size={15} /> Open Lumify Copilot &amp; Purchase Evaluator
                                </button>
                            </section>
                        </div>
                    </>
                )}
            </main>

            {/* Quick Add Modal directly from Dashboard */}
            {showForm && (
                <TransactionForm
                    initialData={{ type: formType }}
                    lockType={true}
                    onSubmit={handleQuickAdd}
                    onCancel={() => setShowForm(false)}
                />
            )}
        </div>
    );
}
