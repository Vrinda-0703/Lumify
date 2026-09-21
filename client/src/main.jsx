import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { ThemeProvider } from "./context/ThemeContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <ErrorBoundary>
            <ThemeProvider>
                <CurrencyProvider>
                    <BrowserRouter>
                        <App />
                    </BrowserRouter>
                </CurrencyProvider>
            </ThemeProvider>
        </ErrorBoundary>
    </StrictMode>
);
