import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar/Sidebar";
import { addBudget, deleteBudget, getBudgets, updateBudget } from "../services/budgetService";
import { AlertTriangle, CheckCircle2, Edit3, Plus, Trash2, WalletCards, ShieldAlert } from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";

const monthName = (m) =>
    new Date(2026, m - 1, 1).toLocaleString("en-IN", { month: "long" });

const POPULAR_CATEGORIES = [
    "Food & Dining",
    "Shopping",
    "Groceries",
    "Transport",
    "Entertainment",
    "Utilities",
    "Healthcare",
    "Housing",
    "Travel",
    "Personal Care",
];

export default function Budget() {
    const { money, currencySymbol } = useCurrency();
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [data, setData] = useState({
        budgets: [],
        income: 0,
        expense: 0,
        savings: 0,
        overall: null,
        totalBudget: 0,
        totalSpent: 0,
        totalRemaining: 0,
    });
    const [form, setForm] = useState({ scope: "category", category: "", amount: "" });
    const [editing, setEditing] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [filterTab, setFilterTab] = useState("all"); // 'all' | 'warning' | 'safe'
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const load = async () => {
        setLoading(true);
        try {
            setData(await getBudgets(month, year));
            setError("");
        } catch (e) {
            setError(e.response?.data?.message || "Could not load budgets.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [month, year]);

    const categoryBudgets = useMemo(
        () => (data.budgets || []).filter((b) => b.scope !== "overall"),
        [data.budgets]
    );

    const warnings = useMemo(() => {
        return (data.budgets || []).filter(
            (b) => Number(b.progress || 0) >= 80 || Number(b.remaining || 0) < 0
        );
    }, [data.budgets]);

    const filteredBudgets = useMemo(() => {
        if (filterTab === "warning") {
            return categoryBudgets.filter((b) => Number(b.progress || 0) >= 80 || Number(b.remaining || 0) < 0);
        }
        if (filterTab === "safe") {
            return categoryBudgets.filter((b) => Number(b.progress || 0) < 80 && Number(b.remaining || 0) >= 0);
        }
        return categoryBudgets;
    }, [categoryBudgets, filterTab]);

    const progress = data.totalBudget
        ? Math.min(100, Math.max(0, Math.round((data.totalSpent / data.totalBudget) * 100)))
        : 0;

    const openCreate = (scope = "category") => {
        setEditing(null);
        setForm({ scope, category: "", amount: "" });
        setShowForm(true);
        setError("");
    };

    const openEdit = (b) => {
        setEditing(b);
        setForm({
            scope: b.scope || "category",
            category: b.scope === "overall" ? "" : b.category,
            amount: b.amount,
        });
        setShowForm(true);
        setError("");
    };

    const submit = async (e) => {
        e.preventDefault();
        if (form.scope === "category" && !form.category.trim())
            return setError("Please enter or pick a category.");
        if (!Number(form.amount) || Number(form.amount) <= 0)
            return setError("Budget limit must be greater than 0.");
        setSaving(true);
        try {
            const payload = { ...form, month, year, amount: Number(form.amount) };
            if (editing) await updateBudget(editing._id, payload);
            else await addBudget(payload);
            setShowForm(false);
            await load();
        } catch (e) {
            setError(e.response?.data?.message || "Could not save budget.");
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteBudget(deleteTarget._id);
            setDeleteTarget(null);
            await load();
        } catch (e) {
            setError(e.response?.data?.message || "Could not delete budget.");
        }
    };

    return (
        <div className="page-shell">
            <Sidebar />
            <main className="page-main">
                <div className="page-header">
                    <div>
                        <p className="eyebrow">BUDGET CONTROL &amp; TARGETS</p>
                        <h1 className="page-title">Budgets</h1>
                        <p className="page-subtitle">
                            Set proactive category limits, track real spending against actuals, and stop overruns early.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <select
                            className="input w-auto text-xs"
                            value={month}
                            onChange={(e) => setMonth(Number(e.target.value))}
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>
                                    {monthName(i + 1)}
                                </option>
                            ))}
                        </select>
                        <select
                            className="input w-auto text-xs"
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                        >
                            {Array.from({ length: 6 }, (_, i) => (
                                <option key={year - i} value={year - i}>
                                    {year - i}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            className="primary-btn w-auto text-xs"
                            onClick={() => openCreate("category")}
                        >
                            <Plus size={15} /> Add Budget
                        </button>
                    </div>
                </div>

                {error && <div className="alert error mb-5">{error}</div>}

                {loading ? (
                    <div className="surface flex min-h-72 items-center justify-center text-secondary">
                        Loading budget overview…
                    </div>
                ) : (
                    <>
                        {/* Proactive Warning Alerts Banner */}
                        {warnings.length > 0 && (
                            <div className="mb-6 rounded-3xl p-5 border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/20">
                                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm mb-3">
                                    <ShieldAlert size={18} />
                                    <span>Attention Required: {warnings.length} budget limit(s) near or exceeding threshold</span>
                                </div>
                                <div className="grid gap-2.5 sm:grid-cols-2">
                                    {warnings.map((w) => {
                                        const isExceeded = Number(w.remaining) < 0;
                                        const label = w.scope === "overall" ? "Overall Monthly Limit" : (w.displayCategory || w.category);
                                        return (
                                            <div
                                                key={w._id}
                                                className="flex items-start gap-3 rounded-2xl p-3 bg-white/70 dark:bg-slate-900/60 border border-amber-500/20 text-xs"
                                            >
                                                <span className={`text-base shrink-0 ${isExceeded ? "text-rose-500" : "text-amber-500"}`}>
                                                    {isExceeded ? "🚨" : "⚠️"}
                                                </span>
                                                <div className="flex-1">
                                                    <p className="font-bold" style={{ color: "var(--text-primary)" }}>
                                                        {label}
                                                    </p>
                                                    <p className="mt-0.5 text-secondary">
                                                        {isExceeded ? (
                                                            <span className="text-rose-500 font-semibold">
                                                                Exceeded by {money(Math.abs(w.remaining))} (Spent {money(w.spent)} of {money(w.amount)})
                                                            </span>
                                                        ) : (
                                                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                                                                {w.progress}% used · {money(w.remaining)} left of {money(w.amount)}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(w)}
                                                    className="secondary-btn text-[11px] py-1 px-2.5 shrink-0"
                                                >
                                                    Adjust
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="stats-grid">
                            <Stat title="Monthly Income" value={money(data.income)} tone="income" />
                            <Stat title="Monthly Expenses" value={money(data.expense)} tone="expense" />
                            <Stat title="Planned Budget" value={money(data.totalBudget)} tone="accent" />
                            <Stat
                                title="Budget Remaining"
                                value={money(data.totalRemaining)}
                                tone={data.totalRemaining < 0 ? "expense" : "income"}
                            />
                        </div>

                        <section className="surface mt-6 p-6">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="eyebrow">MONTHLY TARGETS</p>
                                    <h2 className="section-title mt-0.5">
                                        {monthName(month)} {year} Overall Budget
                                    </h2>
                                    <p className="text-secondary text-xs mt-1">
                                        {progress}% of the planned budget has been utilized.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="secondary-btn text-xs"
                                    onClick={() => openCreate("overall")}
                                >
                                    {data.overall ? "Edit Overall Limit" : "Set Overall Limit"}
                                </button>
                            </div>
                            <div
                                className="mt-4 h-3 w-full overflow-hidden rounded-full"
                                style={{ background: "var(--bg-elevated)" }}
                            >
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        progress >= 100
                                            ? "bg-rose-500"
                                            : progress >= 80
                                            ? "bg-amber-500"
                                            : "bg-emerald-500"
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                                />
                            </div>
                            <div className="mt-3 flex justify-between text-xs sm:text-sm">
                                <span className="text-secondary">Spent {money(data.totalSpent)}</span>
                                <strong
                                    className={data.totalRemaining < 0 ? "text-rose-500" : "text-cyan-500"}
                                >
                                    {money(data.totalRemaining)} {data.totalRemaining < 0 ? "exceeded" : "remaining"}
                                </strong>
                            </div>
                        </section>

                        {data.overall && (
                            <BudgetCard
                                budget={data.overall}
                                onEdit={() => openEdit(data.overall)}
                                onDelete={() => setDeleteTarget(data.overall)}
                                overall
                            />
                        )}

                        <section className="mt-8">
                            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="section-title">Category Budgets</h2>
                                    <p className="text-secondary text-xs mt-0.5">
                                        Limits matched against real category expenses.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1 rounded-xl p-1 surface-elevated border border-border">
                                        <button
                                            type="button"
                                            onClick={() => setFilterTab("all")}
                                            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                                                filterTab === "all"
                                                    ? "bg-violet-600 text-white shadow-sm"
                                                    : "text-secondary hover:text-primary"
                                            }`}
                                        >
                                            All ({categoryBudgets.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFilterTab("warning")}
                                            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                                                filterTab === "warning"
                                                    ? "bg-amber-500 text-white shadow-sm"
                                                    : "text-secondary hover:text-primary"
                                            }`}
                                        >
                                            Alerts ({warnings.filter(w => w.scope !== "overall").length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFilterTab("safe")}
                                            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                                                filterTab === "safe"
                                                    ? "bg-emerald-600 text-white shadow-sm"
                                                    : "text-secondary hover:text-primary"
                                            }`}
                                        >
                                            On Track
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {filteredBudgets.length === 0 ? (
                                <div className="empty-state">
                                    <WalletCards size={32} className="mx-auto text-violet-500 mb-2" />
                                    <h3>{filterTab === "all" ? "No category budgets yet" : "No budgets in this view"}</h3>
                                    <p>
                                        {filterTab === "all"
                                            ? "Create a budget for Food, Shopping, Transport, or any custom category."
                                            : "All budgets in this category are healthy and within set thresholds."}
                                    </p>
                                    {filterTab === "all" && (
                                        <button
                                            type="button"
                                            className="primary-btn mt-4 w-auto text-xs"
                                            onClick={() => openCreate("category")}
                                        >
                                            <Plus size={14} /> Create First Budget
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {filteredBudgets.map((b) => (
                                        <BudgetCard
                                            key={b._id}
                                            budget={b}
                                            onEdit={() => openEdit(b)}
                                            onDelete={() => setDeleteTarget(b)}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                )}

                {/* Form Modal */}
                {showForm && (
                    <div className="modal-backdrop" onClick={() => setShowForm(false)}>
                        <form
                            className="modal-card max-w-lg"
                            onSubmit={submit}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="eyebrow">{editing ? "EDIT BUDGET" : "NEW BUDGET"}</p>
                                    <h2 className="section-title mt-1">
                                        {form.scope === "overall" ? "Overall Monthly Budget" : "Category Budget"}
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    className="icon-btn"
                                    onClick={() => setShowForm(false)}
                                >
                                    ×
                                </button>
                            </div>
                            <div className="mt-6 grid gap-4">
                                {!editing && (
                                    <label className="field">
                                        Budget Type
                                        <select
                                            className="input"
                                            value={form.scope}
                                            onChange={(e) => setForm({ ...form, scope: e.target.value })}
                                        >
                                            <option value="category">Category Budget</option>
                                            <option value="overall">Overall Monthly Budget</option>
                                        </select>
                                    </label>
                                )}
                                {form.scope === "category" && (
                                    <div>
                                        <label className="field">
                                            Category
                                            <input
                                                className="input"
                                                value={form.category}
                                                onChange={(e) => setForm({ ...form, category: e.target.value })}
                                                placeholder="Food & Dining, Shopping, Travel…"
                                                required
                                            />
                                        </label>
                                        <div className="mt-2">
                                            <p className="text-[11px] text-secondary mb-1.5 font-medium">Quick suggestions:</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {POPULAR_CATEGORIES.map((cat) => (
                                                    <button
                                                        key={cat}
                                                        type="button"
                                                        onClick={() => setForm({ ...form, category: cat })}
                                                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                                                            form.category === cat
                                                                ? "bg-violet-600 text-white border-violet-600"
                                                                : "border-border surface-elevated text-secondary hover:text-primary"
                                                        }`}
                                                    >
                                                        {cat}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <label className="field">
                                    Monthly Limit ({currencySymbol})
                                    <input
                                        className="input"
                                        type="number"
                                        min="1"
                                        value={form.amount}
                                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                        placeholder={`${currencySymbol}10,000`}
                                        required
                                    />
                                </label>
                            </div>
                            <button disabled={saving} className="primary-btn mt-6 w-full">
                                {saving ? "Saving…" : editing ? "Save Changes" : "Create Budget"}
                            </button>
                        </form>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {deleteTarget && (
                    <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
                        <div className="modal-card max-w-sm" onClick={(e) => e.stopPropagation()}>
                            <h3 className="section-title text-rose-500">Delete Budget Limit?</h3>
                            <p className="text-secondary text-xs mt-2 leading-relaxed">
                                Are you sure you want to remove the budget for{" "}
                                <strong className="text-primary font-bold">
                                    {deleteTarget.scope === "overall" ? "Overall Spending" : (deleteTarget.displayCategory || deleteTarget.category)}
                                </strong>
                                ? Transactions will not be deleted, but category tracking will be removed.
                            </p>
                            <div className="mt-6 flex justify-end gap-2">
                                <button
                                    type="button"
                                    className="secondary-btn text-xs"
                                    onClick={() => setDeleteTarget(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="primary-btn bg-rose-600 hover:bg-rose-700 text-xs text-white"
                                    onClick={confirmDelete}
                                >
                                    Yes, Delete Budget
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

function BudgetCard({ budget, onEdit, onDelete, overall }) {
    const { money } = useCurrency();
    const pct = Number(budget.progress || 0);
    const danger = pct >= 100;
    const warning = pct >= 80 && !danger;

    return (
        <div className="surface p-5 rounded-3xl border border-border">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                        {overall ? "Overall Monthly Spending" : budget.displayCategory || budget.category}
                    </h3>
                    <p className="text-secondary text-xs mt-1">
                        Limit {money(budget.amount)} · Spent {money(budget.spent)}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`badge ${danger ? "danger" : warning ? "warning" : "success"}`}>
                        {danger ? "Exceeded" : warning ? "Warning" : "Safe"}
                    </span>
                    <button type="button" className="icon-btn" onClick={onEdit} title="Edit">
                        <Edit3 size={14} />
                    </button>
                    <button
                        type="button"
                        className="icon-btn text-rose-500 hover:text-rose-600"
                        onClick={onDelete}
                        title="Delete"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            <div
                className="mt-4 h-2.5 w-full rounded-full overflow-hidden"
                style={{ background: "var(--bg-elevated)" }}
            >
                <div
                    className={`h-full rounded-full transition-all duration-500 ${
                        danger ? "bg-rose-500" : warning ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-secondary">{pct}% utilized</span>
                <strong className={budget.remaining < 0 ? "text-rose-500 font-bold" : "text-cyan-500"}>
                    {money(budget.remaining)} {budget.remaining < 0 ? "over budget" : "remaining"}
                </strong>
            </div>

            {danger ? (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-rose-500 font-semibold">
                    <AlertTriangle size={13} /> You have exceeded this budget limit.
                </p>
            ) : warning ? (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-500 font-semibold">
                    <AlertTriangle size={13} /> Caution: 80%+ of this budget limit used.
                </p>
            ) : (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
                    <CheckCircle2 size={13} /> Spending is currently on track.
                </p>
            )}
        </div>
    );
}

function Stat({ title, value, tone }) {
    return (
        <div className="surface p-5">
            <p className="text-secondary text-xs uppercase font-bold tracking-wider">{title}</p>
            <p
                className={`mt-2 text-2xl font-black ${
                    tone === "income"
                        ? "text-emerald-500"
                        : tone === "expense"
                        ? "text-rose-500"
                        : "text-cyan-500"
                }`}
            >
                {value}
            </p>
        </div>
    );
}
