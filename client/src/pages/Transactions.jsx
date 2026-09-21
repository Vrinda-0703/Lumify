import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar/Sidebar";
import TransactionForm from "../components/Forms/TransactionForm";
import {
    getTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    transferFunds,
} from "../services/transactionService";
import { getAccounts } from "../services/accountService";
import { API_ORIGIN } from "../services/api";
import {
    Search,
    ArrowUpRight,
    ArrowDownRight,
    ArrowRightLeft,
    Trash2,
    Pencil,
    ReceiptText,
    X,
    Users,
    Download,
    Plus,
    AlertTriangle,
    WalletCards,
    RotateCcw,
    Calendar,
    Tag,
} from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const lastMonthStart = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().slice(0, 10);
};
const lastMonthEnd = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 0).toISOString().slice(0, 10);
};

export default function Transactions() {
    const { money } = useCurrency();
    const [rows, setRows] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formType, setFormType] = useState("Expense");
    const [editing, setEditing] = useState(null);
    const [showTransfer, setShowTransfer] = useState(false);
    const [deleteModal, setDeleteModal] = useState(null);

    // Streamlined filters
    const [filters, setFilters] = useState({
        search: "",
        type: "All",
        category: "All",
        account: "All",
        datePreset: "all",
        from: "",
        to: "",
        sort: "newest",
    });

    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const load = async () => {
        setLoading(true);
        try {
            const [t, a] = await Promise.all([
                getTransactions({ limit: 500, sort: "newest" }),
                getAccounts(),
            ]);
            setRows(Array.isArray(t) ? t : []);
            setAccounts(Array.isArray(a) ? a : []);
            setError("");
        } catch (e) {
            setError(e.response?.data?.message || "Could not load transactions.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const cats = useMemo(
        () => [...new Set(rows.map((r) => r.category).filter(Boolean))].sort(),
        [rows]
    );

    // Filter transactions with search query and parameters
    const filtered = useMemo(() => {
        const q = (filters.search || "").trim().toLowerCase();

        return rows
            .filter((t) => {
                const d = new Date(t.date);
                const ds = d.toISOString().slice(0, 10);

                if (q) {
                    const matchTitle = (t.title || "").toLowerCase().includes(q);
                    const matchCategory = (t.category || "").toLowerCase().includes(q);
                    const matchNote = (t.note || "").toLowerCase().includes(q);
                    if (!matchTitle && !matchCategory && !matchNote) return false;
                }

                if (filters.type !== "All" && t.type !== filters.type) return false;
                if (filters.category !== "All" && t.category !== filters.category) return false;
                if (
                    filters.account !== "All" &&
                    String(t.account?._id || t.account || "") !== filters.account
                ) {
                    return false;
                }

                if (filters.datePreset === "today") {
                    if (ds !== today()) return false;
                } else if (filters.datePreset === "this_week") {
                    const d7 = new Date();
                    d7.setDate(d7.getDate() - 6);
                    if (ds < d7.toISOString().slice(0, 10) || ds > today()) return false;
                } else if (filters.datePreset === "this_month") {
                    if (ds < monthStart() || ds > today()) return false;
                } else if (filters.datePreset === "last_month") {
                    if (ds < lastMonthStart() || ds > lastMonthEnd()) return false;
                } else if (filters.datePreset === "custom") {
                    if (filters.from && ds < filters.from) return false;
                    if (filters.to && ds > filters.to) return false;
                } else {
                    if (filters.from && ds < filters.from) return false;
                    if (filters.to && ds > filters.to) return false;
                }

                return true;
            })
            .sort((a, b) => {
                if (filters.sort === "highest") return Number(b.amount || 0) - Number(a.amount || 0);
                if (filters.sort === "lowest") return Number(a.amount || 0) - Number(b.amount || 0);
                if (filters.sort === "oldest") return new Date(a.date) - new Date(b.date);
                return new Date(b.date) - new Date(a.date);
            });
    }, [rows, filters]);

    const incomeRows = useMemo(() => filtered.filter((t) => t.type === "Income"), [filtered]);
    const expenseRows = useMemo(() => filtered.filter((t) => t.type === "Expense"), [filtered]);
    const transferRows = useMemo(() => filtered.filter((t) => t.type === "Transfer"), [filtered]);

    const income = useMemo(
        () => incomeRows.reduce((s, t) => s + Number(t.amount || 0), 0),
        [incomeRows]
    );

    const expense = useMemo(
        () => expenseRows.reduce((s, t) => s + Number(t.amount || 0), 0),
        [expenseRows]
    );

    const save = async (data) => {
        if (busy) return;
        setBusy(true);
        try {
            if (editing) await updateTransaction(editing._id, data);
            else await addTransaction(data);
            setShowForm(false);
            setEditing(null);
            await load();
        } catch (e) {
            setError(e.response?.data?.message || "Could not save transaction.");
        } finally {
            setBusy(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteModal || busy) return;
        setBusy(true);
        try {
            await deleteTransaction(deleteModal._id);
            setDeleteModal(null);
            await load();
        } catch (e) {
            setError(e.response?.data?.message || "Delete failed");
        } finally {
            setBusy(false);
        }
    };

    const clearFilters = () => {
        setFilters({
            search: "",
            type: "All",
            category: "All",
            account: "All",
            datePreset: "all",
            from: "",
            to: "",
            sort: "newest",
        });
    };

    const isFiltered =
        Boolean(filters.search) ||
        filters.type !== "All" ||
        filters.category !== "All" ||
        filters.account !== "All" ||
        filters.datePreset !== "all" ||
        Boolean(filters.from) ||
        Boolean(filters.to) ||
        filters.sort !== "newest";

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.search.trim()) count++;
        if (filters.type !== "All") count++;
        if (filters.category !== "All") count++;
        if (filters.account !== "All") count++;
        if (filters.datePreset !== "all") count++;
        if (filters.sort !== "newest") count++;
        return count;
    }, [filters]);

    const exportCsv = () => {
        if (!filtered.length) return;
        const headers = ["Title", "Type", "Category", "Amount", "Date", "Account", "Note"];
        const rowsCsv = filtered.map((t) => [
            t.title || "",
            t.type || "",
            t.category || "",
            t.amount || 0,
            t.date ? new Date(t.date).toISOString().slice(0, 10) : "",
            t.account?.name || (t.type === "Transfer" ? `${t.sourceAccount?.name} -> ${t.destinationAccount?.name}` : ""),
            t.note || "",
        ]);
        const content = [headers, ...rowsCsv]
            .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
            .join("\n");
        const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `lumify-transactions-${today()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="page-shell">
            <Sidebar />
            <main className="page-main">
                {/* 1. Page Header */}
                <div className="page-header">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <p className="eyebrow">FINANCIAL ACTIVITY</p>
                            <span className="badge info text-[10px] py-0.5 px-2 font-bold">
                                {rows.length} Total Records
                            </span>
                        </div>
                        <h1 className="page-title">Transactions</h1>
                        <p className="page-subtitle">
                            Monitor, categorize, and balance all incoming cash flow, expenses, and inter-account transfers.
                        </p>
                    </div>

                    {/* Action Buttons with Uniform Heights and Hierarchy */}
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                        <button
                            type="button"
                            className="secondary-btn h-10 text-xs sm:text-sm font-semibold px-4"
                            onClick={() => setShowTransfer(true)}
                        >
                            <ArrowRightLeft size={15} /> Move Funds
                        </button>
                        <button
                            type="button"
                            className="secondary-btn h-10 text-xs sm:text-sm font-semibold px-4 text-emerald-500 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20"
                            onClick={() => {
                                setEditing(null);
                                setFormType("Income");
                                setShowForm(true);
                            }}
                        >
                            <Plus size={15} /> Add Income
                        </button>
                        <button
                            type="button"
                            className="primary-btn h-10 text-xs sm:text-sm font-bold px-4"
                            onClick={() => {
                                setEditing(null);
                                setFormType("Expense");
                                setShowForm(true);
                            }}
                        >
                            <Plus size={15} /> Add Expense
                        </button>
                    </div>
                </div>

                {/* 2. Structured Summary Cards */}
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Total Income */}
                    <div className="surface p-5 sm:p-6 border border-emerald-500/20 rounded-2xl flex flex-col justify-between transition hover:-translate-y-0.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold tracking-wider text-secondary uppercase">
                                Total Income
                            </span>
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                <ArrowUpRight size={18} />
                            </div>
                        </div>
                        <div className="mt-3">
                            <p className="text-2xl sm:text-3xl font-black text-emerald-500 tabular-nums tracking-tight">
                                {money(income)}
                            </p>
                            <p className="text-xs text-secondary mt-1">
                                {incomeRows.length} income credit{incomeRows.length === 1 ? "" : "s"}
                            </p>
                        </div>
                    </div>

                    {/* Total Expenses */}
                    <div className="surface p-5 sm:p-6 border border-rose-500/20 rounded-2xl flex flex-col justify-between transition hover:-translate-y-0.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold tracking-wider text-secondary uppercase">
                                Total Expenses
                            </span>
                            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                                <ArrowDownRight size={18} />
                            </div>
                        </div>
                        <div className="mt-3">
                            <p className="text-2xl sm:text-3xl font-black text-rose-500 tabular-nums tracking-tight">
                                {money(expense)}
                            </p>
                            <p className="text-xs text-secondary mt-1">
                                {expenseRows.length} expense debit{expenseRows.length === 1 ? "" : "s"}
                            </p>
                        </div>
                    </div>

                    {/* Net Cash Flow */}
                    <div className="surface p-5 sm:p-6 border border-cyan-500/20 rounded-2xl flex flex-col justify-between transition hover:-translate-y-0.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold tracking-wider text-secondary uppercase">
                                Net Cash Flow
                            </span>
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
                                <WalletCards size={18} />
                            </div>
                        </div>
                        <div className="mt-3">
                            <p
                                className={`text-2xl sm:text-3xl font-black tabular-nums tracking-tight ${
                                    income - expense >= 0 ? "text-cyan-500" : "text-rose-500"
                                }`}
                            >
                                {money(income - expense)}
                            </p>
                            <p className="text-xs text-secondary mt-1">
                                {transferRows.length} internal transfer{transferRows.length === 1 ? "" : "s"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 3. Filter Console with Strict Grid Alignment */}
                <section className="surface p-5 mb-6 rounded-2xl space-y-4">
                    {/* Top Controls: Search Bar, Type Tabs & CSV Export */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                        {/* Search Input with Integrated Clear Button */}
                        <div className="relative flex-1">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
                            <input
                                className="input text-xs sm:text-sm h-10 pl-9 pr-9 w-full"
                                placeholder="Search by title, category, or note…"
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            />
                            {filters.search && (
                                <button
                                    type="button"
                                    onClick={() => setFilters({ ...filters, search: "" })}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary p-0.5"
                                    title="Clear search"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Type Segmented Tabs */}
                        <div className="inline-flex items-center p-1 rounded-xl bg-elevated border border-border shrink-0 self-start md:self-auto">
                            {["All", "Expense", "Income", "Transfer"].map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setFilters({ ...filters, type: t })}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                                        filters.type === t
                                            ? "bg-violet-600 text-white shadow-sm"
                                            : "text-secondary hover:text-primary"
                                    }`}
                                >
                                    {t === "All" ? "All Types" : t}
                                </button>
                            ))}
                        </div>

                        {/* Export CSV Button */}
                        <button
                            type="button"
                            onClick={exportCsv}
                            disabled={!filtered.length}
                            className="secondary-btn h-10 text-xs sm:text-sm font-semibold px-3.5 shrink-0"
                            title="Export filtered records as CSV"
                        >
                            <Download size={14} /> Export CSV
                        </button>
                    </div>

                    {/* Secondary Filters Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                        {/* Category Dropdown */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block">
                                Category
                            </label>
                            <select
                                className="input text-xs h-10 px-3 w-full"
                                value={filters.category}
                                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                            >
                                <option value="All">All Categories</option>
                                {cats.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Account Dropdown */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block">
                                Account
                            </label>
                            <select
                                className="input text-xs h-10 px-3 w-full"
                                value={filters.account}
                                onChange={(e) => setFilters({ ...filters, account: e.target.value })}
                            >
                                <option value="All">All Accounts</option>
                                {accounts.map((a) => (
                                    <option key={a._id} value={a._id}>
                                        {a.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Date Preset Dropdown */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block">
                                Timeframe
                            </label>
                            <select
                                className="input text-xs h-10 px-3 w-full"
                                value={filters.datePreset}
                                onChange={(e) => {
                                    const preset = e.target.value;
                                    if (preset === "all") {
                                        setFilters({ ...filters, datePreset: "all", from: "", to: "" });
                                    } else if (preset === "today") {
                                        setFilters({ ...filters, datePreset: "today", from: today(), to: today() });
                                    } else if (preset === "this_week") {
                                        const d = new Date();
                                        d.setDate(d.getDate() - 6);
                                        setFilters({
                                            ...filters,
                                            datePreset: "this_week",
                                            from: d.toISOString().slice(0, 10),
                                            to: today(),
                                        });
                                    } else if (preset === "this_month") {
                                        setFilters({
                                            ...filters,
                                            datePreset: "this_month",
                                            from: monthStart(),
                                            to: today(),
                                        });
                                    } else if (preset === "last_month") {
                                        setFilters({
                                            ...filters,
                                            datePreset: "last_month",
                                            from: lastMonthStart(),
                                            to: lastMonthEnd(),
                                        });
                                    } else {
                                        setFilters({ ...filters, datePreset: "custom" });
                                    }
                                }}
                            >
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="this_week">This Week</option>
                                <option value="this_month">This Month</option>
                                <option value="last_month">Last Month</option>
                                <option value="custom">Custom Range…</option>
                            </select>
                        </div>

                        {/* Sort Order Dropdown */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block">
                                Sort By
                            </label>
                            <select
                                className="input text-xs h-10 px-3 w-full"
                                value={filters.sort}
                                onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="highest">Highest Amount</option>
                                <option value="lowest">Lowest Amount</option>
                            </select>
                        </div>
                    </div>

                    {/* Contextual Custom Date Range Pickers (shown when Custom is chosen) */}
                    {filters.datePreset === "custom" && (
                        <div className="p-3 rounded-xl bg-elevated border border-border flex flex-wrap items-center gap-3 text-xs">
                            <span className="font-bold text-secondary flex items-center gap-1">
                                <Calendar size={13} /> Custom Dates:
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-secondary text-[11px]">From</span>
                                <input
                                    type="date"
                                    className="input text-xs h-8 py-1 px-2.5 w-auto"
                                    value={filters.from}
                                    onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-secondary text-[11px]">To</span>
                                <input
                                    type="date"
                                    className="input text-xs h-8 py-1 px-2.5 w-auto"
                                    value={filters.to}
                                    onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {/* Active Filter Summary Bar */}
                    {isFiltered && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs">
                            <div className="flex items-center gap-2 text-secondary">
                                <span className="font-semibold text-primary">
                                    Showing {filtered.length} of {rows.length} records
                                </span>
                                <span className="text-muted">·</span>
                                <span>{activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}</span>
                            </div>
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="text-xs font-bold text-rose-500 hover:text-rose-400 inline-flex items-center gap-1 transition px-2 py-1 rounded-lg hover:bg-rose-500/10"
                            >
                                <RotateCcw size={12} /> Reset All Filters
                            </button>
                        </div>
                    )}
                </section>

                {error && <div className="alert error mb-5">{error}</div>}

                {/* 4. Transactions Ledger Table */}
                <section className="surface overflow-hidden shadow-lg rounded-2xl border" style={{ borderColor: "var(--border)" }}>
                    {/* Table Card Header */}
                    <div className="p-4 sm:p-5 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
                        <div>
                            <h2 className="section-title">Transactions Ledger</h2>
                            <p className="text-xs text-secondary mt-0.5">
                                {loading
                                    ? "Loading ledger records…"
                                    : `${filtered.length} transaction${filtered.length === 1 ? "" : "s"} listed`}
                            </p>
                        </div>
                        {isFiltered && (
                            <span className="badge warning text-[10px] py-0.5 px-2.5">
                                Filtered View
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div className="p-16 text-center text-secondary text-sm">
                            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                            Loading your financial ledger…
                        </div>
                    ) : !filtered.length ? (
                        <div className="empty-state border-0 rounded-none py-16">
                            <ReceiptText size={36} className="mx-auto text-secondary mb-3 opacity-60" />
                            <h3 className="font-bold text-base">No transactions found</h3>
                            <p className="mt-1 text-xs text-secondary max-w-sm mx-auto">
                                {isFiltered
                                    ? "No transactions match your active filters. Try clearing or relaxing search criteria."
                                    : "Start recording your transactions to bring total clarity to your finances."}
                            </p>
                            {isFiltered ? (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="secondary-btn mt-4 text-xs inline-flex items-center gap-1.5"
                                >
                                    <RotateCcw size={13} /> Reset Filters
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="primary-btn mt-4 text-xs inline-flex items-center gap-1.5"
                                    onClick={() => {
                                        setEditing(null);
                                        setFormType("Expense");
                                        setShowForm(true);
                                    }}
                                >
                                    <Plus size={14} /> Add First Transaction
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Desktop & Tablet Ledger Table (Clean Grid Alignment) */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr
                                            className="border-b text-[11px] font-bold text-secondary uppercase tracking-wider surface-elevated"
                                            style={{ borderColor: "var(--border)" }}
                                        >
                                            <th className="py-3.5 px-5 font-bold">Transaction / Details</th>
                                            <th className="py-3.5 px-4 font-bold">Category</th>
                                            <th className="py-3.5 px-4 font-bold">Account</th>
                                            <th className="py-3.5 px-4 font-bold">Date</th>
                                            <th className="py-3.5 px-5 font-bold text-right">Amount</th>
                                            <th className="py-3.5 px-5 font-bold text-right w-24">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                                        {filtered.map((t) => (
                                            <tr
                                                key={t._id}
                                                className="transaction-row transition hover:bg-elevated/60"
                                            >
                                                {/* 1. Transaction Info */}
                                                <td className="py-4 px-5">
                                                    <div className="flex items-center gap-3.5">
                                                        <div
                                                            className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${
                                                                t.type === "Income"
                                                                    ? "bg-emerald-500/15 text-emerald-500"
                                                                    : t.type === "Transfer"
                                                                    ? "bg-cyan-500/15 text-cyan-500"
                                                                    : "bg-rose-500/15 text-rose-500"
                                                            }`}
                                                        >
                                                            {t.type === "Income" ? (
                                                                <ArrowUpRight size={18} />
                                                            ) : t.type === "Transfer" ? (
                                                                <ArrowRightLeft size={18} />
                                                            ) : (
                                                                <ArrowDownRight size={18} />
                                                            )}
                                                        </div>

                                                        <div className="min-w-0 max-w-xs lg:max-w-md">
                                                            <div className="flex items-center gap-2">
                                                                <span
                                                                    className="font-bold text-sm truncate"
                                                                    style={{ color: "var(--text-primary)" }}
                                                                >
                                                                    {t.title}
                                                                </span>
                                                                {t.sharedBudget && (
                                                                    <span className="badge info text-[10px] py-0.5 px-2">
                                                                        <Users size={10} className="mr-1 inline" /> Shared
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {t.note && (
                                                                <p className="text-[11px] text-muted truncate mt-0.5">
                                                                    {t.note}
                                                                </p>
                                                            )}

                                                            {t.receiptUrl && (
                                                                <a
                                                                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-cyan-500 hover:underline"
                                                                    href={`${API_ORIGIN}${t.receiptUrl}`}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                >
                                                                    <ReceiptText size={12} /> View Receipt
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* 2. Category Pill */}
                                                <td className="py-4 px-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-elevated border border-border text-primary">
                                                        <Tag size={11} className="text-secondary" />
                                                        {t.category || "Uncategorized"}
                                                    </span>
                                                </td>

                                                {/* 3. Account / Wallet */}
                                                <td className="py-4 px-4 text-xs text-secondary whitespace-nowrap">
                                                    {t.type === "Transfer" ? (
                                                        <span className="inline-flex items-center gap-1.5 font-medium text-cyan-500">
                                                            <span>{t.sourceAccount?.name || "Account"}</span>
                                                            <ArrowRightLeft size={12} className="shrink-0" />
                                                            <span>{t.destinationAccount?.name || "Account"}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 font-medium text-primary">
                                                            <WalletCards size={13} className="text-secondary" />
                                                            {t.account?.name || "Default Account"}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* 4. Formatted Date */}
                                                <td className="py-4 px-4 text-xs text-secondary whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1.5 font-medium">
                                                        <Calendar size={12} className="text-muted" />
                                                        {new Date(t.date).toLocaleDateString("en-IN", {
                                                            day: "numeric",
                                                            month: "short",
                                                            year: "numeric",
                                                        })}
                                                    </span>
                                                </td>

                                                {/* 5. Amount (Strictly Right-Aligned with Tabular Figures) */}
                                                <td className="py-4 px-5 text-right whitespace-nowrap">
                                                    <span
                                                        className={`text-base font-bold tabular-nums tracking-tight ${
                                                            t.type === "Income"
                                                                ? "text-emerald-500"
                                                                : t.type === "Transfer"
                                                                ? "text-cyan-500"
                                                                : "text-rose-500"
                                                        }`}
                                                    >
                                                        {t.type === "Income"
                                                            ? "+"
                                                            : t.type === "Expense"
                                                            ? "-"
                                                            : ""}
                                                        {money(t.amount)}
                                                    </span>
                                                </td>

                                                {/* 6. Actions (Reserved Width Keeps Column Always Aligned) */}
                                                <td className="py-4 px-5 text-right w-24 whitespace-nowrap">
                                                    {t.type !== "Transfer" ? (
                                                        <div className="inline-flex items-center justify-end gap-1">
                                                            <button
                                                                type="button"
                                                                disabled={busy}
                                                                onClick={() => {
                                                                    setEditing(t);
                                                                    setFormType(t.type);
                                                                    setShowForm(true);
                                                                }}
                                                                className="icon-btn p-1.5 text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10"
                                                                title="Edit Transaction"
                                                            >
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={busy}
                                                                onClick={() => setDeleteModal(t)}
                                                                className="icon-btn p-1.5 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                                                                title="Delete Transaction"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[11px] text-muted italic pr-3 font-mono">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View (Clean Vertical Flow for Small Screens) */}
                            <div className="md:hidden divide-y" style={{ borderColor: "var(--border)" }}>
                                {filtered.map((t) => (
                                    <div key={t._id} className="p-4 space-y-2.5">
                                        {/* Row 1: Icon, Title & Amount */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div
                                                    className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${
                                                        t.type === "Income"
                                                            ? "bg-emerald-500/15 text-emerald-500"
                                                            : t.type === "Transfer"
                                                            ? "bg-cyan-500/15 text-cyan-500"
                                                            : "bg-rose-500/15 text-rose-500"
                                                    }`}
                                                >
                                                    {t.type === "Income" ? (
                                                        <ArrowUpRight size={18} />
                                                    ) : t.type === "Transfer" ? (
                                                        <ArrowRightLeft size={18} />
                                                    ) : (
                                                        <ArrowDownRight size={18} />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <h3
                                                            className="font-bold text-sm truncate"
                                                            style={{ color: "var(--text-primary)" }}
                                                        >
                                                            {t.title}
                                                        </h3>
                                                        {t.sharedBudget && (
                                                            <span className="badge info text-[10px] py-0 px-1.5">
                                                                Shared
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-secondary mt-0.5">
                                                        {new Date(t.date).toLocaleDateString("en-IN", {
                                                            day: "numeric",
                                                            month: "short",
                                                            year: "numeric",
                                                        })}
                                                    </p>
                                                </div>
                                            </div>

                                            <span
                                                className={`text-base font-bold tabular-nums shrink-0 ${
                                                    t.type === "Income"
                                                        ? "text-emerald-500"
                                                        : t.type === "Transfer"
                                                        ? "text-cyan-500"
                                                        : "text-rose-500"
                                                }`}
                                            >
                                                {t.type === "Income" ? "+" : t.type === "Expense" ? "-" : ""}
                                                {money(t.amount)}
                                            </span>
                                        </div>

                                        {/* Row 2: Category & Account Badges + Action Buttons */}
                                        <div className="flex items-center justify-between gap-2 pt-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-elevated border border-border text-primary">
                                                    {t.category || "General"}
                                                </span>
                                                <span className="text-[11px] text-secondary font-medium">
                                                    {t.type === "Transfer"
                                                        ? `${t.sourceAccount?.name || "Account"} → ${
                                                              t.destinationAccount?.name || "Account"
                                                          }`
                                                        : (t.account?.name || "Account")}
                                                </span>
                                            </div>

                                            {t.type !== "Transfer" && (
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        type="button"
                                                        disabled={busy}
                                                        onClick={() => {
                                                            setEditing(t);
                                                            setFormType(t.type);
                                                            setShowForm(true);
                                                        }}
                                                        className="icon-btn p-1.5 text-cyan-500 hover:text-cyan-400"
                                                        title="Edit"
                                                    >
                                                        <Pencil size={13} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={busy}
                                                        onClick={() => setDeleteModal(t)}
                                                        className="icon-btn p-1.5 text-rose-500 hover:text-rose-400"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Row 3: Notes & Receipt */}
                                        {(t.note || t.receiptUrl) && (
                                            <div
                                                className="text-xs text-muted pt-1 border-t border-dashed"
                                                style={{ borderColor: "var(--border)" }}
                                            >
                                                {t.note && <p className="truncate">{t.note}</p>}
                                                {t.receiptUrl && (
                                                    <a
                                                        className="inline-flex items-center gap-1 text-xs text-cyan-500 hover:underline mt-1 font-semibold"
                                                        href={`${API_ORIGIN}${t.receiptUrl}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        <ReceiptText size={11} /> View Receipt
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Ledger Table Footer Summary */}
                            <div
                                className="p-4 sm:px-6 surface-elevated border-t flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-secondary"
                                style={{ borderColor: "var(--border)" }}
                            >
                                <span>
                                    Displaying <strong className="text-primary font-bold">{filtered.length}</strong> of{" "}
                                    <strong className="text-primary font-bold">{rows.length}</strong> total records
                                </span>
                                <div className="flex items-center gap-4">
                                    <span>
                                        Filtered Net:{" "}
                                        <strong
                                            className={`font-bold ${
                                                income - expense >= 0 ? "text-cyan-500" : "text-rose-500"
                                            }`}
                                        >
                                            {money(income - expense)}
                                        </strong>
                                    </span>
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </main>

            {/* Add / Edit Transaction Modal */}
            {showForm && (
                <TransactionForm
                    initialData={editing || { type: formType }}
                    onSubmit={save}
                    onCancel={() => {
                        setShowForm(false);
                        setEditing(null);
                    }}
                />
            )}

            {/* Account Transfer Modal */}
            {showTransfer && (
                <TransferModal
                    accounts={accounts}
                    onClose={() => setShowTransfer(false)}
                    onSaved={async () => {
                        setShowTransfer(false);
                        await load();
                    }}
                />
            )}

            {/* Friendly Delete Confirmation Modal */}
            {deleteModal && (
                <div className="modal-backdrop" onClick={() => setDeleteModal(null)}>
                    <div
                        className="modal-card max-w-sm"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                            <AlertTriangle size={24} />
                        </div>
                        <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                            Delete Transaction?
                        </h3>
                        <p className="text-xs text-secondary mt-1 leading-relaxed">
                            Are you sure you want to remove <strong>&ldquo;{deleteModal.title}&rdquo;</strong> ({money(deleteModal.amount)})? This will update your balances and monthly budgets immediately.
                        </p>
                        <div className="mt-5 flex items-center justify-end gap-2.5">
                            <button
                                type="button"
                                className="secondary-btn text-xs"
                                onClick={() => setDeleteModal(null)}
                                disabled={busy}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="primary-btn text-xs bg-rose-600 hover:bg-rose-700 text-white border-0"
                                onClick={confirmDelete}
                                disabled={busy}
                            >
                                {busy ? "Deleting…" : "Yes, Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function TransferModal({ accounts, onClose, onSaved }) {
    const { money, currencySymbol } = useCurrency();
    const [f, setF] = useState({
        sourceAccount: "",
        destinationAccount: "",
        amount: "",
        date: today(),
        note: "",
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        if (!f.sourceAccount || !f.destinationAccount) {
            return setError("Please select both source and destination accounts.");
        }
        if (f.sourceAccount === f.destinationAccount) {
            return setError("Source and destination accounts must be different.");
        }
        if (!Number(f.amount) || Number(f.amount) <= 0) {
            return setError("Transfer amount must be greater than 0.");
        }
        setBusy(true);
        try {
            await transferFunds({ ...f, amount: Number(f.amount) });
            await onSaved();
        } catch (e) {
            setError(e.response?.data?.message || "Transfer failed");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <form
                onSubmit={submit}
                onClick={(e) => e.stopPropagation()}
                className="modal-card max-w-lg"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <p className="eyebrow">ACCOUNT TRANSFER</p>
                        <h2 className="section-title mt-1">Move Funds</h2>
                    </div>
                    <button type="button" className="icon-btn" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>

                <div className="mt-6 grid gap-4">
                    <label className="field">
                        From Account
                        <select
                            className="input text-xs sm:text-sm h-11"
                            value={f.sourceAccount}
                            onChange={(e) => setF({ ...f, sourceAccount: e.target.value })}
                            required
                        >
                            <option value="">Select source account</option>
                            {accounts.map((a) => (
                                <option key={a._id} value={a._id}>
                                    {a.name} · {money(a.balance ?? a.currentBalance ?? a.openingBalance)}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="field">
                        To Account
                        <select
                            className="input text-xs sm:text-sm h-11"
                            value={f.destinationAccount}
                            onChange={(e) => setF({ ...f, destinationAccount: e.target.value })}
                            required
                        >
                            <option value="">Select destination account</option>
                            {accounts.map((a) => (
                                <option key={a._id} value={a._id}>
                                    {a.name} · {money(a.balance ?? a.currentBalance ?? a.openingBalance)}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="field">
                            Amount ({currencySymbol})
                            <input
                                className="input text-xs sm:text-sm h-11"
                                type="number"
                                min="1"
                                placeholder={`${currencySymbol}1,000`}
                                value={f.amount}
                                onChange={(e) => setF({ ...f, amount: e.target.value })}
                                required
                            />
                        </label>
                        <label className="field">
                            Date
                            <input
                                className="input text-xs sm:text-sm h-11"
                                type="date"
                                value={f.date}
                                onChange={(e) => setF({ ...f, date: e.target.value })}
                                required
                            />
                        </label>
                    </div>

                    <label className="field">
                        Note (Optional)
                        <input
                            className="input text-xs sm:text-sm h-11"
                            placeholder="e.g. ATM withdrawal, rent transfer"
                            value={f.note}
                            onChange={(e) => setF({ ...f, note: e.target.value })}
                        />
                    </label>

                    {error && <div className="alert error text-xs">{error}</div>}

                    <div className="flex items-center justify-end gap-2.5 mt-2">
                        <button
                            type="button"
                            className="secondary-btn text-xs sm:text-sm h-10 px-4"
                            onClick={onClose}
                            disabled={busy}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={busy}
                            className="primary-btn text-xs sm:text-sm h-10 px-5"
                        >
                            {busy ? "Transferring…" : "Complete Transfer"}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
