import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";

export const CURRENCIES = [
    { code: "INR", symbol: "₹", name: "Indian Rupee (₹)", locale: "en-IN" },
    { code: "USD", symbol: "$", name: "US Dollar ($)", locale: "en-US" },
    { code: "EUR", symbol: "€", name: "Euro (€)", locale: "en-IE" },
    { code: "GBP", symbol: "£", name: "British Pound (£)", locale: "en-GB" },
];

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
    const [currency, setCurrencyState] = useState(() => {
        return localStorage.getItem("lumify_currency") || "INR";
    });

    const setCurrency = useCallback((newCurrency) => {
        if (!newCurrency) return;
        const matched = CURRENCIES.find((c) => c.code === newCurrency.toUpperCase());
        const code = matched ? matched.code : newCurrency.toUpperCase();
        setCurrencyState(code);
        localStorage.setItem("lumify_currency", code);
        window.dispatchEvent(new CustomEvent("lumify_currency_change", { detail: code }));
    }, []);

    useEffect(() => {
        const handleCustomEvent = (e) => {
            if (e?.detail && e.detail !== currency) {
                setCurrencyState(e.detail);
            }
        };

        const handleStorage = (e) => {
            if (e.key === "lumify_currency" && e.newValue && e.newValue !== currency) {
                setCurrencyState(e.newValue);
            }
        };

        window.addEventListener("lumify_currency_change", handleCustomEvent);
        window.addEventListener("storage", handleStorage);
        return () => {
            window.removeEventListener("lumify_currency_change", handleCustomEvent);
            window.removeEventListener("storage", handleStorage);
        };
    }, [currency]);

    const currencyConfig = useMemo(() => {
        return CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0];
    }, [currency]);

    const currencySymbol = currencyConfig.symbol;

    const money = useCallback(
        (n, fractionDigits = 0) => {
            const num = Number(n) || 0;
            try {
                return new Intl.NumberFormat(currencyConfig.locale, {
                    style: "currency",
                    currency: currencyConfig.code,
                    maximumFractionDigits: fractionDigits,
                }).format(num);
            } catch {
                return `${currencyConfig.symbol}${Math.round(num).toLocaleString()}`;
            }
        },
        [currencyConfig]
    );

    const value = useMemo(
        () => ({
            currency,
            setCurrency,
            currencyConfig,
            currencySymbol,
            money,
            CURRENCIES,
        }),
        [currency, setCurrency, currencyConfig, currencySymbol, money]
    );

    return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
    const context = useContext(CurrencyContext);
    if (!context) {
        // Fallback in case used outside provider to prevent crashes
        const fallbackConfig = CURRENCIES[0];
        return {
            currency: "INR",
            setCurrency: () => {},
            currencyConfig: fallbackConfig,
            currencySymbol: "₹",
            CURRENCIES,
            money: (n, fractionDigits = 0) =>
                new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: fractionDigits,
                }).format(Number(n) || 0),
        };
    }
    return context;
}

export default CurrencyContext;
