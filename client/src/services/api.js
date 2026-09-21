import axios from "axios";

const getApiBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (typeof window !== "undefined") {
        return "/api";
    }
    return "http://localhost:5000/api";
};

const API_BASE_URL = getApiBaseUrl();

// Used for links to server-hosted files such as uploaded receipts.
export const API_ORIGIN = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "")
    : typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:5000";

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    const curr = localStorage.getItem("lumify_currency") || "INR";
    config.headers["x-currency"] = curr;
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            if (
                typeof window !== "undefined" &&
                window.location.pathname !== "/login" &&
                window.location.pathname !== "/signup"
            ) {
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

export default api;
