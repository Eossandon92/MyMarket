import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Building2, Plus, Mail, Lock, ShieldAlert, LogOut, CheckCircle, Search, Store, User, Edit2, Phone, MapPin, FileText, Power } from "lucide-react";

export const SuperAdminDashboard = () => {
    const { token, logout, user, isSuperAdmin } = useAuth();
    const navigate = useNavigate();

    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Modal state for creating a new business
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newBusiness, setNewBusiness] = useState({ name: "", slug: "", adminName: "", adminEmail: "", adminPassword: "", subscriptionPlan: "basico" });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");
    const [createSuccess, setCreateSuccess] = useState("");

    // Edit business modal state
    const [editModal, setEditModal] = useState(null);
    const [editData, setEditData] = useState({});
    const [editSaving, setEditSaving] = useState(false);
    const [editSuccess, setEditSuccess] = useState("");

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
                    admin_name: newBusiness.adminName,
                    admin_email: newBusiness.adminEmail,
                    admin_password: newBusiness.adminPassword,
                    subscription_plan: newBusiness.subscriptionPlan
                })
            });

            const data = await res.json();
            if (res.ok) {
                setCreateSuccess(`¡Negocio ${data.business.name} creado con éxito!`);
                setBusinesses([...businesses, data.business]);
                setTimeout(() => {
                    setIsModalOpen(false);
                    setNewBusiness({ name: "", slug: "", adminEmail: "", adminPassword: "", subscriptionPlan: "basico" });
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

    const openEditModal = (biz) => {
        setEditModal(biz);
        setEditData({
            name: biz.name || "",
            rut: biz.rut || "",
            giro_comercial: biz.giro_comercial || "",
            address: biz.address || "",
            phone: biz.phone || "",
            contact_email: biz.contact_email || "",
            subscription_plan: biz.subscription_plan || "basico",
            is_active: biz.is_active !== false
        });
        setEditSuccess("");
    };

    const handleUpdateBusiness = async () => {
        if (!editModal) return;
        setEditSaving(true);
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const res = await fetch(`${backendUrl}/api/business/${editModal.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(editData)
            });
            if (res.ok) {
                const updated = await res.json();
                setBusinesses(businesses.map(b => b.id === updated.id ? updated : b));
                setEditSuccess("¡Negocio actualizado!");
                setTimeout(() => { setEditModal(null); setEditSuccess(""); }, 1500);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setEditSaving(false);
        }
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
                                <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "0.75rem" }}>
                                    <div style={{ background: b.is_active !== false ? "var(--color-primary-light)" : "#fef2f2", padding: "1rem", borderRadius: "12px", color: b.is_active !== false ? "var(--color-primary)" : "#ef4444" }}>
                                        <Store size={28} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>{b.name}</h3>
                                        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                                            <span style={{ fontSize: "0.75rem", background: "#f1f5f9", padding: "0.15rem 0.5rem", borderRadius: "100px", color: "#64748b", fontWeight: 600 }}>ID: {b.id}</span>
                                            <span style={{ fontSize: "0.75rem", background: getPlanColor(b.subscription_plan).bg, padding: "0.15rem 0.5rem", borderRadius: "100px", color: getPlanColor(b.subscription_plan).text, fontWeight: 700, textTransform: "capitalize" }}>{b.subscription_plan || 'basico'}</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Details */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginBottom: "0.75rem", fontSize: "0.8rem", color: "#64748b" }}>
                                    {b.rut && <span>RUT: <strong style={{ color: "#334155" }}>{b.rut}</strong></span>}
                                    {b.address && <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}><MapPin size={12} /> {b.address}</span>}
                                    {b.phone && <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}><Phone size={12} /> {b.phone}</span>}
                                </div>
                                <div style={{ marginTop: "auto", paddingTop: "0.75rem", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: "0.8rem", color: b.is_active !== false ? "#22c55e" : "#ef4444", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                        <div style={{ width: "8px", height: "8px", background: b.is_active !== false ? "#22c55e" : "#ef4444", borderRadius: "50%" }}></div>
                                        {b.is_active !== false ? "Activo" : "Suspendido"}
                                    </span>
                                    <button
                                        onClick={() => openEditModal(b)}
                                        style={{
                                            padding: "0.35rem 0.75rem", borderRadius: "999px",
                                            border: "2px solid #e2e8f0", background: "white",
                                            color: "#475569", fontWeight: 700, fontSize: "0.75rem",
                                            cursor: "pointer", fontFamily: "inherit",
                                            display: "flex", alignItems: "center", gap: "0.3rem",
                                            transition: "all 0.15s"
                                        }}
                                        onMouseOver={(e) => { e.currentTarget.style.borderColor = "#27ae60"; e.currentTarget.style.color = "#27ae60"; }}
                                        onMouseOut={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#475569"; }}
                                    >
                                        <Edit2 size={12} /> Editar
                                    </button>
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

                            <div>
                                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>Plan de Suscripción</label>
                                <select
                                    required
                                    value={newBusiness.subscriptionPlan}
                                    onChange={(e) => setNewBusiness({ ...newBusiness, subscriptionPlan: e.target.value })}
                                    style={{ ...inputStyle, paddingLeft: "1rem" }}
                                >
                                    <option value="basico">Plan Básico (Máx 2 usuarios)</option>
                                    <option value="pro">Plan Pro (Carga IA y Packs)</option>
                                    <option value="empresa">Plan Empresa (Múltiples Sucursales)</option>
                                </select>
                            </div>

                            <hr style={{ border: "none", borderTop: "1px dashed #cbd5e1", margin: "0.5rem 0" }} />

                            <div>
                                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>Nombre del Administrador (Dueño)</label>
                                <div style={{ position: "relative" }}>
                                    <User size={18} color="#94a3b8" style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)" }} />
                                    <input
                                        required type="text" placeholder="Ej. Karlita Perez"
                                        value={newBusiness.adminName} onChange={e => setNewBusiness({ ...newBusiness, adminName: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>

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

            {/* Edit Business Modal */}
            {editModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 }}>
                    <div style={{ background: "white", width: "100%", maxWidth: "520px", borderRadius: "16px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.2)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
                        {/* Header */}
                        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <Edit2 size={18} color="#27ae60" />
                                Editar Negocio
                            </h3>
                            <button onClick={() => setEditModal(null)} style={{ background: "#f1f5f9", border: "none", width: "30px", height: "30px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b", fontSize: "1rem", fontWeight: 700 }}>✕</button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>
                            {editSuccess && (
                                <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "12px", padding: "0.75rem 1rem", color: "#166534", fontWeight: 600, fontSize: "0.85rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <CheckCircle size={16} /> {editSuccess}
                                </div>
                            )}

                            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                {/* Name */}
                                <EditField label="Nombre del Negocio" value={editData.name} onChange={(v) => setEditData({ ...editData, name: v })} placeholder="Mi Minimarket" />

                                {/* RUT + Giro row */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                    <EditField label="RUT" value={editData.rut} onChange={(v) => setEditData({ ...editData, rut: v })} placeholder="76.123.456-7" />
                                    <EditField label="Giro Comercial" value={editData.giro_comercial} onChange={(v) => setEditData({ ...editData, giro_comercial: v })} placeholder="Venta de abarrotes" />
                                </div>

                                {/* Address */}
                                <EditField label="Dirección" value={editData.address} onChange={(v) => setEditData({ ...editData, address: v })} placeholder="Av. Providencia 1234, Santiago" />

                                {/* Phone + Email row */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                    <EditField label="Teléfono" value={editData.phone} onChange={(v) => setEditData({ ...editData, phone: v })} placeholder="+56 9 1234 5678" />
                                    <EditField label="Email de Contacto" value={editData.contact_email} onChange={(v) => setEditData({ ...editData, contact_email: v })} placeholder="contacto@tienda.cl" />
                                </div>

                                {/* Subscription Plan */}
                                <div>
                                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>Plan de Suscripción</label>
                                    <div style={{ display: "flex", gap: "0.5rem" }}>
                                        {[
                                            { value: "basico", label: "Básico", color: "#64748b" },
                                            { value: "pro", label: "Pro", color: "#3b82f6" },
                                            { value: "empresa", label: "Empresa", color: "#8b5cf6" }
                                        ].map(plan => (
                                            <button
                                                key={plan.value}
                                                onClick={() => setEditData({ ...editData, subscription_plan: plan.value })}
                                                style={{
                                                    flex: 1, padding: "0.5rem", borderRadius: "10px",
                                                    border: editData.subscription_plan === plan.value ? `2px solid ${plan.color}` : "2px solid #e2e8f0",
                                                    background: editData.subscription_plan === plan.value ? `${plan.color}10` : "white",
                                                    cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
                                                    fontSize: "0.85rem", color: editData.subscription_plan === plan.value ? plan.color : "#94a3b8",
                                                    transition: "all 0.15s"
                                                }}
                                            >
                                                {plan.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Active Toggle */}
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", borderRadius: "12px", background: editData.is_active ? "#f0fdf4" : "#fef2f2", border: `1px solid ${editData.is_active ? '#86efac' : '#fca5a5'}` }}>
                                    <div>
                                        <span style={{ fontSize: "0.88rem", fontWeight: 700, color: editData.is_active ? "#166534" : "#dc2626" }}>
                                            {editData.is_active ? "Negocio Activo" : "Negocio Suspendido"}
                                        </span>
                                        <span style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginTop: "0.1rem" }}>
                                            {editData.is_active ? "El negocio puede operar normalmente" : "El negocio no puede acceder al sistema"}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setEditData({ ...editData, is_active: !editData.is_active })}
                                        style={{
                                            width: "44px", height: "24px", borderRadius: "12px", border: "none",
                                            background: editData.is_active ? "#22c55e" : "#d1d5db",
                                            cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0
                                        }}
                                    >
                                        <div style={{
                                            width: "18px", height: "18px", borderRadius: "50%", background: "white",
                                            position: "absolute", top: "3px",
                                            left: editData.is_active ? "23px" : "3px",
                                            transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)"
                                        }} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #e2e8f0", display: "flex", gap: "0.75rem", flexShrink: 0 }}>
                            <button
                                onClick={() => setEditModal(null)}
                                style={{ flex: 1, padding: "0.55rem 1rem", borderRadius: "999px", border: "2px solid #e2e8f0", background: "white", color: "#475569", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleUpdateBusiness}
                                disabled={editSaving || editSuccess}
                                style={{
                                    flex: 1, padding: "0.55rem 1rem", borderRadius: "999px", border: "none",
                                    background: editSaving || editSuccess ? "#94a3b8" : "#27ae60", color: "white",
                                    fontWeight: 700, fontSize: "0.85rem", cursor: editSaving ? "wait" : "pointer",
                                    fontFamily: "inherit", transition: "background 0.15s"
                                }}
                            >
                                {editSaving ? "Guardando..." : editSuccess ? "✓ Guardado" : "Guardar Cambios"}
                            </button>
                        </div>
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

// Reusable field for the edit modal
const EditField = ({ label, value, onChange, placeholder }) => (
    <div>
        <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>{label}</label>
        <input
            type="text" value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "10px", border: "2px solid #e2e8f0", fontSize: "0.85rem", fontFamily: "inherit", color: "#0f172a", outline: "none", transition: "border-color 0.15s", boxSizing: "border-box" }}
            onFocus={(e) => e.target.style.borderColor = "#27ae60"}
            onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
        />
    </div>
);

const getPlanColor = (plan) => {
    switch (plan) {
        case 'pro': return { bg: "#eff6ff", text: "#3b82f6" };
        case 'empresa': return { bg: "#f5f3ff", text: "#8b5cf6" };
        default: return { bg: "#f1f5f9", text: "#64748b" };
    }
};
