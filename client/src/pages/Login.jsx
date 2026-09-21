import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, LockKeyhole, AlertCircle } from "lucide-react";
import { login } from "../services/authService";
import Logo from "../components/Brand/Logo";

export default function Login() {
    const nav = useNavigate();
    const [form, setForm] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        if (!/^\S+@\S+\.\S+$/.test(form.email)) {
            return setError("Please enter a valid email address.");
        }
        if (!form.password) {
            return setError("Please enter your password.");
        }

        setBusy(true);
        try {
            const r = await login(form);
            localStorage.setItem("token", r.token);
            localStorage.setItem("user", JSON.stringify(r.user));
            nav("/dashboard", { replace: true });
        } catch (e) {
            setError(e.response?.data?.message || "Unable to log in. Please check your credentials.");
        } finally {
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
                    <LockKeyhole size={22} />
                </div>

                <h1 className="text-2xl font-black mb-1" style={{ color: "var(--text-primary)" }}>
                    Welcome back
                </h1>
                <p className="text-xs text-secondary mb-6">
                    Sign in to access your Lumify financial dashboard.
                </p>

                {error && (
                    <div className="alert error mb-5 flex items-center gap-2 text-xs">
                        <AlertCircle size={15} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={submit} className="auth-form">
                    <label>
                        Email Address
                        <input
                            className="input"
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="you@example.com"
                            autoComplete="email"
                            required
                        />
                    </label>

                    <label>
                        Password
                        <input
                            className="input"
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            placeholder="Your password"
                            autoComplete="current-password"
                            required
                        />
                    </label>

                    <button disabled={busy} className="primary-btn mt-2 py-3">
                        {busy ? "Signing in…" : <>Sign In <ArrowRight size={16} /></>}
                    </button>
                </form>

                <p className="auth-foot">
                    New to Lumify? <Link to="/signup">Create an account</Link>
                </p>
            </div>
        </div>
    );
}
