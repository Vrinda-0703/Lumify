import { Link } from "react-router-dom";
import Logo from "../components/Brand/Logo";
import {
    ArrowRight,
    Sparkles,
    ShieldCheck,
    WalletCards,
    Target,
    BarChart3,
    CheckCircle2,
    Sun,
    Moon,
    Zap,
    Repeat,
    ScanLine,
    Lock,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function Landing() {
    const { theme, setTheme } = useTheme();

    const nextTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    const themeIcon = theme === "light" ? <Moon size={16} /> : <Sun size={16} />;

    return (
        <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
            {/* Header / Navbar */}
            <header
                className="sticky top-0 z-50 backdrop-blur-md border-b"
                style={{
                    backgroundColor: "color-mix(in srgb, var(--bg-primary) 85%, transparent)",
                    borderColor: "var(--border)",
                }}
            >
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Logo size="default" />

                    <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-secondary">
                        <a href="#features" className="hover:text-primary transition">
                            Features
                        </a>
                        <a href="#intelligence" className="hover:text-primary transition">
                            Copilot
                        </a>
                        <a href="#security" className="hover:text-primary transition">
                            Privacy &amp; Security
                        </a>
                    </nav>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={nextTheme}
                            className="icon-btn"
                            title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
                            aria-label="Toggle Theme"
                        >
                            {themeIcon}
                        </button>
                        <Link to="/login" className="secondary-btn text-xs sm:text-sm py-2 px-4">
                            Sign In
                        </Link>
                        <Link to="/signup" className="primary-btn text-xs sm:text-sm py-2 px-4">
                            Get Started <ArrowRight size={15} />
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative overflow-hidden pt-20 pb-28 px-6 text-center">
                {/* Subtle Ambient Glows */}
                <div
                    className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full pointer-events-none opacity-20 blur-3xl"
                    style={{
                        background: "radial-gradient(circle, #7c3aed 0%, #06b6d4 50%, transparent 70%)",
                    }}
                />

                <div className="max-w-4xl mx-auto relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-6 text-xs font-bold" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
                        <Sparkles size={13} className="text-violet-500" />
                        <span style={{ color: "var(--accent)" }}>LUMIFY INTELLIGENCE</span>
                        <span className="text-muted">·</span>
                        <span className="text-secondary">See your money clearly.</span>
                    </div>

                    <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.08]" style={{ color: "var(--text-primary)" }}>
                        Understand your money.{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400">
                            Build real wealth.
                        </span>
                    </h1>

                    <p className="mt-6 text-base sm:text-xl max-w-2xl mx-auto text-secondary leading-relaxed">
                        Lumify is a modern personal financial platform that turns complex accounts, transactions, and obligations into crystal clarity.
                    </p>

                    <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link to="/signup" className="primary-btn text-base px-8 py-3.5 w-full sm:w-auto">
                            Get Started Free <ArrowRight size={17} />
                        </Link>
                        <Link to="/login" className="secondary-btn text-base px-8 py-3.5 w-full sm:w-auto">
                            Sign In to Dashboard
                        </Link>
                    </div>

                    {/* Trust Badges */}
                    <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-secondary">
                        <span className="flex items-center gap-1.5">
                            <ShieldCheck size={16} className="text-emerald-500" /> Transparent &amp; Private
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Zap size={16} className="text-cyan-500" /> Zero Fake AI Claims
                        </span>
                        <span className="flex items-center gap-1.5">
                            <CheckCircle2 size={16} className="text-violet-500" /> Installable PWA Ready
                        </span>
                    </div>
                </div>
            </section>

            {/* Feature Highlights Grid */}
            <section id="features" className="py-20 px-6 border-t" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <p className="eyebrow">COMPLETE FINTECH SUITE</p>
                        <h2 className="text-3xl sm:text-4xl font-black mt-2">
                            Everything you need to master your money
                        </h2>
                        <p className="mt-3 text-secondary text-sm">
                            Built with precision for anyone who refuses to guess where their cash went.
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <FeatureCard
                            icon={<WalletCards className="text-cyan-500" size={24} />}
                            title="Multi-Account Tracking"
                            description="Unify Cash, Bank, UPI, Wallets, and Credit Cards with real-time balance calculations and seamless internal transfers."
                        />
                        <FeatureCard
                            icon={<Target className="text-emerald-500" size={24} />}
                            title="Dynamic Budget Control"
                            description="Set proactive monthly and category spending limits with 80% caution warnings and real-time overspending alerts."
                        />
                        <FeatureCard
                            icon={<Repeat className="text-violet-500" size={24} />}
                            title="Bills & Subscriptions"
                            description="Never get surprised by auto-debits. Track recurring bill due dates, calculate annual subscription burden, and pause inactive services."
                        />
                        <FeatureCard
                            icon={<Sparkles className="text-amber-500" size={24} />}
                            title="Financial Health Score"
                            description="Get an honest 0-100 metric calculated transparently from savings rate, budget limits, overdue bills, and subscription burden."
                        />
                        <FeatureCard
                            icon={<ScanLine className="text-rose-500" size={24} />}
                            title="Receipt OCR & Voice Logging"
                            description="Scan receipts with built-in OCR or speak naturally to draft transactions. Review and verify every detail before saving."
                        />
                        <FeatureCard
                            icon={<BarChart3 className="text-indigo-500" size={24} />}
                            title="Purchase Decision Assistant"
                            description="Evaluating a big purchase? Lumify analyzes available funds, upcoming obligations, and safety buffers to recommend BUY, WAIT, or CAUTION."
                        />
                    </div>
                </div>
            </section>

            {/* Financial Copilot Preview Banner */}
            <section id="intelligence" className="py-20 px-6">
                <div className="max-w-5xl mx-auto surface p-8 sm:p-12 rounded-3xl border border-violet-500/30 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-500 text-xs font-bold mb-4">
                            <Sparkles size={14} /> HONEST INTELLIGENCE
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-black max-w-xl">
                            A Financial Copilot that speaks truth, not hype.
                        </h2>
                        <p className="mt-4 text-secondary text-sm sm:text-base max-w-2xl leading-relaxed">
                            Unlike gimmicks that make wild predictions, Lumify Intelligence operates purely on your verified ledger data. It computes real savings opportunities, alerts you before bills go past due, and calculates whether you can actually afford that new smartphone or vacation.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-4">
                            <Link to="/signup" className="primary-btn">
                                Start with Lumify Copilot <ArrowRight size={15} />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Privacy & Security Section */}
            <section id="security" className="py-20 px-6 border-t" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <p className="eyebrow">UNCOMPROMISING PROTECTION</p>
                        <h2 className="text-3xl sm:text-4xl font-black mt-2">
                            Bank-Grade Privacy &amp; Security
                        </h2>
                        <p className="mt-3 text-secondary text-sm">
                            Your financial information deserves the highest level of security and privacy by design.
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
                        <div className="surface p-6 rounded-2xl border" style={{ borderColor: "var(--border)" }}>
                            <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center mb-4">
                                <Lock size={22} />
                            </div>
                            <h3 className="font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>Salted Bcrypt Hashing</h3>
                            <p className="text-xs text-secondary leading-relaxed">
                                Passwords are never stored in plaintext and never exposed in API payloads. All credentials are encrypted with 12 rounds of bcrypt hashing.
                            </p>
                        </div>

                        <div className="surface p-6 rounded-2xl border" style={{ borderColor: "var(--border)" }}>
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                                <ShieldCheck size={22} />
                            </div>
                            <h3 className="font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>Stateless JWT Sessions</h3>
                            <p className="text-xs text-secondary leading-relaxed">
                                Secure, cryptographically signed JSON Web Tokens handle authorization with automatic expiration and protected API middleware.
                            </p>
                        </div>

                        <div className="surface p-6 rounded-2xl border" style={{ borderColor: "var(--border)" }}>
                            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mb-4">
                                <CheckCircle2 size={22} />
                            </div>
                            <h3 className="font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>Complete Data Ownership</h3>
                            <p className="text-xs text-secondary leading-relaxed">
                                You own 100% of your financial records. Export complete JSON snapshots anytime to maintain independent offline spreadsheets.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="mt-auto border-t py-12 px-6" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
                    <Logo size="small" />
                    <p className="text-xs text-secondary text-center sm:text-left">
                        &copy; {new Date().getFullYear()} Lumify. All rights reserved. See your money clearly.
                    </p>
                    <div className="flex items-center gap-5 text-xs text-secondary font-semibold">
                        <Link to="/login" className="hover:text-primary transition">
                            Sign In
                        </Link>
                        <Link to="/signup" className="hover:text-primary transition">
                            Create Account
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, description }) {
    return (
        <div className="surface p-6 rounded-2xl border transition hover:-translate-y-1" style={{ borderColor: "var(--border)" }}>
            <div className="w-12 h-12 rounded-xl bg-elevated flex items-center justify-center mb-4 border" style={{ borderColor: "var(--border)" }}>
                {icon}
            </div>
            <h3 className="font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>
                {title}
            </h3>
            <p className="text-xs text-secondary leading-relaxed">{description}</p>
        </div>
    );
}