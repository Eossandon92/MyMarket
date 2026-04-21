import React, { createContext, useContext, useState, useEffect } from "react";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
export const API = `${backendUrl}/api`;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);       // user object from API
    const [token, setToken] = useState(null);      // JWT string
    const [loading, setLoading] = useState(true);  // initial session check

    // On mount: restore session from localStorage if token is still valid
    useEffect(() => {
        const storedToken = localStorage.getItem("zoko_token");
        const storedUser = localStorage.getItem("zoko_user");
        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const res = await fetch(`${API}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.msg || "Error al iniciar sesión");

        // Persist to localStorage
        localStorage.setItem("zoko_token", data.token);
        localStorage.setItem("zoko_user", JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return data.user;
    };

    const logout = () => {
        localStorage.removeItem("zoko_token");
        localStorage.removeItem("zoko_user");
        setToken(null);
        setUser(null);
    };

    // Convenience: the active business_id
    const businessId = user?.business_id ?? null;
    const businessName = user?.business_name ?? "Sistema POS";
    const isSuperAdmin = user?.role === "superadmin";

    return (
        <AuthContext.Provider value={{ user, token, businessId, businessName, isSuperAdmin, login, logout, loading, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook
export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
    return ctx;
};
