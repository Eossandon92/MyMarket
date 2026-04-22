import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Lock, Mail, Eye, EyeOff, Loader2, ShoppingBag } from "lucide-react";

const loginBg = "/login-bg.png";

export const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setError("Todos los campos son obligatorios");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const user = await login(email, password);
            if (user.role === "superadmin") {
                navigate("/superadmin/dashboard");
            } else {
                navigate("/");
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: "100vh", width: "100%", display: "flex",
            fontFamily: "Inter, sans-serif", overflow: "hidden"
        }}>
            {/* Left side - Login Form */}
            <div style={{
                flex: "0 0 480px", display: "flex", flexDirection: "column",
                justifyContent: "center", padding: "3rem",
                background: "white", position: "relative", zIndex: 2,
                boxShadow: "4px 0 30px rgba(0,0,0,0.08)"
            }}>
                {/* Logo unificado con Sidebar */}
                <div className="sidebar-logo" style={{ padding: '0', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                    <div className="sidebar-logo-icon" style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2ecc71', borderRadius: '12px', color: 'white' }}>
                        <ShoppingBag size={24} />
                    </div>
                    <h2 style={{ fontSize: "1.9rem", fontWeight: 950, margin: 0, letterSpacing: "-1.2px", display: 'flex' }}>
                        <span style={{ color: "#fbc531" }}>Z</span>
                        <span style={{ color: "#eb4d4b" }}>o</span>
                        <span style={{ color: "#27ae60" }}>k</span>
                        <span style={{ color: "#00a8ff" }}>o</span>
                    </h2>
                </div>

                {/* Welcome text */}
                <div style={{ marginBottom: "2rem" }}>
                    <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.75rem", fontWeight: 800, color: "#0f172a" }}>
                        Bienvenido
                    </h1>
                    <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem", lineHeight: 1.5 }}>
                        Inicia sesión para acceder a tu punto de venta
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div style={{
                        background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626",
                        padding: "0.75rem 1rem", borderRadius: "12px", marginBottom: "1.5rem",
                        fontSize: "0.88rem", fontWeight: 600, textAlign: "center"
                    }}>
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

                    <div>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.03em" }}>
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
                                autoComplete="email"
                                onFocus={(e) => { e.target.style.borderColor = "#27ae60"; e.target.style.boxShadow = "0 0 0 3px rgba(39,174,96,0.1)"; }}
                                onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.03em" }}>
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
                                autoComplete="current-password"
                                onFocus={(e) => { e.target.style.borderColor = "#27ae60"; e.target.style.boxShadow = "0 0 0 3px rgba(39,174,96,0.1)"; }}
                                onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
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
                            background: "#27ae60", color: "white", border: "none",
                            padding: "0.9rem", borderRadius: "12px", fontSize: "1rem", fontWeight: 700,
                            marginTop: "0.5rem", cursor: loading ? "not-allowed" : "pointer",
                            display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem",
                            transition: "all 0.2s", boxShadow: "0 4px 12px rgba(39, 174, 96, 0.3)",
                            opacity: loading ? 0.7 : 1
                        }}
                        onMouseOver={(e) => { if (!loading) e.currentTarget.style.background = "#219a52"; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = "#27ae60"; }}
                    >
                        {loading ? <Loader2 size={20} className="spin" /> : "Iniciar Sesión"}
                    </button>
                </form>

                {/* Footer */}
                <div style={{ marginTop: "2.5rem", textAlign: "center", color: "#94a3b8", fontSize: "0.8rem" }}>
                    <p style={{ margin: 0 }}>Sistema de Punto de Venta — Zoko by Ossembly</p>
                    <p style={{ margin: "0.25rem 0 0", fontWeight: 500 }}>© 2026 Todos los derechos reservados</p>
                </div>
            </div>

            {/* Right side - Background Image */}
            <div style={{
                flex: 1, position: "relative",
                backgroundColor: "#0f172a", // Darker fallback
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden"
            }}>
                {/* Overlay to ensure the image text/contrast is always good and looks premium */}
                <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(135deg, rgba(39, 174, 96, 0.1) 0%, rgba(15, 23, 42, 0.4) 100%)",
                    zIndex: 1
                }} />

                <img
                    src={loginBg}
                    alt="Zoko Minimarket"
                    style={{
                        width: "100%", height: "100%",
                        objectFit: "cover", objectPosition: "center",
                        zIndex: 0
                    }}
                />

                {/* Edge gradient to blend seamlessly with the white login panel */}
                <div style={{
                    position: "absolute", left: 0, top: 0, bottom: 0, width: "120px",
                    background: "linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)",
                    zIndex: 2
                }} />
            </div>

            {/* Responsive: on small screens stack vertically */}
            <style>{`
                @media (max-width: 900px) {
                    .login-wrapper > div:first-child {
                        flex: 1 !important;
                        min-width: 100% !important;
                    }
                    .login-wrapper > div:last-child {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
};

const inputStyle = {
    width: "100%", padding: "0.875rem 1rem 0.875rem 2.75rem", borderRadius: "12px",
    border: "2px solid #e2e8f0", fontSize: "0.95rem", color: "#0f172a", boxSizing: "border-box",
    background: "#f8fafc", outline: "none", transition: "all 0.2s", fontFamily: "inherit"
};
