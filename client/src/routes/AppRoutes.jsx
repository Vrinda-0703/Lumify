import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Logo from "../components/Brand/Logo";

// Route-level code splitting for performance & small initial bundle
const Landing = lazy(() => import("../pages/Landing"));
const Login = lazy(() => import("../pages/Login"));
const Signup = lazy(() => import("../pages/Signup"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Transactions = lazy(() => import("../pages/Transactions"));
const Profile = lazy(() => import("../pages/Profile"));
const Budget = lazy(() => import("../pages/Budget"));
const Analytics = lazy(() => import("../pages/Analytics"));
const SmartTools = lazy(() => import("../pages/SmartTools"));
const AIAssistant = lazy(() => import("../pages/AIAssistant"));
const NotFound = lazy(() => import("../pages/NotFound"));

const isAuthed = () => Boolean(localStorage.getItem("token"));

function Protected({ children }) {
    return isAuthed() ? children : <Navigate to="/login" replace />;
}

function Public({ children }) {
    return isAuthed() ? <Navigate to="/dashboard" replace /> : children;
}

function LoadingFallback() {
    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-6 text-center select-none"
            style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
        >
            <div className="animate-pulse flex flex-col items-center gap-4">
                <Logo size="default" />
                <div
                    className="h-1.5 w-32 rounded-full overflow-hidden mt-2"
                    style={{ background: "var(--bg-elevated)" }}
                >
                    <div className="h-full w-full bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full animate-pulse" />
                </div>
            </div>
        </div>
    );
}

export default function AppRoutes() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route
                    path="/login"
                    element={
                        <Public>
                            <Login />
                        </Public>
                    }
                />
                <Route
                    path="/signup"
                    element={
                        <Public>
                            <Signup />
                        </Public>
                    }
                />
                <Route
                    path="/dashboard"
                    element={
                        <Protected>
                            <Dashboard />
                        </Protected>
                    }
                />
                <Route
                    path="/transactions"
                    element={
                        <Protected>
                            <Transactions />
                        </Protected>
                    }
                />
                <Route
                    path="/profile"
                    element={
                        <Protected>
                            <Profile />
                        </Protected>
                    }
                />
                <Route
                    path="/settings"
                    element={
                        <Protected>
                            <Profile />
                        </Protected>
                    }
                />
                <Route
                    path="/budget"
                    element={
                        <Protected>
                            <Budget />
                        </Protected>
                    }
                />
                <Route
                    path="/analytics"
                    element={
                        <Protected>
                            <Analytics />
                        </Protected>
                    }
                />
                <Route
                    path="/tools"
                    element={
                        <Protected>
                            <SmartTools />
                        </Protected>
                    }
                />
                <Route
                    path="/ai"
                    element={
                        <Protected>
                            <AIAssistant />
                        </Protected>
                    }
                />
                <Route path="/404" element={<NotFound />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Suspense>
    );
}
