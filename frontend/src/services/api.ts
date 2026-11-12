
import axios from "axios";
import { invalidateRecordCache } from "./recordCache";

const envUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");

export const getApiOrigin = (): string => {
    if (envUrl) {
        try {
            return new URL(envUrl).origin;
        } catch {
            console.error("Invalid VITE_API_URL:", envUrl);
        }
    }

    if (typeof window !== "undefined") {
        const host = window.location.hostname;

        if (host === "localhost" || host === "127.0.0.1") {
            return "http://127.0.0.1:8000";
        }

        return window.location.origin;
    }

    return "http://127.0.0.1:8000";
};

export const getApiBaseUrl = (): string => {
    if (envUrl) {
        return envUrl;
    }

    return `${getApiOrigin()}/api`;
};

export const resolveImageUrl = (
    path: string | null | undefined
): string | null => {
    if (!path) return null;

    const trimmed = String(path).trim();

    if (!trimmed) return null;

    if (
        trimmed.startsWith("http://") ||
        trimmed.startsWith("https://") ||
        trimmed.startsWith("data:") ||
        trimmed.startsWith("blob:")
    ) {
        return trimmed;
    }

    const cleanPath = trimmed.startsWith("/")
        ? trimmed
        : `/${trimmed}`;

    return `${getApiOrigin()}${cleanPath}`;
};

const api = axios.create({
    baseURL: getApiBaseUrl(),
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => {
        const method = response.config.method?.toLowerCase() || "get";

        if (!["get", "head", "options"].includes(method)) {
            invalidateRecordCache();
        }

        return response;
    },
    (error) => {
        if (error?.response?.status === 401) {
            invalidateRecordCache();

            localStorage.removeItem("token");
            localStorage.removeItem("user");

            if (
                typeof window !== "undefined" &&
                !window.location.pathname.startsWith("/login")
            ) {
                window.location.href = "/login";
            }
        }

        return Promise.reject(error);
    }
);

export default api;
