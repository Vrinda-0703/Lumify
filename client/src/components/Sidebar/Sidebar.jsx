import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    ArrowLeftRight,
    Target,
    BarChart3,
    Sparkles,
    Settings,
    LogOut,
    Wrench,
    Menu,
    X,
    Sun,
    Moon,
} from "lucide-react";
import Logo from "../Brand/Logo";
import { useTheme } from "../../context/ThemeContext";

export default function Sidebar() {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const { theme, setTheme } = useTheme();

    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const items = [
        ["Dashboard", "/dashboard", LayoutDashboard],
        ["Transactions", "/transactions", ArrowLeftRight],
        ["Budget", "/budget", Target],
        ["Analytics", "/analytics", BarChart3],
        ["Smart Tools", "/tools", Wrench],
        ["Smart Insights", "/ai", Sparkles],
    ];

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
    };

    const nextTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    const themeIcon = theme === "light" ? <Sun size={15} /> : <Moon size={15} />;
    const themeLabel = theme === "light" ? "Light Mode" : "Dark Mode";

    const mobileBottomItems = [
        ["Dashboard", "/dashboard", LayoutDashboard],
        ["Transact", "/transactions", ArrowLeftRight],
        ["Budget", "/budget", Target],
        ["Analytics", "/analytics", BarChart3],
        ["Insights", "/ai", Sparkles],
    ];

    const navContent = (
        <>
            <div className="sidebar-brand">
                <Logo size="default" />
            </div>

            <nav className="sidebar-nav">
                {items.map(([name, path, Icon]) => (
                    <NavLink
                        key={path}
                        to={path}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
                    >
                        <Icon size={18} />
                        <span>{name}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-ai">
                <div>
                    <Sparkles size={14} />
                    <span>LUMIFY COPILOT</span>
                </div>
                <p>Real-time financial intelligence & purchase decision assistant.</p>
            </div>

            <div className="sidebar-footer">
                <button
                    type="button"
                    onClick={nextTheme}
                    title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
                >
                    {themeIcon}
                    <span>{themeLabel}</span>
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setOpen(false);
                        navigate("/profile");
                    }}
                >
                    <Settings size={16} />
                    <span>Settings</span>
                </button>
                <button type="button" onClick={logout}>
                    <LogOut size={16} />
                    <span>Log Out</span>
                </button>
            </div>

            <div className="sidebar-user">
                <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="avatar">{(user.name || "L").charAt(0).toUpperCase()}</div>
                    <div className="overflow-hidden">
                        <strong className="block text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>
                            {user.name || "Lumify Member"}
                        </strong>
                        <span className="block text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
                            {user.email || ""}
                        </span>
                    </div>
                </div>
            </div>
        </>
    );

    return (
        <>
            <button
                className="mobile-menu"
                onClick={() => setOpen(true)}
                aria-label="Open navigation drawer"
            >
                <Menu size={20} />
            </button>

            {open && (
                <button
                    className="mobile-overlay"
                    onClick={() => setOpen(false)}
                    aria-label="Close navigation"
                />
            )}

            <aside className={`sidebar ${open ? "open" : ""}`}>
                <button
                    className="mobile-close"
                    onClick={() => setOpen(false)}
                    aria-label="Close menu"
                >
                    <X size={20} />
                </button>
                {navContent}
            </aside>

            {/* Mobile Bottom Navigation Bar */}
            <nav className="mobile-bottom-nav">
                {mobileBottomItems.map(([name, path, Icon]) => (
                    <NavLink
                        key={path}
                        to={path}
                        className={({ isActive }) => `mobile-bottom-link ${isActive ? "active" : ""}`}
                    >
                        <Icon size={17} />
                        <span>{name}</span>
                    </NavLink>
                ))}
            </nav>
        </>
    );
}
