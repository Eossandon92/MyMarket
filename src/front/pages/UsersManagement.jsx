import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Trash2, PlusCircle, Shield, ArrowLeft, CheckCircle, AlertTriangle, Crown, User, Lock, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export const UsersManagement = () => {
    const { token, user, businessId } = useAuth();
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [plan, setPlan] = useState("basico");

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const fetchUsers = async () => {
        try {
            const url = import.meta.env.VITE_BACKEND_URL + "/api/users";
            const res = await fetch(url, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTeam(data);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPlan = async () => {
        try {
            if (!businessId) return;
            const url = import.meta.env.VITE_BACKEND_URL + `/api/business/${businessId}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setPlan(data.subscription_plan || "basico");
            }
        } catch (error) {
            console.error("Error fetching business plan:", error);
        }
    };

    useEffect(() => {
        if (token) {
            fetchUsers();
            fetchPlan();
        }
    }, [token]);

    // Plan limits
    const MAX_USERS_BASICO = 2; // 1 admin + 1 cajero
    const isBasico = plan === "basico";
    const canAddUser = !isBasico || team.length < MAX_USERS_BASICO;

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setErrorMsg("");
        setSuccessMsg("");

        try {
            const url = import.meta.env.VITE_BACKEND_URL + "/api/users";
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ name, email, password })
            });

            if (res.ok) {
                setName("");
                setEmail("");
                setPassword("");
                setIsModalOpen(false);
                setSuccessMsg("¡Cajero creado exitosamente!");
                fetchUsers();
                setTimeout(() => setSuccessMsg(""), 3000);
            } else {
                const errorData = await res.json();
                setErrorMsg(errorData.msg || "Error al crear usuario.");
            }
        } catch (err) {
            setErrorMsg("Error de conexión al servidor.");
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm("¿Seguro que deseas eliminar el acceso de este usuario?")) return;
        try {
            const url = import.meta.env.VITE_BACKEND_URL + `/api/users/${userId}`;
            const res = await fetch(url, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                fetchUsers();
            } else {
                const errorData = await res.json();
                alert(errorData.msg || "No se pudo eliminar el usuario");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const getInitials = (n) => {
        if (!n) return "?";
        const parts = n.trim().split(" ");
        return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0][0].toUpperCase();
    };

    const openModal = () => {
        setErrorMsg("");
        setName("");
        setEmail("");
        setPassword("");
        setIsModalOpen(true);
    };

    if (user?.role !== 'admin') {
        return (
            <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f1f5f9", fontFamily: "var(--font-family-base)" }}>
                <div style={{ background: "white", padding: "3rem", borderRadius: "16px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                    <Shield size={48} color="#ef4444" style={{ marginBottom: "1rem" }} />
                    <h2 style={{ color: "#0f172a", fontSize: "1.3rem", margin: "0 0 0.5rem" }}>Acceso Denegado</h2>
                    <p style={{ color: "#94a3b8", margin: 0 }}>Solo los administradores pueden gestionar el personal.</p>
                </div>
            </div>
        );
    }

    const adminCount = team.filter(t => t.role === 'admin').length;
    const cashierCount = team.filter(t => t.role !== 'admin').length;

    const inputStyle = {
        width: "100%",
        padding: "0.5rem 0.75rem",
        borderRadius: "10px",
        border: "2px solid #e2e8f0",
        fontSize: "0.85rem",
        fontFamily: "inherit",
        color: "#0f172a",
        outline: "none",
        transition: "border-color 0.15s",
        boxSizing: "border-box",
    };

    return (
        <div style={{
            position: "fixed", inset: 0, overflowY: "auto",
            background: "#f1f5f9", fontFamily: "Inter, sans-serif", zIndex: 100
        }}>
            {/* Header */}
            <header style={{
                background: "white", borderBottom: "1px solid #e2e8f0",
                padding: "1rem 2rem", display: "flex", alignItems: "center", gap: "1rem",
                position: "sticky", top: 0, zIndex: 10
            }}>
                <Link to="/" style={{ color: "#64748b", display: "flex", alignItems: "center", textDecoration: "none" }}>
                    <ArrowLeft size={20} />
                </Link>
                <Users size={22} color="#27ae60" />
                <h1 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#0f172a", flex: 1 }}>
                    Gestión de Personal
                </h1>

                {/* Add user button */}
                {canAddUser ? (
                    <button
                        onClick={openModal}
                        style={{
                            padding: "0.55rem 1.25rem", borderRadius: "999px", border: "none",
                            background: "#27ae60", color: "white", fontWeight: 700,
                            fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit",
                            display: "flex", alignItems: "center", gap: "0.4rem",
                            transition: "background 0.15s"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = "#219a52"}
                        onMouseOut={(e) => e.currentTarget.style.background = "#27ae60"}
                    >
                        <PlusCircle size={16} /> Agregar Usuario
                    </button>
                ) : (
                    <span style={{
                        padding: "0.55rem 1.25rem", borderRadius: "999px",
                        background: "#fef2f2", color: "#dc2626", fontWeight: 700,
                        fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem"
                    }}>
                        <AlertTriangle size={14} /> Límite Plan Básico alcanzado
                    </span>
                )}
            </header>

            <main style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

                {/* Success toast */}
                {successMsg && (
                    <div style={{
                        background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "12px",
                        padding: "0.75rem 1rem", color: "#166534", fontWeight: 600, fontSize: "0.85rem",
                        display: "flex", alignItems: "center", gap: "0.5rem"
                    }}>
                        <CheckCircle size={16} /> {successMsg}
                    </div>
                )}

                {/* KPI Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
                    <div style={{
                        background: "white", borderRadius: "16px", padding: "1.5rem",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", gap: "1rem", alignItems: "center"
                    }}>
                        <div style={{
                            width: "48px", height: "48px", borderRadius: "14px", background: "#eef2ff",
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                        }}>
                            <Crown size={24} color="#6366f1" />
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Administradores</p>
                            <p style={{ margin: "0.2rem 0 0", fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>{adminCount}</p>
                        </div>
                    </div>
                    <div style={{
                        background: "white", borderRadius: "16px", padding: "1.5rem",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", gap: "1rem", alignItems: "center"
                    }}>
                        <div style={{
                            width: "48px", height: "48px", borderRadius: "14px", background: "#f0fdf4",
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                        }}>
                            <User size={24} color="#27ae60" />
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Cajeros</p>
                            <p style={{ margin: "0.2rem 0 0", fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>{cashierCount}</p>
                        </div>
                    </div>
                    <div style={{
                        background: "white", borderRadius: "16px", padding: "1.5rem",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", gap: "1rem", alignItems: "center"
                    }}>
                        <div style={{
                            width: "48px", height: "48px", borderRadius: "14px", background: "#fffbeb",
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                        }}>
                            <Users size={24} color="#f59e0b" />
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Equipo</p>
                            <p style={{ margin: "0.2rem 0 0", fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>{team.length}</p>
                        </div>
                    </div>
                </div>

                {/* Plan info banner for basico */}
                {isBasico && (
                    <div style={{
                        background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "12px",
                        padding: "0.75rem 1rem", fontSize: "0.85rem", color: "#92400e", fontWeight: 600,
                        display: "flex", alignItems: "center", gap: "0.5rem"
                    }}>
                        <AlertTriangle size={16} />
                        Plan Básico: máximo {MAX_USERS_BASICO} usuarios (1 Administrador + 1 Cajero). Actualmente tienes {team.length} de {MAX_USERS_BASICO}.
                    </div>
                )}

                {/* Team list */}
                <div style={{
                    background: "white", borderRadius: "16px", padding: "1.5rem",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
                }}>
                    <h2 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Users size={18} color="#27ae60" /> Equipo Activo
                    </h2>

                    {loading ? (
                        <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                            <div style={{
                                width: "32px", height: "32px", border: "3px solid #e2e8f0", borderTopColor: "#27ae60",
                                borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 0.5rem"
                            }} />
                            <p style={{ margin: 0, fontWeight: 600 }}>Cargando equipo...</p>
                        </div>
                    ) : team.length === 0 ? (
                        <p style={{ color: "#94a3b8", fontSize: "0.9rem", textAlign: "center", padding: "2rem 0" }}>No hay personal registrado.</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            {team.map((t) => (
                                <div key={t.id} style={{
                                    display: "flex", alignItems: "center", gap: "0.75rem",
                                    padding: "0.6rem 0.75rem", borderRadius: "10px", background: "#f8fafc"
                                }}>
                                    {/* Avatar */}
                                    <div style={{
                                        width: "38px", height: "38px", borderRadius: "10px",
                                        background: t.role === 'admin' ? "#eef2ff" : "#f0fdf4",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        color: t.role === 'admin' ? "#6366f1" : "#27ae60",
                                        fontWeight: 800, fontSize: "0.8rem", flexShrink: 0
                                    }}>
                                        {getInitials(t.name)}
                                    </div>

                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 700, color: "#1e293b" }}>
                                            {t.name}
                                        </p>
                                        <p style={{ margin: 0, fontSize: "0.72rem", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {t.email}
                                        </p>
                                    </div>

                                    {/* Role badge */}
                                    <span style={{
                                        padding: "0.2rem 0.7rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700,
                                        background: t.role === 'admin' ? "#eef2ff" : "#f0fdf4",
                                        color: t.role === 'admin' ? "#6366f1" : "#16a34a",
                                        flexShrink: 0
                                    }}>
                                        {t.role === 'admin' ? 'Administrador' : 'Cajero'}
                                    </span>

                                    {/* Delete */}
                                    {t.id !== user.id ? (
                                        <button
                                            onClick={() => handleDeleteUser(t.id)}
                                            style={{
                                                background: "none", border: "none", color: "#ef4444", cursor: "pointer",
                                                padding: "0.35rem", borderRadius: "8px", display: "flex", alignItems: "center",
                                                transition: "background 0.15s", flexShrink: 0
                                            }}
                                            title="Revocar Acceso"
                                            onMouseOver={(e) => e.currentTarget.style.background = "#fef2f2"}
                                            onMouseOut={(e) => e.currentTarget.style.background = "none"}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    ) : (
                                        <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600, flexShrink: 0 }}>Tú</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* ── Modal: Crear Cajero ── */}
            {isModalOpen && (
                <div style={{
                    position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(4px)",
                    display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100
                }}>
                    <div style={{
                        background: "white", width: "100%", maxWidth: "420px", borderRadius: "16px",
                        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.2)", position: "relative"
                    }}>
                        {/* Modal header */}
                        <div style={{
                            padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0",
                            display: "flex", alignItems: "center", justifyContent: "space-between"
                        }}>
                            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <PlusCircle size={20} color="#27ae60" />
                                Nuevo Cajero
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} style={{
                                background: "#f1f5f9", border: "none", width: "30px", height: "30px", borderRadius: "50%",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                cursor: "pointer", color: "#64748b", fontSize: "1rem", fontWeight: 700
                            }}>✕</button>
                        </div>

                        {/* Modal body */}
                        <div style={{ padding: "1.5rem" }}>
                            <p style={{ margin: "0 0 1.25rem", fontSize: "0.85rem", color: "#64748b" }}>
                                El cajero podrá iniciar sesión con el correo y contraseña que asignes aquí. Solo tendrá acceso al punto de venta.
                            </p>

                            {errorMsg && (
                                <div style={{
                                    background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "12px",
                                    padding: "0.75rem 1rem", color: "#dc2626", fontWeight: 600, fontSize: "0.85rem",
                                    marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem"
                                }}>
                                    <AlertTriangle size={16} /> {errorMsg}
                                </div>
                            )}

                            <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>
                                        Nombre Completo
                                    </label>
                                    <input
                                        type="text" required value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Ej: María López"
                                        style={inputStyle}
                                        onFocus={(e) => e.target.style.borderColor = "#27ae60"}
                                        onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>
                                        Correo para Ingreso
                                    </label>
                                    <input
                                        type="email" required value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="cajero@mitienda.cl"
                                        style={inputStyle}
                                        onFocus={(e) => e.target.style.borderColor = "#27ae60"}
                                        onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>
                                        Contraseña Asignada
                                    </label>
                                    <input
                                        type="password" required value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        minLength="6" placeholder="Mínimo 6 caracteres"
                                        style={inputStyle}
                                        onFocus={(e) => e.target.style.borderColor = "#27ae60"}
                                        onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
                                    />
                                </div>

                                <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        style={{
                                            flex: 1, padding: "0.55rem 1rem", borderRadius: "999px",
                                            border: "2px solid #e2e8f0", background: "white",
                                            color: "#475569", fontWeight: 700, fontSize: "0.85rem",
                                            cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s"
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        style={{
                                            flex: 1, padding: "0.55rem 1rem", borderRadius: "999px",
                                            border: "none", background: "#27ae60", color: "white",
                                            fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
                                            fontFamily: "inherit", display: "flex", alignItems: "center",
                                            justifyContent: "center", gap: "0.4rem", transition: "background 0.15s"
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = "#219a52"}
                                        onMouseOut={(e) => e.currentTarget.style.background = "#27ae60"}
                                    >
                                        <PlusCircle size={16} /> Crear Cajero
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
