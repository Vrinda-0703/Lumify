import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar/Sidebar";
import {
    billService,
    goalService,
    subscriptionService,
    sharedBudgetService,
    calendarService,
} from "../services/featureService";
import {
    addAccount,
    deleteAccount,
    getAccountTransactions,
    getAccounts,
    updateAccount,
} from "../services/accountService";
import { addTransaction } from "../services/transactionService";
import TransactionForm from "../components/Forms/TransactionForm";
import {
    AlertCircle,
    Check,
    ChevronLeft,
    ChevronRight,
    Coins,
    Edit3,
    History,
    LogOut,
    Pause,
    Play,
    Plus,
    RefreshCw,
    Trash2,
    UserPlus,
    X,
} from "lucide-react";
import { useCurrency, CURRENCIES } from "../context/CurrencyContext";

const money = (n) => {
    const code = localStorage.getItem("lumify_currency") || "INR";
    const curr = CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];
    return new Intl.NumberFormat(curr.locale, {
        style: "currency",
        currency: curr.code,
        maximumFractionDigits: 0,
    }).format(Number(n) || 0);
};

const iso = (d = new Date()) => {
    const x = new Date(d);
    return Number.isNaN(x.getTime()) ? "" : x.toISOString().slice(0, 10);
};

const fmt = (d) =>
    d
        ? new Date(d).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
          })
        : "—";

const empty = {
    bill: {
        title: "",
        amount: "",
        dueDate: iso(),
        recurring: false,
        frequency: "None",
        notes: "",
        paid: false,
    },
    goal: { name: "", targetAmount: "", savedAmount: 0, targetDate: "", description: "" },
    subscription: { name: "", amount: "", nextBillingDate: iso(), billingCycle: "Monthly", active: true },
    account: { name: "", type: "Bank", openingBalance: 0, notes: "" },
    shared: {
        name: "",
        amount: "",
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
    },
};

export default function SmartTools() {
    const { currency } = useCurrency();
    const [bills, setBills] = useState([]);
    const [goals, setGoals] = useState([]);
    const [subs, setSubs] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [shared, setShared] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [modal, setModal] = useState(null);
    const [history, setHistory] = useState(null);
    const [confirmModal, setConfirmModal] = useState(null);
    const [sharedExpenseBudget, setSharedExpenseBudget] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const [b, g, s, a, sh, e] = await Promise.all([
                billService.list(),
                goalService.list(),
                subscriptionService.list(),
                getAccounts(),
                sharedBudgetService.list(),
                calendarService.list(),
            ]);
            setBills(Array.isArray(b) ? b : []);
            setGoals(Array.isArray(g) ? g : []);
            setSubs(Array.isArray(s) ? s : []);
            setAccounts(Array.isArray(a) ? a : []);
            setShared(Array.isArray(sh) ? sh : []);
            setEvents(Array.isArray(e) ? e : []);
            setError("");
        } catch (e) {
            setError(e.response?.data?.message || "Could not load Smart Tools.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [currency]);

    const upcoming = bills.filter((b) => !b.paid).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    const dueToday = upcoming.filter((b) => iso(b.dueDate) === iso());
    const overdue = upcoming.filter(
        (b) => new Date(b.dueDate) < new Date(new Date().setHours(0, 0, 0, 0))
    );

    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const currentUserId = String(currentUser._id || currentUser.id || "");
    const currentUserEmail = String(currentUser.email || "").toLowerCase();
    const pendingInvites = shared.filter((b) =>
        (b.members || []).some(
            (m) =>
                m.status === "pending" &&
                ((currentUserId && String(m.user?._id || m.user) === currentUserId) ||
                    (currentUserEmail && String(m.email || "").toLowerCase() === currentUserEmail))
        )
    );

    // Token Invite handling (from ?invite=... or ?inviteToken=...)
    const [tokenInvite, setTokenInvite] = useState(null);
    const [tokenLoading, setTokenLoading] = useState(false);
    const [tokenActionBusy, setTokenActionBusy] = useState(false);
    const [tokenMsg, setTokenMsg] = useState("");
    const [tokenErr, setTokenErr] = useState("");

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("invite") || params.get("inviteToken");
        if (token) {
            setTokenLoading(true);
            setTokenErr("");
            sharedBudgetService
                .getInvitation(token)
                .then((data) => setTokenInvite({ ...data, token }))
                .catch((e) => {
                    setTokenErr(e.response?.data?.message || "Invalid or expired invitation link.");
                })
                .finally(() => setTokenLoading(false));
        }
    }, []);

    const respondTokenInvite = async (status) => {
        if (!tokenInvite?.token) return;
        setTokenActionBusy(true);
        setTokenErr("");
        try {
            const res = await sharedBudgetService.respondByToken(tokenInvite.token, status);
            setTokenMsg(res.message || (status === "accepted" ? "Successfully joined the shared budget!" : "Invitation declined."));
            await load();
            setTimeout(() => {
                setTokenInvite(null);
                const url = new URL(window.location.href);
                url.searchParams.delete("invite");
                url.searchParams.delete("inviteToken");
                window.history.replaceState({}, "", url.pathname);
            }, 3000);
        } catch (e) {
            setTokenErr(e.response?.data?.message || "Failed to respond to invitation.");
        } finally {
            setTokenActionBusy(false);
        }
    };

    const dismissTokenInvite = () => {
        setTokenInvite(null);
        setTokenErr("");
        setTokenMsg("");
        const url = new URL(window.location.href);
        url.searchParams.delete("invite");
        url.searchParams.delete("inviteToken");
        window.history.replaceState({}, "", url.pathname);
    };

    const act = async (fn) => {
        try {
            await fn();
            await load();
        } catch (e) {
            setError(e.response?.data?.message || "Action failed");
        }
    };

    const open = (type, item = null) => setModal({ type, item });

    return (
        <div className="page-shell">
            <Sidebar />
            <main className="page-main">
                <div className="page-header">
                    <div>
                        <p className="eyebrow">FINANCIAL UTILITIES</p>
                        <h1 className="page-title">Smart Tools</h1>
                        <p className="page-subtitle">
                            Bills, goals, recurring subscriptions, wallets, shared ledgers, and financial calendar.
                        </p>
                    </div>
                </div>

                {/* Direct Token Invitation Modal / Alert */}
                {(tokenLoading || tokenInvite || tokenErr) && (
                    <div className="mb-6 p-5 rounded-3xl border border-violet-500/30 bg-violet-500/10 shadow-sm animate-in fade-in">
                        {tokenLoading ? (
                            <div className="flex items-center gap-3 text-secondary text-sm">
                                <RefreshCw size={18} className="animate-spin text-violet-500" />
                                Validating your invitation link…
                            </div>
                        ) : tokenErr ? (
                            <div className="flex items-start justify-between gap-3 text-xs text-rose-400">
                                <div className="flex items-center gap-2">
                                    <AlertCircle size={16} className="shrink-0 text-rose-500" />
                                    <span>{tokenErr}</span>
                                </div>
                                <button type="button" onClick={dismissTokenInvite} className="text-secondary hover:text-primary">
                                    <X size={15} />
                                </button>
                            </div>
                        ) : tokenInvite ? (
                            <div>
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="badge warning text-[10px]">Email Invitation</span>
                                        <span className="text-secondary text-xs">Shared Budget Collaboration</span>
                                    </div>
                                    <button type="button" onClick={dismissTokenInvite} className="text-secondary hover:text-primary" title="Dismiss">
                                        <X size={15} />
                                    </button>
                                </div>

                                <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                                    You're invited to collaborate on &ldquo;{tokenInvite.budgetName}&rdquo;
                                </h3>
                                <p className="text-xs text-secondary mt-1">
                                    Invited by <strong className="text-primary">{tokenInvite.owner?.name || tokenInvite.owner?.email}</strong> · Budget limit: {money(tokenInvite.budgetAmount)}
                                </p>

                                {tokenMsg && (
                                    <div className="alert success text-xs py-2 my-3">
                                        {tokenMsg}
                                    </div>
                                )}

                                {tokenInvite.isExpired ? (
                                    <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                                        This invitation link expired on {new Date(tokenInvite.inviteExpires).toLocaleDateString()}. Please request a new invitation from the budget owner.
                                    </div>
                                ) : tokenInvite.status === "accepted" ? (
                                    <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                                        You are already an active collaborator on this budget.
                                    </div>
                                ) : (
                                    <div className="mt-4 flex items-center gap-3">
                                        <button
                                            type="button"
                                            disabled={tokenActionBusy}
                                            onClick={() => respondTokenInvite("accepted")}
                                            className="primary-btn text-xs py-2 px-5 flex items-center gap-1.5"
                                        >
                                            {tokenActionBusy ? (
                                                <>
                                                    <RefreshCw size={13} className="animate-spin" /> Processing…
                                                </>
                                            ) : (
                                                <>
                                                    <Check size={14} /> Accept Invitation
                                                </>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={tokenActionBusy}
                                            onClick={() => respondTokenInvite("declined")}
                                            className="secondary-btn text-xs py-2 px-4 text-rose-500 hover:text-rose-600"
                                        >
                                            Decline
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>
                )}

                {error && <div className="alert error mb-5">{error}</div>}

                {loading ? (
                    <div className="surface flex min-h-72 items-center justify-center text-secondary">
                        Loading your financial tools…
                    </div>
                ) : (
                    <>
                        {(dueToday.length > 0 || overdue.length > 0) && (
                            <div className="mb-6 grid gap-3 md:grid-cols-2">
                                {overdue.length > 0 && (
                                    <div className="alert error font-medium">
                                        <strong>{overdue.length} overdue bill(s).</strong> Please settle these to avoid late fees or credit impact.
                                    </div>
                                )}
                                {dueToday.length > 0 && (
                                    <div
                                        className="alert font-medium"
                                        style={{
                                            background: "rgba(245,158,11,0.12)",
                                            border: "1px solid rgba(245,158,11,0.28)",
                                            color: "#d97706",
                                        }}
                                    >
                                        <strong>{dueToday.length} bill(s) due today.</strong> Mark paid after completing payments.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SECTION 1: BILLS */}
                        <Section
                            title="Bills & Reminders"
                            subtitle="Track upcoming due dates and recurring obligations."
                            add="Add Bill"
                            onAdd={() => open("bill")}
                        >
                            <div className="grid gap-4 lg:grid-cols-2">
                                {bills.map((b) => (
                                    <div className="surface p-5" key={b._id}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                                                    {b.title}
                                                </h3>
                                                <p className="text-secondary text-xs mt-1">
                                                    {money(b.amount)} · due {fmt(b.dueDate)}
                                                </p>
                                            </div>
                                            <span
                                                className={`badge ${
                                                    b.paid
                                                        ? "success"
                                                        : new Date(b.dueDate) < new Date()
                                                        ? "danger"
                                                        : "warning"
                                                }`}
                                            >
                                                {b.paid ? "Paid" : new Date(b.dueDate) < new Date() ? "Overdue" : "Due"}
                                            </span>
                                        </div>
                                        <p className="mt-3 text-xs text-secondary">
                                            {b.recurring ? `Repeats ${b.frequency.toLowerCase()}` : "One-time"}
                                            {b.notes ? ` · ${b.notes}` : ""}
                                        </p>
                                        <div className="mt-4 flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                className="secondary-btn text-xs py-1.5"
                                                onClick={() => act(() => billService.update(b._id, { paid: !b.paid }))}
                                            >
                                                {b.paid ? "Mark Unpaid" : "Mark Paid"}
                                            </button>
                                            <button
                                                type="button"
                                                className="icon-btn"
                                                onClick={() => open("bill", b)}
                                                title="Edit"
                                            >
                                                <Edit3 size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                className="icon-btn text-rose-500 hover:text-rose-600"
                                                onClick={() =>
                                                    setConfirmModal({
                                                        title: "Delete Bill?",
                                                        message: `Are you sure you want to delete the bill for "${b.title}"?`,
                                                        onConfirm: () => act(() => billService.remove(b._id)),
                                                    })
                                                }
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {!bills.length && (
                                    <Empty
                                        title="No bills added"
                                        text="Add rent, electricity, credit card bills, tuition, or other recurring obligations."
                                    />
                                )}
                            </div>
                        </Section>

                        {/* SECTION 2: GOALS */}
                        <Section
                            title="Savings Goals"
                            subtitle="Save towards meaningful milestones with an honest contribution history."
                            add="Add Goal"
                            onAdd={() => open("goal")}
                        >
                            <div className="grid gap-4 lg:grid-cols-2">
                                {goals.map((g) => {
                                    const pct = Math.min(
                                        100,
                                        Math.round((Number(g.savedAmount || 0) / Number(g.targetAmount || 1)) * 100)
                                    );
                                    return (
                                        <div className="surface p-5" key={g._id}>
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                                                        {g.name}
                                                    </h3>
                                                    <p className="text-secondary text-xs mt-1">
                                                        {money(g.savedAmount)} of {money(g.targetAmount)}
                                                    </p>
                                                </div>
                                                <span className="chip text-xs font-bold">{pct}%</span>
                                            </div>

                                            <div
                                                className="mt-3.5 h-2 w-full rounded-full overflow-hidden"
                                                style={{ background: "var(--bg-elevated)" }}
                                            >
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 transition-all duration-500"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>

                                            <div className="mt-2.5 flex justify-between text-xs text-secondary">
                                                <span>{g.targetDate ? `Deadline: ${fmt(g.targetDate)}` : "No deadline"}</span>
                                                <strong className="text-cyan-500">
                                                    {money(Math.max(0, g.targetAmount - g.savedAmount))} left
                                                </strong>
                                            </div>

                                            <div className="mt-3.5 rounded-xl surface-elevated p-2.5 text-xs text-secondary">
                                                <strong>Suggested saving:</strong> {recommended(g)}
                                            </div>

                                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                                <button
                                                    type="button"
                                                    className="primary-btn text-xs py-1.5"
                                                    onClick={() => setHistory({ goal: g })}
                                                >
                                                    Add Contribution
                                                </button>
                                                <button
                                                    type="button"
                                                    className="secondary-btn text-xs py-1.5"
                                                    onClick={() => setHistory({ goal: g, historyOnly: true })}
                                                >
                                                    <History size={13} /> History ({g.contributions?.length || 0})
                                                </button>
                                                <button
                                                    type="button"
                                                    className="icon-btn"
                                                    onClick={() => open("goal", g)}
                                                    title="Edit"
                                                >
                                                    <Edit3 size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="icon-btn text-rose-500 hover:text-rose-600"
                                                    onClick={() =>
                                                        setConfirmModal({
                                                            title: "Delete Goal?",
                                                            message: `Are you sure you want to delete "${g.name}"? Recorded contributions will be removed.`,
                                                            onConfirm: () => act(() => goalService.remove(g._id)),
                                                        })
                                                    }
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {!goals.length && (
                                    <Empty
                                        title="No goals set"
                                        text="Create an emergency fund, travel fund, education, or gadget purchase goal."
                                    />
                                )}
                            </div>
                        </Section>

                        {/* SECTION 3: SUBSCRIPTIONS */}
                        <Section
                            title="Subscriptions"
                            subtitle="Monitor recurring subscription charges and pause unused memberships."
                            add="Add Subscription"
                            onAdd={() => open("subscription")}
                        >
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {subs.map((s) => (
                                    <div className="surface p-5" key={s._id}>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                                                    {s.name}
                                                </h3>
                                                <p className="text-secondary text-xs mt-1">
                                                    {money(s.amount)} / {s.billingCycle.toLowerCase()}
                                                </p>
                                            </div>
                                            <span className={`badge ${s.active ? "success" : "info"}`}>
                                                {s.active ? "Active" : "Paused"}
                                            </span>
                                        </div>
                                        <p className="mt-3 text-xs text-secondary">
                                            Next renewal: {fmt(s.nextBillingDate)}
                                        </p>
                                        <div className="mt-4 flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                className="secondary-btn text-xs py-1.5"
                                                onClick={() => act(() => subscriptionService.update(s._id, { active: !s.active }))}
                                            >
                                                {s.active ? (
                                                    <>
                                                        <Pause size={13} /> Pause
                                                    </>
                                                ) : (
                                                    <>
                                                        <Play size={13} /> Resume
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                className="icon-btn"
                                                onClick={() => open("subscription", s)}
                                                title="Edit"
                                            >
                                                <Edit3 size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                className="icon-btn text-rose-500 hover:text-rose-600"
                                                onClick={() =>
                                                    setConfirmModal({
                                                        title: "Delete Subscription?",
                                                        message: `Are you sure you want to delete "${s.name}"?`,
                                                        onConfirm: () => act(() => subscriptionService.remove(s._id)),
                                                    })
                                                }
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {!subs.length && (
                                    <Empty
                                        title="No subscriptions"
                                        text="Keep track of Netflix, Spotify, cloud storage, gym memberships, and SaaS tools."
                                    />
                                )}
                            </div>
                        </Section>

                        {/* SECTION 4: ACCOUNTS & WALLETS */}
                        <Section
                            title="Accounts & Wallets"
                            subtitle="Opening balances, transfers, and real-time ledger balances stay consistent."
                            add="Add Account"
                            onAdd={() => open("account")}
                        >
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {accounts.map((a) => (
                                    <div className="surface p-5" key={a._id}>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                                                    {a.name}
                                                </h3>
                                                <p className="text-secondary text-xs mt-0.5">{a.type}</p>
                                            </div>
                                            <span className="text-lg font-black text-cyan-500">
                                                {money(a.balance)}
                                            </span>
                                        </div>
                                        <div className="mt-3.5 grid grid-cols-3 gap-2 text-xs">
                                            <div>
                                                <span className="text-secondary text-[11px]">Income</span>
                                                <strong className="mt-0.5 block text-emerald-500">{money(a.income)}</strong>
                                            </div>
                                            <div>
                                                <span className="text-secondary text-[11px]">Expense</span>
                                                <strong className="mt-0.5 block text-rose-500">{money(a.expense)}</strong>
                                            </div>
                                            <div>
                                                <span className="text-secondary text-[11px]">Transfers</span>
                                                <strong className="mt-0.5 block">
                                                    {money((a.incomingTransfers || 0) - (a.outgoingTransfers || 0))}
                                                </strong>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex gap-2">
                                            <button
                                                type="button"
                                                className="secondary-btn text-xs py-1.5 flex-1"
                                                onClick={async () => {
                                                    try {
                                                        setHistory({
                                                            account: a,
                                                            transactions: await getAccountTransactions(a._id),
                                                        });
                                                    } catch (e) {
                                                        setError(e.response?.data?.message || "Could not load history");
                                                    }
                                                }}
                                            >
                                                <History size={13} /> History
                                            </button>
                                            <button
                                                type="button"
                                                className="icon-btn"
                                                onClick={() => open("account", a)}
                                                title="Edit"
                                            >
                                                <Edit3 size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                className="icon-btn text-rose-500 hover:text-rose-600"
                                                onClick={() =>
                                                    setConfirmModal({
                                                        title: "Delete Account?",
                                                        message: `Delete "${a.name}"? Transactions associated with this account will remain safely preserved with account unlinked.`,
                                                        onConfirm: () => act(() => deleteAccount(a._id)),
                                                    })
                                                }
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {!accounts.length && (
                                    <Empty
                                        title="No accounts added"
                                        text="Add bank accounts, cash, UPI wallets, or credit cards to see true balances."
                                    />
                                )}
                            </div>
                        </Section>

                        {/* SECTION 5: SHARED BUDGET */}
                        <Section
                            title="Shared Budgets"
                            subtitle="Collaborate on household, travel, or project expenses with friends & family."
                            add="Create Shared Budget"
                            onAdd={() => open("shared")}
                        >
                            {/* Pending Invitations Alert Banner */}
                            {pendingInvites.length > 0 && (
                                <div className="mb-4 space-y-3">
                                    {pendingInvites.map((p) => (
                                        <div
                                            key={p._id}
                                            className="p-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-violet-500/20 text-violet-500 flex items-center justify-center shrink-0 mt-0.5">
                                                    <AlertCircle size={16} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="badge warning text-[10px]">Action Required</span>
                                                        <span className="text-secondary text-xs">Shared Budget Invitation</span>
                                                    </div>
                                                    <h4 className="font-bold text-sm mt-0.5" style={{ color: "var(--text-primary)" }}>
                                                        {p.name}
                                                    </h4>
                                                    <p className="text-xs text-secondary mt-0.5">
                                                        Invited by <strong className="text-primary">{p.owner?.name || p.owner?.email}</strong> · Budget limit: {money(p.amount)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                                <button
                                                    type="button"
                                                    className="primary-btn text-xs py-1.5 px-3 flex items-center gap-1.5"
                                                    onClick={() =>
                                                        sharedBudgetService
                                                            .respond(p._id, "accepted")
                                                            .then(load)
                                                            .catch((e) => setError(e.response?.data?.message || "Could not accept invitation"))
                                                    }
                                                >
                                                    <Check size={14} /> Accept
                                                </button>
                                                <button
                                                    type="button"
                                                    className="secondary-btn text-xs py-1.5 px-3 flex items-center gap-1.5 text-rose-500 hover:text-rose-600"
                                                    onClick={() =>
                                                        sharedBudgetService
                                                            .respond(p._id, "declined")
                                                            .then(load)
                                                            .catch((e) => setError(e.response?.data?.message || "Could not decline invitation"))
                                                    }
                                                >
                                                    <X size={14} /> Decline
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="grid gap-4 lg:grid-cols-2">
                                {shared.map((b) => (
                                    <SharedCard
                                        key={b._id}
                                        budget={b}
                                        onRefresh={load}
                                        onError={setError}
                                        onEdit={() => open("shared", b)}
                                        onAddExpense={() => setSharedExpenseBudget(b)}
                                        onDelete={() =>
                                            setConfirmModal({
                                                title: "Delete Shared Budget?",
                                                message: `Are you sure you want to delete the shared budget "${b.name}"? Shared transactions will be unlinked.`,
                                                onConfirm: () => act(() => sharedBudgetService.remove(b._id)),
                                            })
                                        }
                                    />
                                ))}
                                {!shared.length && (
                                    <Empty
                                        title="No shared budgets"
                                        text="Create a shared pool and invite members by email to track collective spending."
                                    />
                                )}
                            </div>
                        </Section>

                        {/* SECTION 6: FINANCIAL CALENDAR */}
                        <Calendar events={events} />
                    </>
                )}

                {modal && (
                    <ToolModal
                        type={modal.type}
                        item={modal.item}
                        onClose={() => setModal(null)}
                        onSaved={async () => {
                            setModal(null);
                            await load();
                        }}
                    />
                )}

                {history && (
                    <HistoryModal
                        data={history}
                        onClose={() => setHistory(null)}
                        onSaved={load}
                    />
                )}

                {/* Quick Add Shared Expense Modal */}
                {sharedExpenseBudget && (
                    <TransactionForm
                        initialData={{ type: "Expense", sharedBudget: sharedExpenseBudget._id }}
                        lockType={true}
                        onSubmit={async (data) => {
                            try {
                                await addTransaction({ ...data, sharedBudget: sharedExpenseBudget._id });
                                setSharedExpenseBudget(null);
                                await load();
                            } catch (err) {
                                setError(err.response?.data?.message || "Could not save shared expense");
                            }
                        }}
                        onCancel={() => setSharedExpenseBudget(null)}
                    />
                )}

                {/* Unified In-App Confirm Modal */}
                {confirmModal && (
                    <div className="modal-backdrop" onClick={() => setConfirmModal(null)}>
                        <div className="modal-card max-w-sm" onClick={(e) => e.stopPropagation()}>
                            <h3 className="section-title text-rose-500">{confirmModal.title}</h3>
                            <p className="text-secondary text-xs mt-2 leading-relaxed">
                                {confirmModal.message}
                            </p>
                            <div className="mt-6 flex justify-end gap-2">
                                <button
                                    type="button"
                                    className="secondary-btn text-xs"
                                    onClick={() => setConfirmModal(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="primary-btn bg-rose-600 hover:bg-rose-700 text-xs text-white"
                                    onClick={async () => {
                                        const fn = confirmModal.onConfirm;
                                        setConfirmModal(null);
                                        await fn();
                                    }}
                                >
                                    Yes, Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

function Section({ title, subtitle, add, onAdd, children }) {
    return (
        <section className="mb-10">
            <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="section-title">{title}</h2>
                    <p className="text-secondary text-xs mt-0.5">{subtitle}</p>
                </div>
                <button type="button" className="primary-btn w-auto text-xs" onClick={onAdd}>
                    <Plus size={14} /> {add}
                </button>
            </div>
            {children}
        </section>
    );
}

function Empty({ title, text }) {
    return (
        <div className="empty-state lg:col-span-2 xl:col-span-3">
            <h3>{title}</h3>
            <p>{text}</p>
        </div>
    );
}

function recommended(g) {
    const remaining = Math.max(0, Number(g.targetAmount || 0) - Number(g.savedAmount || 0));
    if (!g.targetDate) return money(remaining) + " total left to fund";
    const months = Math.max(1, (new Date(g.targetDate) - new Date()) / (1000 * 60 * 60 * 24 * 30.44));
    return money(Math.ceil(remaining / months)) + " / month";
}

function SharedCard({ budget, onRefresh, onError, onEdit, onAddExpense, onDelete }) {
    const { currencySymbol } = useCurrency();
    const [email, setEmail] = useState("");
    const [amount, setAmount] = useState("");
    const [inviteFeedback, setInviteFeedback] = useState("");
    const [inviteError, setInviteError] = useState("");
    const [showActivity, setShowActivity] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const currentUserId = String(currentUser._id || currentUser.id || "");
    const currentUserEmail = String(currentUser.email || "").toLowerCase();

    const owner = budget.owner
        ? (currentUserId && String(budget.owner._id || budget.owner) === currentUserId) ||
          (currentUserEmail && String(budget.owner.email || "").toLowerCase() === currentUserEmail)
        : false;

    const me = (budget.members || []).find(
        (m) =>
            (currentUserId && String(m.user?._id || m.user) === currentUserId) ||
            (currentUserEmail && String(m.email || "").toLowerCase() === currentUserEmail)
    );

    const invite = async (e) => {
        e?.preventDefault();
        const cleanEmail = email.trim().toLowerCase();
        setInviteFeedback("");
        setInviteError("");

        if (!cleanEmail) {
            return setInviteError("Please enter an email address.");
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            return setInviteError("Please enter a valid email address.");
        }
        if (currentUserEmail && cleanEmail === currentUserEmail) {
            return setInviteError("You cannot invite yourself to your own budget.");
        }

        setSubmitting(true);
        try {
            const res = await sharedBudgetService.invite(budget._id, cleanEmail);
            setInviteFeedback(res.message || `Invitation sent successfully to ${cleanEmail}.`);
            setEmail("");
            setTimeout(() => setInviteFeedback(""), 7000);
            onRefresh();
        } catch (e) {
            const errText = e.response?.data?.message || "Could not invite member. Please try again.";
            setInviteError(errText);
            onError(errText);
        } finally {
            setSubmitting(false);
        }
    };

    const contribute = async () => {
        try {
            if (Number(amount) > 0) {
                setSubmitting(true);
                await sharedBudgetService.contribute(budget._id, Number(amount));
                setAmount("");
                onRefresh();
            }
        } catch (e) {
            onError(e.response?.data?.message || "Could not contribute");
        } finally {
            setSubmitting(false);
        }
    };

    const removeMember = async (m) => {
        try {
            const memberKey = m.user?._id || m.user || m._id || m.email;
            await sharedBudgetService.removeMember(budget._id, memberKey);
            onRefresh();
        } catch (e) {
            onError(e.response?.data?.message || "Could not remove member");
        }
    };

    const spent = Number(budget.sharedSpending || 0);
    const total = Number(budget.amount || 1);
    const pct = Math.min(100, Math.max(0, Math.round((spent / total) * 100)));
    const totalContributed = Number(budget.totalContributed || 0);
    const poolRemaining = totalContributed - spent;
    const ownerContrib = Number(budget.ownerContribution || 0);

    return (
        <div className="surface p-5 rounded-3xl border border-border flex flex-col justify-between">
            <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm sm:text-base" style={{ color: "var(--text-primary)" }}>
                                {budget.name}
                            </h3>
                            {owner && <span className="chip text-[10px] py-0.5 px-2">Owner</span>}
                        </div>
                        <p className="text-secondary text-xs mt-1">
                            {money(spent)} spent of {money(budget.amount)} ceiling
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`badge ${budget.remaining < 0 ? "danger" : "success"}`}>
                            {budget.remaining < 0 ? "-" : ""}{money(Math.abs(budget.remaining))} {budget.remaining < 0 ? "over budget" : "left"}
                        </span>
                        {owner && (
                            <>
                                {onEdit && (
                                    <button
                                        type="button"
                                        className="icon-btn text-secondary hover:text-primary"
                                        onClick={onEdit}
                                        title="Edit Budget"
                                    >
                                        <Edit3 size={14} />
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        type="button"
                                        className="icon-btn text-rose-500 hover:text-rose-600"
                                        onClick={onDelete}
                                        title="Delete Shared Budget"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Target Budget Progress Bar */}
                <div
                    className="mt-3.5 h-2 w-full rounded-full overflow-hidden"
                    style={{ background: "var(--bg-elevated)" }}
                >
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${
                            budget.remaining < 0 ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-cyan-500"
                        }`}
                        style={{ width: `${pct}%` }}
                    />
                </div>

                {/* Shared Pool Cash Box */}
                <div
                    className="mt-3.5 p-3 rounded-2xl border flex items-center justify-between gap-2 text-xs"
                    style={{
                        borderColor: poolRemaining < 0 ? "rgba(239, 68, 68, 0.25)" : "var(--border)",
                        background: poolRemaining < 0 ? "rgba(239, 68, 68, 0.06)" : "var(--bg-elevated)",
                    }}
                >
                    <div className="flex items-center gap-2">
                        <Coins size={15} className={poolRemaining < 0 ? "text-rose-500" : "text-amber-500"} />
                        <div>
                            <span className="text-secondary text-[11px] block">Pooled Funds Balance</span>
                            <strong
                                className="font-bold text-xs"
                                style={{ color: poolRemaining < 0 ? "var(--danger)" : "var(--text-primary)" }}
                            >
                                {money(poolRemaining)} cash remaining
                            </strong>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-secondary text-[10px] block">Total Injected</span>
                        <strong className="text-primary font-semibold text-xs">{money(totalContributed)}</strong>
                    </div>
                </div>

                {/* Contributors & Member Ledger */}
                <div className="mt-4 space-y-2 text-xs">
                    <p className="eyebrow text-[10px]">CONTRIBUTORS &amp; MEMBERS</p>

                    {/* Owner row */}
                    <div className="flex items-center justify-between rounded-xl surface-elevated p-2.5 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="font-bold" style={{ color: "var(--text-primary)" }}>
                                {budget.owner?.name || budget.owner?.email || "Owner"}
                            </span>
                            <span className="chip text-[10px] py-0 px-1.5">Owner</span>
                        </div>
                        <span className="font-semibold text-emerald-500">
                            {money(ownerContrib)} contributed
                        </span>
                    </div>

                    {/* Member rows */}
                    {(budget.members || []).map((m) => (
                        <div
                            key={m._id || m.email}
                            className="flex items-center justify-between rounded-xl surface-elevated p-2.5 text-xs"
                        >
                            <div className="flex items-center gap-2">
                                <span style={{ color: "var(--text-primary)" }}>
                                    {m.user?.name || m.email}
                                </span>
                                <span
                                    className={`badge text-[10px] ${
                                        m.status === "accepted"
                                            ? "success"
                                            : m.status === "declined"
                                            ? "danger"
                                            : "warning"
                                    }`}
                                >
                                    {m.status}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                {m.status === "accepted" && (
                                    <span className="font-semibold text-emerald-500">
                                        {money(m.contribution || 0)}
                                    </span>
                                )}
                                {owner && (
                                    <button
                                        type="button"
                                        className="icon-btn text-rose-400 hover:text-rose-600 p-0.5"
                                        title={m.status === "pending" ? "Revoke Invite" : "Remove Member"}
                                        onClick={() => removeMember(m)}
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-5">
                {/* Actions Bar */}
                {owner ? (
                    <div className="space-y-2">
                        <form onSubmit={invite} className="space-y-1.5">
                            <div className="flex gap-2">
                                <input
                                    className="input py-1.5 text-xs"
                                    type="email"
                                    placeholder="Invite member by email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (inviteError) setInviteError("");
                                    }}
                                    disabled={submitting}
                                />
                                <button
                                    type="submit"
                                    className="secondary-btn text-xs shrink-0 flex items-center gap-1.5 cursor-pointer"
                                    disabled={submitting || !email.trim()}
                                >
                                    {submitting ? (
                                        <>
                                            <RefreshCw size={13} className="animate-spin" /> Inviting…
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus size={13} /> Invite
                                        </>
                                    )}
                                </button>
                            </div>
                            {inviteError && (
                                <div className="alert error text-xs py-1.5 px-2.5 flex items-center justify-between">
                                    <span>{inviteError}</span>
                                    <button type="button" onClick={() => setInviteError("")} className="text-secondary hover:text-primary">&times;</button>
                                </div>
                            )}
                            {inviteFeedback && (
                                <div className="alert success text-xs py-1.5 px-2.5 flex items-center justify-between">
                                    <span>{inviteFeedback}</span>
                                    <button type="button" onClick={() => setInviteFeedback("")} className="text-secondary hover:text-primary">&times;</button>
                                </div>
                            )}
                        </form>
                        <div className="flex gap-2">
                            <input
                                className="input py-1.5 text-xs"
                                type="number"
                                placeholder={`Add contribution (${currencySymbol})`}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                            <button
                                type="button"
                                className="secondary-btn text-xs shrink-0"
                                onClick={contribute}
                                disabled={submitting || !Number(amount)}
                            >
                                Contribute
                            </button>
                            {onAddExpense && (
                                <button
                                    type="button"
                                    className="primary-btn text-xs shrink-0 flex items-center gap-1.5"
                                    onClick={onAddExpense}
                                >
                                    <Plus size={13} /> Log Expense
                                </button>
                            )}
                        </div>
                    </div>
                ) : me?.status === "pending" ? (
                    <div className="flex gap-2">
                        <button
                            type="button"
                            className="primary-btn text-xs py-2 flex-1 flex items-center justify-center gap-1.5"
                            onClick={() =>
                                sharedBudgetService
                                    .respond(budget._id, "accepted")
                                    .then(onRefresh)
                                    .catch((e) => onError(e.response?.data?.message || "Could not accept"))
                            }
                        >
                            <Check size={14} /> Accept Invitation
                        </button>
                        <button
                            type="button"
                            className="secondary-btn text-xs py-2 flex items-center justify-center gap-1.5 text-rose-500 hover:text-rose-600"
                            onClick={() => sharedBudgetService.respond(budget._id, "declined").then(onRefresh)}
                        >
                            <X size={14} /> Decline
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <input
                                className="input py-1.5 text-xs"
                                type="number"
                                placeholder={`Add contribution (${currencySymbol})`}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                            <button
                                type="button"
                                className="secondary-btn text-xs shrink-0"
                                onClick={contribute}
                                disabled={submitting || !Number(amount)}
                            >
                                Contribute
                            </button>
                            {onAddExpense && (
                                <button
                                    type="button"
                                    className="primary-btn text-xs shrink-0 flex items-center gap-1.5"
                                    onClick={onAddExpense}
                                >
                                    <Plus size={13} /> Log Expense
                                </button>
                            )}
                            <button
                                type="button"
                                className="icon-btn text-rose-500 hover:text-rose-600 shrink-0"
                                onClick={() =>
                                    sharedBudgetService
                                        .leave(budget._id)
                                        .then(onRefresh)
                                        .catch((e) => onError(e.response?.data?.message || "Could not leave"))
                                }
                                title="Leave Budget"
                            >
                                <LogOut size={14} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Ledger toggle footer */}
                <div
                    className="mt-4 flex items-center justify-between text-xs text-secondary border-t pt-3"
                    style={{ borderColor: "var(--border)" }}
                >
                    <span>
                        {budget.sharedTransactions?.length || 0} shared tx · {money(totalContributed)} pooled
                    </span>
                    <button
                        type="button"
                        className="font-bold text-violet-500 hover:underline flex items-center gap-1"
                        onClick={() => setShowActivity(!showActivity)}
                    >
                        {showActivity ? "Hide Activity" : "View Ledger"}
                    </button>
                </div>

                {showActivity && (
                    <div className="mt-3 space-y-2">
                        {(budget.sharedTransactions || []).slice(0, 10).map((t) => (
                            <div
                                className="surface-elevated flex items-center justify-between rounded-xl p-2.5 text-xs"
                                key={t._id}
                            >
                                <div>
                                    <strong className="block" style={{ color: "var(--text-primary)" }}>{t.title}</strong>
                                    <span className="text-secondary text-[11px]">
                                        {t.user?.name || t.user?.email || "Member"} · {fmt(t.date)}
                                    </span>
                                </div>
                                <strong className={t.type === "Expense" ? "text-rose-500 font-bold" : "text-emerald-500 font-bold"}>
                                    {t.type === "Expense" ? "-" : "+"}
                                    {money(t.amount)}
                                </strong>
                            </div>
                        ))}
                        {!budget.sharedTransactions?.length && (
                            <p className="text-xs text-secondary py-2 text-center">No shared transactions recorded yet.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function Calendar({ events }) {
    const today = new Date();
    const [month, setMonth] = useState(today.getMonth());
    const [year, setYear] = useState(today.getFullYear());
    const [filter, setFilter] = useState("all");
    const [selected, setSelected] = useState(null);

    const filtered = events.filter((e) => filter === "all" || e.type === filter);
    const days = new Date(year, month + 1, 0).getDate();
    const first = new Date(year, month, 1).getDay();
    const by = {};
    filtered.forEach((e) => {
        const d = new Date(e.date);
        if (d.getMonth() === month && d.getFullYear() === year) {
            (by[d.getDate()] ??= []).push(e);
        }
    });

    const shift = (n) => {
        const d = new Date(year, month + n, 1);
        setMonth(d.getMonth());
        setYear(d.getFullYear());
    };

    return (
        <section className="surface overflow-hidden">
            <div
                className="flex flex-col gap-3 border-b p-5 md:flex-row md:items-center md:justify-between"
                style={{ borderColor: "var(--border)" }}
            >
                <div>
                    <p className="eyebrow">FINANCIAL SCHEDULE</p>
                    <h2 className="section-title mt-0.5">
                        {new Date(year, month, 1).toLocaleString("en-IN", {
                            month: "long",
                            year: "numeric",
                        })}
                    </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        className="input w-auto text-xs py-1.5"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="all">All Events</option>
                        <option value="transaction">Transactions</option>
                        <option value="bill">Bills</option>
                        <option value="subscription">Subscriptions</option>
                        <option value="goal">Goals</option>
                    </select>
                    <button type="button" className="icon-btn" onClick={() => shift(-1)}>
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        type="button"
                        className="chip text-xs py-1"
                        onClick={() => {
                            setMonth(today.getMonth());
                            setYear(today.getFullYear());
                        }}
                    >
                        Today
                    </button>
                    <button type="button" className="icon-btn" onClick={() => shift(1)}>
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 border-b text-center" style={{ borderColor: "var(--border)" }}>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <div className="p-2.5 text-xs font-bold text-secondary uppercase" key={d}>
                        {d}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7">
                {Array.from({ length: first + days }, (_, i) => {
                    const d = i < first ? null : i - first + 1;
                    return (
                        <div
                            key={i}
                            className="transaction-row min-h-24 border-b border-r p-2"
                            style={{ borderColor: "var(--border)" }}
                        >
                            {d && (
                                <>
                                    <div className="mb-1 text-xs font-bold text-secondary">{d}</div>
                                    <div className="space-y-1">
                                        {(by[d] || []).slice(0, 3).map((e) => (
                                            <button
                                                type="button"
                                                key={`${e.type}-${e.id}`}
                                                className="block w-full truncate rounded-md bg-violet-500/10 hover:bg-violet-500/20 px-1.5 py-0.5 text-left text-[10px] font-semibold text-violet-600"
                                                onClick={() => setSelected(e)}
                                            >
                                                {e.title}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {selected && (
                <div className="modal-backdrop" onClick={() => setSelected(null)}>
                    <div
                        className="modal-card max-w-sm"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="eyebrow uppercase">{selected.type}</p>
                                <h3 className="section-title mt-0.5">{selected.title}</h3>
                            </div>
                            <button
                                type="button"
                                className="icon-btn"
                                onClick={() => setSelected(null)}
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="mt-4 space-y-2 text-xs text-secondary">
                            <p>
                                Date: <strong className="text-primary font-bold">{fmt(selected.date)}</strong>
                            </p>
                            {selected.amount != null && (
                                <p>
                                    Amount:{" "}
                                    <strong className="text-primary font-bold">{money(selected.amount)}</strong>
                                </p>
                            )}
                            <p>
                                Details:{" "}
                                <strong className="text-primary font-bold">{selected.meta || "—"}</strong>
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

function ToolModal({ type, item, onClose, onSaved }) {
    const { currencySymbol } = useCurrency();
    const initial = item
        ? {
              ...empty[type],
              ...item,
              dueDate: iso(item.dueDate),
              targetDate: iso(item.targetDate),
              nextBillingDate: iso(item.nextBillingDate),
          }
        : empty[type];
    const [f, setF] = useState(initial);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
            if (type === "bill") {
                if (item?._id) await billService.update(item._id, f);
                else await billService.create(f);
            } else if (type === "goal") {
                if (item?._id) await goalService.update(item._id, f);
                else await goalService.create(f);
            } else if (type === "subscription") {
                if (item?._id) await subscriptionService.update(item._id, f);
                else await subscriptionService.create(f);
            } else if (type === "account") {
                if (item?._id) await updateAccount(item._id, f);
                else await addAccount(f);
            } else if (type === "shared") {
                if (item?._id) await sharedBudgetService.update(item._id, f);
                else await sharedBudgetService.create(f);
            }
            await onSaved();
            onClose();
        } catch (e) {
            setError(e.response?.data?.message || "Could not save entry");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="modal-card max-w-xl">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="eyebrow">{item ? "EDIT RECORD" : "NEW RECORD"}</p>
                        <h2 className="section-title mt-1">
                            {type === "shared"
                                ? "Shared Budget"
                                : type.charAt(0).toUpperCase() + type.slice(1)}
                        </h2>
                    </div>
                    <button type="button" className="icon-btn" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {type === "bill" && (
                        <>
                            <F label="Title" value={f.title} set={(v) => set("title", v)} />
                            <F label={`Amount (${currencySymbol})`} type="number" value={f.amount} set={(v) => set("amount", v)} />
                            <F label="Due Date" type="date" value={f.dueDate} set={(v) => set("dueDate", v)} />
                            <Select
                                label="Recurring"
                                value={f.recurring ? "Yes" : "No"}
                                set={(v) => {
                                    set("recurring", v === "Yes");
                                    if (v !== "Yes") set("frequency", "None");
                                }}
                                options={["No", "Yes"]}
                            />
                            {f.recurring && (
                                <Select
                                    label="Frequency"
                                    value={f.frequency}
                                    set={(v) => set("frequency", v)}
                                    options={["Weekly", "Monthly", "Yearly"]}
                                />
                            )}
                            <F label="Notes" value={f.notes} set={(v) => set("notes", v)} />
                        </>
                    )}

                    {type === "goal" && (
                        <>
                            <F label="Goal Name" value={f.name} set={(v) => set("name", v)} />
                            <F label={`Target Amount (${currencySymbol})`} type="number" value={f.targetAmount} set={(v) => set("targetAmount", v)} />
                            <F label={`Already Saved (${currencySymbol})`} type="number" value={f.savedAmount} set={(v) => set("savedAmount", v)} />
                            <F label="Target Date" type="date" value={f.targetDate} set={(v) => set("targetDate", v)} />
                            <F label="Description" value={f.description} set={(v) => set("description", v)} />
                        </>
                    )}

                    {type === "subscription" && (
                        <>
                            <F label="Subscription Name" value={f.name} set={(v) => set("name", v)} />
                            <F label={`Amount (${currencySymbol})`} type="number" value={f.amount} set={(v) => set("amount", v)} />
                            <F label="Next Billing Date" type="date" value={f.nextBillingDate} set={(v) => set("nextBillingDate", v)} />
                            <Select
                                label="Billing Cycle"
                                value={f.billingCycle}
                                set={(v) => set("billingCycle", v)}
                                options={["Weekly", "Monthly", "Quarterly", "Yearly"]}
                            />
                        </>
                    )}

                    {type === "account" && (
                        <>
                            <F label="Account Name" value={f.name} set={(v) => set("name", v)} />
                            <Select
                                label="Type"
                                value={f.type}
                                set={(v) => set("type", v)}
                                options={["Cash", "Bank", "UPI", "Wallet", "Credit Card", "Other"]}
                            />
                            <F label={`Opening Balance (${currencySymbol})`} type="number" value={f.openingBalance} set={(v) => set("openingBalance", v)} />
                            <F label="Notes" value={f.notes} set={(v) => set("notes", v)} />
                        </>
                    )}

                    {type === "shared" && (
                        <>
                            <F label="Budget Name" value={f.name} set={(v) => set("name", v)} />
                            <F label={`Total Amount (${currencySymbol})`} type="number" value={f.amount} set={(v) => set("amount", v)} />
                            <F label="Month" type="number" value={f.month} set={(v) => set("month", v)} />
                            <F label="Year" type="number" value={f.year} set={(v) => set("year", v)} />
                        </>
                    )}

                    {error && <div className="alert error sm:col-span-2">{error}</div>}
                </div>

                <button className="primary-btn mt-6 w-full" disabled={busy}>
                    {busy ? "Saving…" : item ? "Save Changes" : "Create"}
                </button>
            </form>
        </div>
    );
}

function F({ label, value, set, type = "text" }) {
    return (
        <label className="field">
            {label}
            <input
                className="input"
                type={type}
                value={value ?? ""}
                onChange={(e) => set(e.target.value)}
                required
            />
        </label>
    );
}

function Select({ label, value, set, options }) {
    return (
        <label className="field">
            {label}
            <select className="input" value={value} onChange={(e) => set(e.target.value)}>
                {options.map((o) => (
                    <option key={o}>{o}</option>
                ))}
            </select>
        </label>
    );
}

function HistoryModal({ data, onClose, onSaved }) {
    const { currencySymbol } = useCurrency();
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const goal = data.goal;

    const save = async () => {
        if (!Number(amount)) return;
        setBusy(true);
        try {
            await goalService.contribute(goal._id, Number(amount), new Date().toISOString(), note);
            setAmount("");
            setNote("");
            await onSaved();
            onClose();
        } catch (e) {
            alert(e.response?.data?.message || "Could not add contribution");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div
                className="modal-card max-w-lg"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-start">
                    <div>
                        <p className="eyebrow">ACTIVITY RECORD</p>
                        <h2 className="section-title mt-0.5">{goal ? goal.name : data.account?.name}</h2>
                    </div>
                    <button type="button" className="icon-btn" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>

                {goal && !data.historyOnly && (
                    <div className="mt-5 grid gap-2.5 sm:grid-cols-[1fr_1fr_auto]">
                        <input
                            className="input text-xs"
                            type="number"
                            placeholder={`Contribution (${currencySymbol})`}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                        <input
                            className="input text-xs"
                            placeholder="Optional note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                        <button
                            type="button"
                            className="primary-btn text-xs py-2 px-4"
                            disabled={busy || !Number(amount)}
                            onClick={save}
                        >
                            Add
                        </button>
                    </div>
                )}

                {goal ? (
                    <div className="mt-5 space-y-2 max-h-60 overflow-y-auto">
                        {(goal.contributions || []).map((c) => (
                            <div
                                className="surface-elevated flex items-center justify-between rounded-xl p-3 text-xs"
                                key={c._id}
                            >
                                <div>
                                    <strong className="block text-emerald-500 font-bold">{money(c.amount)}</strong>
                                    <span className="text-secondary text-[11px]">
                                        {fmt(c.date)}
                                        {c.note ? ` · ${c.note}` : ""}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {!goal.contributions?.length && (
                            <p className="text-xs text-secondary py-4 text-center">
                                No contributions recorded yet.
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="mt-5 space-y-2 max-h-60 overflow-y-auto">
                        {(data.transactions || []).map((t) => (
                            <div
                                className="surface-elevated flex items-center justify-between rounded-xl p-3 text-xs"
                                key={t._id}
                            >
                                <div>
                                    <strong className="block">{t.title}</strong>
                                    <span className="text-secondary text-[11px]">
                                        {t.type} · {fmt(t.date)}
                                    </span>
                                </div>
                                <strong
                                    className={
                                        t.type === "Income"
                                            ? "text-emerald-500"
                                            : t.type === "Expense"
                                            ? "text-rose-500"
                                            : "text-cyan-500"
                                    }
                                >
                                    {money(t.amount)}
                                </strong>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
