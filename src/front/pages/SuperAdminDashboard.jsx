import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Building2, Plus, Mail, Lock, ShieldAlert, LogOut, CheckCircle, Search, Store } from "lucide-react";

export const SuperAdminDashboard = () => {
    const { token, logout, user, isSuperAdmin } = useAuth();
    const navigate = useNavigate();

    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Modal state for creating a new business
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newBusiness, setNewBusiness] = useState({ name: "", slug: "", adminEmail: "", adminPassword: "" });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");
    const [createSuccess, setCreateSuccess] = useState("");

    useEffect(() => {
        if (!isSuperAdmin) {
            navigate("/"); // boot them out if they aren't superadmin
            return;
        }
        fetchBusinesses();
    }, [isSuperAdmin]);

    const fetchBusinesses = async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const res = await fetch(`${backendUrl}/api/business`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setBusinesses(data);
            } else {
                setError("No se pudieron cargar los negocios.");
            }
        } catch (err) {
            setError("Error de red al cargar negocios.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBusiness = async (e) => {
        e.preventDefault();
        setCreating(true);
        setCreateError("");
        setCreateSuccess("");

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const res = await fetch(`${backendUrl}/api/business`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newBusiness.name,
                    slug: newBusiness.slug,
                    admin_email: newBusiness.adminEmail,
                    admin_password: newBusiness.adminPassword
                })
            });

            const data = await res.json();
            if (res.ok) {
                setCreateSuccess(`¡Negocio ${data.business.name} creado con éxito!`);
                setBusinesses([...businesses, data.business]);
                setTimeout(() => {
                    setIsModalOpen(false);
                    setNewBusiness({ name: "", slug: "", adminEmail: "", adminPassword: "" });
                    setCreateSuccess("");
                }, 2500);
            } else {
                setCreateError(data.msg || "Error al crear el negocio");
            }
        } catch (err) {
            setCreateError("Error de conexión al servidor");
        } finally {
            setCreating(false);
        }
    };

    // Auto-generate slug from name
    const handleNameChange = (e) => {
        const name = e.target.value;
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        setNewBusiness({ ...newBusiness, name, slug });
    };

    return (
        <div style={{ minHeight: "100vh", width: "100%", background: "#f8fafc", fontFamily: "Inter, sans-serif" }}>
            {/* Top Navigation Bar */}
            <nav style={{
                background: "white", padding: "1rem 2rem", display: "flex", justifyContent: "space-between",
                alignItems: "center", borderBottom: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ background: "#0f172a", padding: "0.5rem", borderRadius: "8px", color: "white" }}>
                        <ShieldAlert size={24} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>SuperAdmin Panel</h1>
                        <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Gestión Global de Plataforma</span>
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                    <span style={{ fontWeight: 600, color: "#334155" }}>Hola, {user?.name}</span>
                    <button onClick={() => { logout(); navigate("/login"); }} style={{
                        background: "#fee2e2", color: "#ef4444", border: "none", padding: "0.5rem 1rem",
                        borderRadius: "8px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem"
                    }}>
                        <LogOut size={16} /> Salir
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <main style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                    <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Negocios Afiliados</h2>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        style={{
                            background: "var(--color-primary)", color: "white", border: "none", padding: "0.75rem 1.5rem",
                            borderRadius: "100px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem",
                            boxShadow: "0 4px 10px rgba(46, 204, 113, 0.3)"
                        }}
                    >
                        <Plus size={20} /> Nuevo Inquilino
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: "center", padding: "4rem", color: "#94a3b8" }}>Cargando negocios...</div>
                ) : error ? (
                    <div style={{ background: "#fef2f2", color: "#dc2626", padding: "1rem", borderRadius: "12px", border: "1px solid #fca5a5" }}>{error}</div>
                ) : (
                    <div style={{
                        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem"
                    }}>
                        {businesses.map((b) => (
                            <div key={b.id} style={{
                                background: "white", padding: "1.5rem", borderRadius: "16px", boxShadow: "0 4px 6px rgba(0,0,0,0.02)",
                                border: "1px solid #e2e8f0", display: "flex", flexDirection: "column"
                            }}>
                                <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1rem" }}>
                                    <div style={{ background: "var(--color-primary-light)", padding: "1rem", borderRadius: "12px", color: "var(--color-primary)" }}>
                                        <Store size={28} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>{b.name}</h3>
                                        <span style={{ fontSize: "0.85rem", background: "#f1f5f9", padding: "0.2rem 0.6rem", borderRadius: "100px", color: "#64748b", fontWeight: 600 }}>ID: {b.id}</span>
                                    </div>
                                </div>
                                <div style={{ marginTop: "auto", paddingTop: "1rem", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 500 }}>Slug: {b.slug}</span>
                                    <span style={{ fontSize: "0.85rem", color: "#22c55e", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                        <div style={{ width: "8px", height: "8px", background: "#22c55e", borderRadius: "50%" }}></div> Activo
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Modal for Creating Business */}
            {isModalOpen && (
                <div style={{
                    position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)",
                    display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100
                }}>
                    <div style={{
                        background: "white", width: "100%", maxWidth: "500px", borderRadius: "24px", padding: "2.5rem",
                        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", position: "relative"
                    }}>
                        <button onClick={() => setIsModalOpen(false)} style={{
                            position: "absolute", top: "1.5rem", right: "1.5rem", background: "#f1f5f9", border: "none",
                            width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", color: "#64748b"
                        }}>✕</button>

                        <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>Nuevo Minimarket</h2>
                        <p style={{ color: "#64748b", fontSize: "0.95rem", marginBottom: "2rem" }}>Registra un nuevo negocio y crea la cuenta del administrador dueño de la tienda.</p>

                        {createError && <div style={{ background: "#fef2f2", color: "#dc2626", padding: "0.75rem", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.9rem", fontWeight: 600 }}>{createError}</div>}
                        {createSuccess && <div style={{ background: "#f0fdf4", color: "#16a34a", padding: "0.75rem", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.9rem", fontWeight: 700, display: "flex", gap: "0.5rem" }}><CheckCircle size={18} /> {createSuccess}</div>}

                        <form onSubmit={handleCreateBusiness} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>Nombre del Negocio</label>
                                <div style={{ position: "relative" }}>
                                    <Building2 size={18} color="#94a3b8" style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)" }} />
                                    <input
                                        required type="text" placeholder="Ej. Minimarket Don Pedro"
                                        value={newBusiness.name} onChange={handleNameChange}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>Slug (Identificador Único URL)</label>
                                <input
                                    required type="text" readOnly value={newBusiness.slug}
                                    style={{ ...inputStyle, paddingLeft: "1rem", background: "#f1f5f9", color: "#64748b", cursor: "not-allowed" }}
                                />
                            </div>

                            <hr style={{ border: "none", borderTop: "1px dashed #cbd5e1", margin: "0.5rem 0" }} />

                            <div>
                                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>Correo del Administrador (Dueño)</label>
                                <div style={{ position: "relative" }}>
                                    <Mail size={18} color="#94a3b8" style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)" }} />
                                    <input
                                        required type="email" placeholder="pedro@minimarket.cl"
                                        value={newBusiness.adminEmail} onChange={e => setNewBusiness({ ...newBusiness, adminEmail: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>Contraseña Inicial</label>
                                <div style={{ position: "relative" }}>
                                    <Lock size={18} color="#94a3b8" style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)" }} />
                                    <input
                                        required type="text" placeholder="clavesegura123"
                                        value={newBusiness.adminPassword} onChange={e => setNewBusiness({ ...newBusiness, adminPassword: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit" disabled={creating || createSuccess}
                                style={{
                                    background: createSuccess ? "#22c55e" : "#0f172a", color: "white", padding: "1rem",
                                    borderRadius: "12px", border: "none", fontWeight: 700, fontSize: "1rem", marginTop: "0.5rem",
                                    cursor: creating || createSuccess ? "not-allowed" : "pointer", transition: "all 0.2s",
                                    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.2)"
                                }}
                            >
                                {creating ? "Creando Inquilino..." : createSuccess ? "¡Completado!" : "Crear Negocio y Cuenta"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const inputStyle = {
    width: "100%", padding: "0.875rem 1rem 0.875rem 2.8rem", borderRadius: "10px",
    border: "1px solid #cbd5e1", fontSize: "0.95rem", color: "#0f172a", boxSizing: "border-box",
    background: "white", outline: "none", transition: "all 0.2s"
};
