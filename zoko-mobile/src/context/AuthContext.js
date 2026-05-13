import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Configuración de la API (Usa tu IP local para desarrollo o tu URL de Vercel para producción)
export const API = "https://zoko-pos.vercel.app/api"; 

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSession = async () => {
            try {
                const storedToken = await AsyncStorage.getItem("zoko_token");
                const storedUser = await AsyncStorage.getItem("zoko_user");
                if (storedToken && storedUser) {
                    try {
                        const parsedUser = JSON.parse(storedUser);
                        setToken(storedToken);
                        setUser(parsedUser);
                    } catch (parseError) {
                        // Si el JSON está mal, limpiamos para evitar crashes infinitos
                        await AsyncStorage.multiRemove(["zoko_token", "zoko_user"]);
                    }
                }
            } catch (e) {
                console.error("Error loading session", e);
            } finally {
                setLoading(false);
            }
        };
        loadSession();
    }, []);

    const login = async (email, password) => {
        try {
            const res = await fetch(`${API}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim().toLowerCase(), password })
            });

            const data = await res.json().catch(() => ({ msg: "Respuesta del servidor no válida" }));
            
            if (!res.ok) {
                throw new Error(data.msg || data.message || "Error al iniciar sesión");
            }

            if (!data.token || !data.user) {
                throw new Error("El servidor no devolvió los datos de usuario");
            }

            await AsyncStorage.setItem("zoko_token", data.token);
            await AsyncStorage.setItem("zoko_user", JSON.stringify(data.user));
            setToken(data.token);
            setUser(data.user);
            return data.user;
        } catch (error) {
            console.error("Login error:", error);
            throw error;
        }
    };

    const logout = async () => {
        await AsyncStorage.removeItem("zoko_token");
        await AsyncStorage.removeItem("zoko_user");
        setToken(null);
        setUser(null);
    };

    const updateSessionUser = async (updatedUser) => {
        const newUser = { ...user, ...updatedUser };
        await AsyncStorage.setItem("zoko_user", JSON.stringify(newUser));
        setUser(newUser);
    };

    const businessId = user?.business_id ?? null;
    const businessName = user?.business_name ?? "Sistema POS";
    const isSuperAdmin = user?.role === "superadmin";

    return (
        <AuthContext.Provider value={{ user, token, businessId, businessName, isSuperAdmin, login, logout, updateSessionUser, loading, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
    return ctx;
};
