import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Lumify caught an unhandled runtime error:", error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
                    <div className="surface max-w-md w-full p-8 text-center rounded-3xl shadow-2xl border" style={{ borderColor: "var(--border)" }}>
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-500 mb-4">
                            <AlertTriangle size={28} />
                        </div>
                        <h1 className="text-2xl font-black mb-2">Lumify ran into a problem.</h1>
                        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                            We encountered an unexpected issue rendering this view. Your financial records and sessions remain safe.
                        </p>
                        <button
                            onClick={this.handleReset}
                            className="primary-btn w-full py-3"
                        >
                            <RefreshCw size={16} /> Try Again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
