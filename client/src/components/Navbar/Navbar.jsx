import { Link } from "react-router-dom";
import Logo from "../Brand/Logo";

export default function Navbar() {
    return (
        <nav
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
        >
            <Logo size="small" />

            <div className="flex items-center gap-3">
                <Link to="/login" className="secondary-btn text-xs py-1.5 px-3">
                    Sign In
                </Link>
                <Link to="/signup" className="primary-btn text-xs py-1.5 px-3">
                    Get Started
                </Link>
            </div>
        </nav>
    );
}