import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Lock, Mail, Building2, Eye, EyeOff, Loader2 } from "lucide-react";

export const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [businessId, setBusinessId] = useState("1"); // Por defecto negocio 1
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password || !businessId) {
            setError("Todos los campos son obligatorios");
            return;
        }

        setLoading(true);
        setError("");

        try {
            await login(parseInt(businessId), email, password);
            navigate("/"); // Redirige al inicio tras login exitoso
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)", fontFamily: "Inter, sans-serif"
        }}>
            <div style={{
                background: "white", padding: "2.5rem", borderRadius: "24px", width: "100%", maxWidth: "420px",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
            }}>

                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <div style={{
                        width: "64px", height: "64px", background: "var(--color-primary-light)",
                        borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "0 auto 1.5rem"
                    }}>
                        <Lock size={32} color="var(--color-primary)" />
                    </div>
                    <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.75rem", fontWeight: 800, color: "#0f172a" }}>
                        Bienvenido a MyMarket
                    </h1>
                    <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem" }}>
                        Inicia sesión para acceder a tu punto de venta
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626",
                        padding: "0.75rem 1rem", borderRadius: "12px", marginBottom: "1.5rem",
                        fontSize: "0.9rem", fontWeight: 600, textAlign: "center"
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

                    <div>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 600, color: "#334155" }}>
                            ID de Sucursal / Negocio
                        </label>
                        <div style={{ position: "relative" }}>
                            <Building2 size={18} color="#94a3b8" style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)" }} />
                            <input
                                type="number"
                                value={businessId}
                                onChange={(e) => setBusinessId(e.target.value)}
                                placeholder="Ej. 1"
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 600, color: "#334155" }}>
                            Correo Electrónico
                        </label>
                        <div style={{ position: "relative" }}>
                            <Mail size={18} color="#94a3b8" style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)" }} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tu@correo.com"
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 600, color: "#334155" }}>
                            Contraseña
                        </label>
                        <div style={{ position: "relative" }}>
                            <Lock size={18} color="#94a3b8" style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)" }} />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                style={inputStyle}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)",
                                    background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            background: "var(--color-primary)", color: "white", border: "none",
                            padding: "1rem", borderRadius: "12px", fontSize: "1rem", fontWeight: 700,
                            marginTop: "0.5rem", cursor: loading ? "not-allowed" : "pointer",
                            display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem",
                            transition: "all 0.2s", boxShadow: "0 4px 12px rgba(39, 174, 96, 0.3)",
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? <Loader2 size={20} className="spin" /> : "Iniciar Sesión"}
                    </button>
                </form>
            </div>
        </div>
    );
};

const inputStyle = {
    width: "100%", padding: "0.875rem 1rem 0.875rem 2.75rem", borderRadius: "12px",
    border: "1px solid #e2e8f0", fontSize: "0.95rem", color: "#0f172a", boxSizing: "border-box",
    background: "#f8fafc", outline: "none", transition: "all 0.2s"
};
