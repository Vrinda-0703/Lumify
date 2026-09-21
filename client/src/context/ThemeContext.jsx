import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(() => {
        const saved = typeof window !== "undefined" ? localStorage.getItem("lumify_theme") : null;
        if (saved === "system") {
            try {
                localStorage.setItem("lumify_theme", "light");
            } catch {
                // ignore storage failures
            }
            return "light";
        }
        return saved === "light" ? "light" : "dark";
    });

    useEffect(() => {
        const root = document.documentElement;

        if (theme === "light") {
            root.classList.add("light-theme", "light");
            root.classList.remove("dark-theme", "dark");
        } else {
            root.classList.remove("light-theme", "light");
            root.classList.add("dark-theme", "dark");
        }

        try {
            localStorage.setItem("lumify_theme", theme);
        } catch {
            // ignore storage failures
        }
    }, [theme]);

    const setTheme = (newTheme) => {
        if (newTheme === "dark" || newTheme === "light") {
            setThemeState(newTheme);
        }
    };

    const toggleTheme = () => {
        setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
    };

    return (
        <ThemeContext.Provider
            value={{
                theme,
                resolvedTheme: theme,
                setTheme,
                toggleTheme,
                isLight: theme === "light",
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}

export default ThemeContext;
