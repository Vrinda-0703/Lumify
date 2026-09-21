import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import { getProfile, updateProfile, changePassword } from "../services/profileService";
import { getTransactions } from "../services/transactionService";
import { getBudgets } from "../services/budgetService";
import { billService, goalService, subscriptionService } from "../services/featureService";
import { getAccounts } from "../services/accountService";
import {
    Moon,
    Sun,
    CheckCircle2,
    ShieldCheck,
    User,
    DollarSign,
    Bell,
    Download,
    LogOut,
    Sliders,
    Save,
    Eye,
    EyeOff,
    Lock,
    RefreshCw,
    RotateCcw,
    Check,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useCurrency } from "../context/CurrencyContext";

export default function Profile() {
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, setTheme } = useTheme();
    const { currency, setCurrency, CURRENCIES } = useCurrency();
    const [userData, setUserData] = useState({ name: "", email: "" });
    const [initialUserData, setInitialUserData] = useState({ name: "", email: "" });

    // Tabs state
    const [activeTab, setActiveTab] = useState(() => {
        const hash = window.location.hash.replace("#", "").toLowerCase();
        const searchTab = new URLSearchParams(window.location.search).get("tab")?.toLowerCase();
        const valid = ["all", "account", "security", "appearance", "notifications", "data"];
        if (valid.includes(hash)) return hash;
        if (valid.includes(searchTab)) return searchTab;
        return "all";
    });

    // Password change state
    const [pass, setPass] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [showPass, setShowPass] = useState({
        current: false,
        next: false,
        confirm: false,
    });
    const [pwdMsg, setPwdMsg] = useState("");
    const [pwdErr, setPwdErr] = useState("");
    const [pwdBusy, setPwdBusy] = useState(false);

    const [notifications, setNotifications] = useState(() => {
        try {
            return (
                JSON.parse(localStorage.getItem("lumify_notifications") || "null") || {
                    budgetAlerts: true,
                    billReminders: true,
                    weeklyDigest: true,
                }
            );
        } catch {
            return { budgetAlerts: true, billReminders: true, weeklyDigest: true };
        }
    });

    const [msg, setMsg] = useState("");
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    useEffect(() => {
        getProfile()
            .then((data) => {
                setUserData({ name: data.name || "", email: data.email || "" });
                setInitialUserData({ name: data.name || "", email: data.email || "" });
            })
            .catch((e) => setErr(e.response?.data?.message || "Could not load profile."));
    }, []);

    useEffect(() => {
        const hash = location.hash.replace("#", "").toLowerCase();
        if (["all", "account", "security", "appearance", "notifications", "data"].includes(hash)) {
            setActiveTab(hash);
        }
    }, [location.hash]);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        window.history.replaceState(null, "", tabId === "all" ? window.location.pathname : `#${tabId}`);
    };

    const saveDetails = async (e) => {
        e?.preventDefault();
        const trimmedName = userData.name.trim();
        const trimmedEmail = userData.email.trim();

        if (trimmedName.length < 2 || trimmedName.length > 80) {
            return setErr("Full Name must be between 2 and 80 characters.");
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            return setErr("Please enter a valid email address.");
        }

        setBusy(true);
        setMsg("");
        setErr("");
        try {
            const r = await updateProfile({ name: trimmedName, email: trimmedEmail });
            setUserData(r.user);
            setInitialUserData(r.user);
            localStorage.setItem("user", JSON.stringify(r.user));
            setMsg(r.message || "Profile updated successfully.");
            setTimeout(() => setMsg(""), 4000);
        } catch (e) {
            setErr(e.response?.data?.message || "Update failed. Please try again.");
        } finally {
            setBusy(false);
        }
    };

    const resetDetails = () => {
        setUserData(initialUserData);
        setErr("");
        setMsg("");
    };

    const passwordStrength = useMemo(() => {
        const p = pass.newPassword;
        if (!p) return { score: 0, label: "Empty", color: "bg-border", text: "text-secondary" };
        let score = 0;
        if (p.length >= 8) score += 1;
        if (p.length >= 12) score += 1;
        if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score += 1;
        if (/[0-9]/.test(p) || /[^A-Za-z0-9]/.test(p)) score += 1;

        if (score <= 1) return { score: 1, label: "Weak", color: "bg-rose-500", text: "text-rose-500" };
        if (score === 2) return { score: 2, label: "Fair", color: "bg-amber-500", text: "text-amber-500" };
        if (score === 3) return { score: 3, label: "Good", color: "bg-cyan-500", text: "text-cyan-500" };
        return { score: 4, label: "Strong", color: "bg-emerald-500", text: "text-emerald-500" };
    }, [pass.newPassword]);

    const updatePwd = async (e) => {
        e?.preventDefault();
        setPwdErr("");
        setPwdMsg("");

        if (!pass.currentPassword) {
            return setPwdErr("Please enter your current password.");
        }
        if (!pass.newPassword) {
            return setPwdErr("Please enter a new password.");
        }
        if (pass.newPassword.length < 8) {
            return setPwdErr("New password must be at least 8 characters.");
        }
        if (!pass.confirmPassword) {
            return setPwdErr("Please confirm your new password.");
        }
        if (pass.newPassword !== pass.confirmPassword) {
            return setPwdErr("New password and confirmation do not match.");
        }
        if (pass.currentPassword === pass.newPassword) {
            return setPwdErr("New password cannot be the same as your current password.");
        }

        setPwdBusy(true);
        try {
            const r = await changePassword({
                currentPassword: pass.currentPassword,
                newPassword: pass.newPassword,
                confirmPassword: pass.confirmPassword,
            });
            setPwdMsg(r.message || "Password changed successfully.");
            setPass({ currentPassword: "", newPassword: "", confirmPassword: "" });
            setTimeout(() => setPwdMsg(""), 5000);
        } catch (e) {
            setPwdErr(e.response?.data?.message || "Current password is incorrect.");
        } finally {
            setPwdBusy(false);
        }
    };

    const clearPwdForm = () => {
        setPass({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setPwdErr("");
        setPwdMsg("");
    };

    const handleCurrencyChange = (code) => {
        setCurrency(code);
        localStorage.setItem("lumify_currency", code);
        setMsg(`Currency updated to ${code}.`);
        setTimeout(() => setMsg(""), 3000);
    };

    const toggleNotification = (key) => {
        const next = { ...notifications, [key]: !notifications[key] };
        setNotifications(next);
        localStorage.setItem("lumify_notifications", JSON.stringify(next));
        setMsg("Notification preferences updated.");
        setTimeout(() => setMsg(""), 3000);
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
    };

    const exportAllData = async () => {
        setExporting(true);
        try {
            const [tx, budgets, bills, goals, subs, accounts] = await Promise.all([
                getTransactions().catch(() => []),
                getBudgets(new Date().getMonth() + 1, new Date().getFullYear()).catch(() => ({})),
                billService.list().catch(() => []),
                goalService.list().catch(() => []),
                subscriptionService.list().catch(() => []),
                getAccounts().catch(() => []),
            ]);

            const fullBackup = {
                app: "Lumify Personal Finance",
                version: "2.0.0",
                exportDate: new Date().toISOString(),
                user: userData,
                preferences: { currency, theme, notifications },
                accounts,
                transactions: tx,
                budgets,
                bills,
                goals,
                subscriptions: subs,
            };

            const blob = new Blob([JSON.stringify(fullBackup, null, 2)], {
                type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `lumify-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            setMsg("Complete data backup exported successfully.");
            setTimeout(() => setMsg(""), 4000);
        } catch (e) {
            setErr("Could not export data: " + (e.message || "Unknown error"));
        } finally {
            setExporting(false);
        }
    };

    const themeOptions = [
        ["dark", Moon, "Dark Mode", "Deep navy fintech surfaces for focused work."],
        ["light", Sun, "Light Mode", "Bright, crisp, and high-contrast workspace."],
    ];

    const tabs = [
        { id: "all", label: "All Settings", icon: Sliders },
        { id: "account", label: "Account Profile", icon: User },
        { id: "security", label: "Security & Password", icon: ShieldCheck },
        { id: "appearance", label: "Appearance", icon: Sun },
        { id: "notifications", label: "Notifications", icon: Bell },
        { id: "data", label: "Data Backup", icon: Download },
    ];

    return (
        <div className="page-shell">
            <Sidebar />
            <main className="page-main">
                <div className="page-header">
                    <div>
                        <p className="eyebrow">CONFIGURATION &amp; PREFERENCES</p>
                        <h1 className="page-title">Settings</h1>
                        <p className="page-subtitle">
                            Account profile, currency, theme appearance, notifications, security, and data backup.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowLogoutConfirm(true)}
                        className="secondary-btn text-xs text-rose-500 hover:text-rose-600 border-rose-500/20"
                    >
                        <LogOut size={14} /> Sign Out
                    </button>
                </div>

                {/* Settings Category Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-border">
                    {tabs.map((t) => {
                        const Icon = t.icon;
                        const active = activeTab === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => handleTabChange(t.id)}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                                    active
                                        ? "bg-violet-600 text-white shadow-sm"
                                        : "bg-elevated text-secondary hover:text-primary hover:bg-card border border-border"
                                }`}
                            >
                                <Icon size={14} />
                                {t.label}
                            </button>
                        );
                    })}
                </div>

                {(msg || err) && (
                    <div className={`alert ${err ? "error" : "success"} mb-6 max-w-5xl`}>
                        {err || msg}
                    </div>
                )}

                <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
                    {/* 1. Account Details */}
                    {(activeTab === "all" || activeTab === "account") && (
                        <section className="surface p-6 rounded-3xl">
                            <div className="flex items-center gap-2 mb-1">
                                <User className="text-violet-500" size={18} />
                                <h2 className="section-title">Account Details</h2>
                            </div>
                            <p className="text-xs text-secondary mb-5">
                                Update your personal display name and registered email address.
                            </p>

                            <form onSubmit={saveDetails} className="space-y-4">
                                <label className="field">
                                    Full Name
                                    <input
                                        className="input"
                                        value={userData.name}
                                        onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                                        required
                                    />
                                </label>

                                <label className="field">
                                    Email Address
                                    <input
                                        className="input"
                                        type="email"
                                        value={userData.email}
                                        onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                                        required
                                    />
                                </label>

                                <div className="flex items-center gap-3 pt-2">
                                    <button
                                        type="submit"
                                        disabled={busy}
                                        className="primary-btn py-2 px-5 text-xs flex items-center gap-2"
                                    >
                                        <Save size={14} />
                                        {busy ? "Saving…" : "Save Changes"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetDetails}
                                        disabled={busy}
                                        className="secondary-btn py-2 px-4 text-xs flex items-center gap-1.5"
                                    >
                                        <RotateCcw size={13} /> Reset
                                    </button>
                                </div>
                            </form>
                        </section>
                    )}

                    {/* 2. Currency & Region Preferences */}
                    {(activeTab === "all" || activeTab === "account") && (
                        <section className="surface p-6 rounded-3xl">
                            <div className="flex items-center gap-2 mb-1">
                                <DollarSign className="text-emerald-500" size={18} />
                                <h2 className="section-title">Currency &amp; Region</h2>
                            </div>
                            <p className="text-xs text-secondary mb-5">
                                Select your primary currency format for charts and monetary summaries.
                            </p>

                            <div className="space-y-2.5">
                                {CURRENCIES.map((curr) => {
                                    const active = currency === curr.code;
                                    return (
                                        <button
                                            key={curr.code}
                                            type="button"
                                            onClick={() => handleCurrencyChange(curr.code)}
                                            className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                                                active
                                                    ? "border-emerald-500 bg-emerald-500/10 shadow-sm"
                                                    : "border-border hover:border-border-subtle bg-elevated"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                                                        active
                                                            ? "bg-emerald-500 text-white"
                                                            : "bg-card text-secondary"
                                                    }`}
                                                >
                                                    {curr.symbol}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                                                        {curr.name}
                                                    </p>
                                                    <p className="text-[11px] text-secondary">
                                                        Code: {curr.code}
                                                    </p>
                                                </div>
                                            </div>
                                            {active && (
                                                <CheckCircle2 size={18} className="text-emerald-500 shrink-0 ml-2" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* 3. Appearance & Theme Selection */}
                    {(activeTab === "all" || activeTab === "appearance") && (
                        <section className="surface p-6 rounded-3xl">
                            <div className="flex items-center gap-2 mb-1">
                                <Sun className="text-amber-500" size={18} />
                                <h2 className="section-title">Appearance &amp; Theme</h2>
                            </div>
                            <p className="text-xs text-secondary mb-5">
                                Select between Light Mode and Dark Mode. Changes take effect instantly and persist across sessions.
                            </p>

                            <div className="space-y-3">
                                {themeOptions.map(([value, Icon, label, desc]) => {
                                    const active = theme === value;
                                    return (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setTheme(value)}
                                            className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                                                active
                                                    ? "border-violet-500 bg-violet-500/10 shadow-sm"
                                                    : "border-border hover:border-border-subtle bg-elevated"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                                        active
                                                            ? "bg-violet-500 text-white"
                                                            : "bg-card text-secondary"
                                                    }`}
                                                >
                                                    <Icon size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                                                        {label}
                                                    </p>
                                                    <p className="text-[11px] text-secondary mt-0.5">{desc}</p>
                                                </div>
                                            </div>
                                            {active && (
                                                <CheckCircle2 size={18} className="text-violet-500 shrink-0 ml-2" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* 4. Notification Preferences */}
                    {(activeTab === "all" || activeTab === "notifications") && (
                        <section className="surface p-6 rounded-3xl">
                            <div className="flex items-center gap-2 mb-1">
                                <Bell className="text-cyan-500" size={18} />
                                <h2 className="section-title">Notification Alerts</h2>
                            </div>
                            <p className="text-xs text-secondary mb-5">
                                Configure proactive notifications and financial digest preferences.
                            </p>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3.5 rounded-2xl surface-elevated border border-border">
                                    <div>
                                        <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                                            Budget Threshold Alerts
                                        </p>
                                        <p className="text-[11px] text-secondary mt-0.5">
                                            Warn when category spending exceeds 80% or 100% of budget.
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded accent-violet-600 cursor-pointer"
                                        checked={notifications.budgetAlerts}
                                        onChange={() => toggleNotification("budgetAlerts")}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3.5 rounded-2xl surface-elevated border border-border">
                                    <div>
                                        <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                                            Bill Due Date Reminders
                                        </p>
                                        <p className="text-[11px] text-secondary mt-0.5">
                                            Remind 2 days prior to recurring bills or subscriptions due dates.
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded accent-violet-600 cursor-pointer"
                                        checked={notifications.billReminders}
                                        onChange={() => toggleNotification("billReminders")}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3.5 rounded-2xl surface-elevated border border-border">
                                    <div>
                                        <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                                            Weekly Financial Digest
                                        </p>
                                        <p className="text-[11px] text-secondary mt-0.5">
                                            Summary of weekly cash flow, savings pace, and top spend categories.
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded accent-violet-600 cursor-pointer"
                                        checked={notifications.weeklyDigest}
                                        onChange={() => toggleNotification("weeklyDigest")}
                                    />
                                </div>
                            </div>
                        </section>
                    )}

                    {/* 5. Security & Password */}
                    {(activeTab === "all" || activeTab === "security") && (
                        <section className="surface p-6 rounded-3xl" id="security-card">
                            <div className="flex items-center gap-2 mb-1">
                                <ShieldCheck className="text-cyan-500" size={18} />
                                <h2 className="section-title">Security &amp; Password</h2>
                            </div>
                            <p className="text-xs text-secondary mb-5">
                                Update your login credentials and verify bank-grade protection for your financial data.
                            </p>

                            {/* Dedicated Inline Security Alerts */}
                            {(pwdMsg || pwdErr) && (
                                <div className={`alert ${pwdErr ? "error" : "success"} mb-4 text-xs py-2.5 px-3.5 flex items-center justify-between`}>
                                    <span>{pwdErr || pwdMsg}</span>
                                    <button
                                        type="button"
                                        onClick={() => { setPwdErr(""); setPwdMsg(""); }}
                                        className="text-secondary hover:text-primary ml-2"
                                    >
                                        &times;
                                    </button>
                                </div>
                            )}

                            <form onSubmit={updatePwd} className="space-y-4">
                                <label className="field">
                                    Current Password
                                    <div className="relative">
                                        <input
                                            className="input pr-10"
                                            type={showPass.current ? "text" : "password"}
                                            placeholder="Enter your current password"
                                            value={pass.currentPassword}
                                            onChange={(e) => setPass({ ...pass, currentPassword: e.target.value })}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPass({ ...showPass, current: !showPass.current })}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition"
                                            tabIndex={-1}
                                            aria-label="Toggle current password visibility"
                                        >
                                            {showPass.current ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </label>

                                <label className="field">
                                    New Password (8+ characters)
                                    <div className="relative">
                                        <input
                                            className="input pr-10"
                                            type={showPass.next ? "text" : "password"}
                                            placeholder="Enter new strong password"
                                            value={pass.newPassword}
                                            onChange={(e) => setPass({ ...pass, newPassword: e.target.value })}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPass({ ...showPass, next: !showPass.next })}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition"
                                            tabIndex={-1}
                                            aria-label="Toggle new password visibility"
                                        >
                                            {showPass.next ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </label>

                                {/* Password Strength Meter */}
                                {pass.newPassword && (
                                    <div className="p-3 rounded-xl surface-elevated border border-border space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-secondary font-medium">Password Strength:</span>
                                            <span className={`font-bold ${passwordStrength.text}`}>
                                                {passwordStrength.label}
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-border rounded-full overflow-hidden flex gap-1">
                                            <div className={`h-full flex-1 rounded-full ${passwordStrength.score >= 1 ? passwordStrength.color : "bg-transparent"}`} />
                                            <div className={`h-full flex-1 rounded-full ${passwordStrength.score >= 2 ? passwordStrength.color : "bg-transparent"}`} />
                                            <div className={`h-full flex-1 rounded-full ${passwordStrength.score >= 3 ? passwordStrength.color : "bg-transparent"}`} />
                                            <div className={`h-full flex-1 rounded-full ${passwordStrength.score >= 4 ? passwordStrength.color : "bg-transparent"}`} />
                                        </div>
                                        <ul className="text-[11px] text-secondary space-y-1 mt-1">
                                            <li className={`flex items-center gap-1.5 ${pass.newPassword.length >= 8 ? "text-emerald-500" : ""}`}>
                                                <Check size={12} /> Minimum 8 characters
                                            </li>
                                            <li className={`flex items-center gap-1.5 ${/[A-Z]/.test(pass.newPassword) && /[a-z]/.test(pass.newPassword) ? "text-emerald-500" : ""}`}>
                                                <Check size={12} /> Uppercase &amp; lowercase letters
                                            </li>
                                            <li className={`flex items-center gap-1.5 ${/[0-9]/.test(pass.newPassword) || /[^A-Za-z0-9]/.test(pass.newPassword) ? "text-emerald-500" : ""}`}>
                                                <Check size={12} /> Numbers or special symbols
                                            </li>
                                        </ul>
                                    </div>
                                )}

                                <label className="field">
                                    Confirm New Password
                                    <div className="relative">
                                        <input
                                            className="input pr-10"
                                            type={showPass.confirm ? "text" : "password"}
                                            placeholder="Re-enter new password"
                                            value={pass.confirmPassword}
                                            onChange={(e) => setPass({ ...pass, confirmPassword: e.target.value })}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPass({ ...showPass, confirm: !showPass.confirm })}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition"
                                            tabIndex={-1}
                                            aria-label="Toggle confirm password visibility"
                                        >
                                            {showPass.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </label>

                                {pass.confirmPassword && pass.newPassword !== pass.confirmPassword && (
                                    <p className="text-xs text-rose-500">
                                        Passwords do not match.
                                    </p>
                                )}

                                <div className="flex items-center gap-3 pt-2">
                                    <button
                                        type="submit"
                                        disabled={pwdBusy || !pass.currentPassword || !pass.newPassword || !pass.confirmPassword}
                                        className="primary-btn text-xs py-2 px-5 flex items-center gap-2"
                                    >
                                        {pwdBusy ? (
                                            <>
                                                <RefreshCw size={13} className="animate-spin" /> Updating…
                                            </>
                                        ) : (
                                            <>
                                                <Lock size={13} /> Update Password
                                            </>
                                        )}
                                    </button>
                                    {(pass.currentPassword || pass.newPassword || pass.confirmPassword) && (
                                        <button
                                            type="button"
                                            onClick={clearPwdForm}
                                            className="secondary-btn text-xs py-2 px-4"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </form>

                            {/* Active Security Architecture Overview */}
                            <div className="mt-6 pt-5 border-t border-border space-y-2.5">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-secondary">
                                    Security Architecture
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    <div className="p-2.5 rounded-xl surface-elevated border border-border flex items-center gap-2">
                                        <Lock size={14} className="text-violet-500 shrink-0" />
                                        <span className="text-secondary text-[11px]">12-Round Salted Bcrypt</span>
                                    </div>
                                    <div className="p-2.5 rounded-xl surface-elevated border border-border flex items-center gap-2">
                                        <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                                        <span className="text-secondary text-[11px]">Stateless JWT Protection</span>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* 6. Data Management & Export */}
                    {(activeTab === "all" || activeTab === "data") && (
                        <section className="surface p-6 rounded-3xl">
                            <div className="flex items-center gap-2 mb-1">
                                <Download className="text-violet-500" size={18} />
                                <h2 className="section-title">Data Backup &amp; Export</h2>
                            </div>
                            <p className="text-xs text-secondary mb-5">
                                Download all your records in standard JSON format at any time.
                            </p>

                            <div className="space-y-3">
                                <div className="p-4 rounded-2xl surface-elevated border border-border flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                                            Complete Backup (JSON)
                                        </p>
                                        <p className="text-[11px] text-secondary mt-0.5">
                                            Includes profile, accounts, transactions, budgets, goals &amp; bills.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={exporting}
                                        onClick={exportAllData}
                                        className="primary-btn text-xs py-1.5 px-3 shrink-0"
                                    >
                                        {exporting ? "Exporting…" : "Download JSON"}
                                    </button>
                                </div>

                                <div className="p-4 rounded-2xl surface-elevated border border-border">
                                    <p className="text-xs text-secondary leading-relaxed">
                                        💡 <strong>Your Data Ownership:</strong> Lumify does not lock your data. You can export complete snapshots anytime to maintain offline spreadsheets or financial records.
                                    </p>
                                </div>
                            </div>
                        </section>
                    )}
                </div>

                {/* Logout Confirmation Modal */}
                {showLogoutConfirm && (
                    <div className="modal-backdrop" onClick={() => setShowLogoutConfirm(false)}>
                        <div className="modal-card max-w-sm" onClick={(e) => e.stopPropagation()}>
                            <h3 className="section-title text-rose-500">Sign Out of Lumify?</h3>
                            <p className="text-secondary text-xs mt-2 leading-relaxed">
                                Are you sure you want to end your current session? You will need to log in again with your credentials.
                            </p>
                            <div className="mt-6 flex justify-end gap-2">
                                <button
                                    type="button"
                                    className="secondary-btn text-xs"
                                    onClick={() => setShowLogoutConfirm(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="primary-btn bg-rose-600 hover:bg-rose-700 text-xs text-white"
                                    onClick={handleLogout}
                                >
                                    Yes, Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
