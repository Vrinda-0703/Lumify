import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, UserPlus, AlertCircle, CheckCircle2 } from "lucide-react";
import { signup } from "../services/authService";
import Logo from "../components/Brand/Logo";

export default function Signup() {
    const nav = useNavigate();
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (form.name.trim().length < 2) {
            return setError("Name must be at least 2 characters.");
        }
        if (!/^\S+@\S+\.\S+$/.test(form.email)) {
            return setError("Please enter a valid email address.");
        }
        if (form.password.length < 8) {
            return setError("Password must be at least 8 characters long.");
        }
        if (form.password !== form.confirmPassword) {
            return setError("Passwords do not match.");
        }

        setBusy(true);
        try {
            await signup({
                name: form.name.trim(),
                email: form.email.trim(),
                password: form.password,
            });
            setSuccess("Account created successfully! Redirecting you to login…");
            setTimeout(() => {
                nav("/login", { replace: true });
            }, 1800);
        } catch (e) {
            setError(e.response?.data?.message || "Unable to create account right now.");
            setBusy(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="flex items-center justify-between mb-8">
                    <Logo size="default" />
                </div>

                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center mb-5">
                    <UserPlus size={22} />
                </div>

                <h1 className="text-2xl font-black mb-1" style={{ color: "var(--text-primary)" }}>
                    Create your account
                </h1>
                <p className="text-xs text-secondary mb-6">
                    Join Lumify to see your money clearly.
                </p>

                {error && (
                    <div className="alert error mb-5 flex items-center gap-2 text-xs">
                        <AlertCircle size={15} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className="alert success mb-5 flex items-center gap-2 text-xs">
                        <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
                        <span>{success}</span>
                    </div>
                )}

                <form onSubmit={submit} className="auth-form">
                    <label>
                        Full Name
                        <input
                            className="input"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="e.g. Alex Sharma"
                            autoComplete="name"
                            disabled={Boolean(success)}
                            required
                        />
                    </label>

                    <label>
                        Email Address
                        <input
                            className="input"
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="you@example.com"
                            autoComplete="email"
                            disabled={Boolean(success)}
                            required
                        />
                    </label>

                    <label>
                        Password (8+ characters)
                        <input
                            className="input"
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            placeholder="Create a secure password"
                            autoComplete="new-password"
                            disabled={Boolean(success)}
                            required
                        />
                    </label>

                    <label>
                        Confirm Password
                        <input
                            className="input"
                            type="password"
                            value={form.confirmPassword}
                            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                            placeholder="Repeat password"
                            autoComplete="new-password"
                            disabled={Boolean(success)}
                            required
                        />
                    </label>

                    <button disabled={busy || Boolean(success)} className="primary-btn mt-2 py-3">
                        {busy ? "Creating account…" : success ? "Redirecting…" : <>Create Account <ArrowRight size={16} /></>}
                    </button>
                </form>

                <p className="auth-foot">
                    Already have an account? <Link to="/login">Sign in</Link>
                </p>
            </div>
        </div>
    );
}
