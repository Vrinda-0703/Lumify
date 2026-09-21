import { Link } from "react-router-dom";
import Logo from "../components/Brand/Logo";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
            style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
        >
            <div className="mb-8">
                <Logo size="large" />
            </div>

            <div
                className="surface max-w-md w-full p-8 rounded-3xl border shadow-xl"
                style={{ borderColor: "var(--border)" }}
            >
                <p className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-cyan-400 mb-2">
                    404
                </p>
                <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
                <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                    The page you are looking for might have been moved or does not exist.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link to="/dashboard" className="primary-btn">
                        <Home size={16} /> Go to Dashboard
                    </Link>
                    <Link to="/" className="secondary-btn">
                        <ArrowLeft size={16} /> Back Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
