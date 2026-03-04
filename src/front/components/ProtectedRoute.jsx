import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

export const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
                <Loader2 size={48} className="spin" color="var(--color-primary)" style={{ marginBottom: "1rem" }} />
                <h2 style={{ color: "#64748b", fontWeight: 600, fontSize: "1.1rem" }}>Verificando sesión...</h2>
            </div>
        );
    }

    if (!isAuthenticated) {
        // Redirige al login, guardando de dónde venía el usuario
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};
