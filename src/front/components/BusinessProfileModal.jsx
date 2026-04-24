import React, { useState, useRef } from "react";
import { X, Upload, Store, Loader2, Trash2 } from "lucide-react";
import { useAuth, API } from "../context/AuthContext";

export const BusinessProfileModal = ({ onClose }) => {
    const { user, token, updateSessionUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setError("");
        setSuccess("");

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(`${API}/business/${user.business_id}/upload-logo`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            });
            const data = await res.json();

            if (res.ok) {
                setSuccess("Logo actualizado correctamente.");
                // Update the current user session
                updateSessionUser({
                    business: {
                        ...user.business,
                        logo_url: data.logo_url
                    }
                });
                setTimeout(() => onClose(), 1500);
            } else {
                setError(data.msg || "Error al subir el logo.");
            }
        } catch (err) {
            console.error(err);
            setError("Error de red al subir el logo.");
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveLogo = async () => {
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const res = await fetch(`${API}/business/${user.business_id}/logo`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await res.json();

            if (res.ok) {
                setSuccess("Logo eliminado correctamente.");
                updateSessionUser({
                    business: {
                        ...user.business,
                        logo_url: null
                    }
                });
                setTimeout(() => onClose(), 1500);
            } else {
                setError(data.msg || "Error al eliminar el logo.");
            }
        } catch (err) {
            console.error(err);
            setError("Error de red.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="modal-backdrop fade show" style={{ background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(8px)" }} onClick={onClose}></div>
            <div style={{ position: "fixed", inset: 0, zIndex: 1055, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
                <div className="modal-content" style={{ 
                    width: "450px", maxWidth: "95vw", borderRadius: "24px", 
                    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", background: "white",
                    display: "flex", flexDirection: "column", border: "none", overflow: "hidden" 
                }}>
                    <div className="modal-header" style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h5 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <Store size={22} color="#27ae60" /> Perfil del Negocio
                        </h5>
                        <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "0.5rem", borderRadius: "50%" }}>
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="modal-body" style={{ padding: "2rem 1.5rem", textAlign: "center" }}>
                        {error && <div style={{ color: "white", background: "#ef4444", padding: "0.75rem", borderRadius: "12px", marginBottom: "1.5rem", fontSize: "0.9rem", fontWeight: 600 }}>{error}</div>}
                        {success && <div style={{ color: "white", background: "#22c55e", padding: "0.75rem", borderRadius: "12px", marginBottom: "1.5rem", fontSize: "0.9rem", fontWeight: 600 }}>{success}</div>}

                        <p style={{ color: "#64748b", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
                            Personaliza el logo que aparece en tu sistema de punto de venta.
                        </p>

                        <div style={{ marginBottom: "2rem" }}>
                            <div style={{ 
                                width: "120px", height: "120px", margin: "0 auto", borderRadius: "20px", 
                                background: "#f8fafc", border: "2px dashed #cbd5e1", display: "flex", 
                                alignItems: "center", justifyContent: "center", overflow: "hidden",
                                position: "relative"
                            }}>
                                {user?.business?.logo_url ? (
                                    <img src={user.business.logo_url} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                                ) : (
                                    <Store size={40} color="#cbd5e1" />
                                )}
                            </div>
                        </div>

                        <input 
                            type="file" 
                            accept="image/*" 
                            style={{ display: "none" }} 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                        />

                        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
                            {user?.business?.logo_url && (
                                <button 
                                    onClick={handleRemoveLogo} 
                                    disabled={loading}
                                    style={{ 
                                        display: "inline-flex", alignItems: "center", gap: "0.5rem", 
                                        background: "white", color: "#ef4444", border: "1px solid #ef4444", 
                                        padding: "0.8rem 1.5rem", borderRadius: "12px", fontSize: "1rem", 
                                        fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                                        transition: "all 0.2s"
                                    }}
                                    onMouseOver={e => { if(!loading) e.currentTarget.style.background = "#fef2f2"; }}
                                    onMouseOut={e => { if(!loading) e.currentTarget.style.background = "white"; }}
                                >
                                    <Trash2 size={18} />
                                    {loading ? "Borrando..." : "Quitar"}
                                </button>
                            )}

                            <button 
                                onClick={() => fileInputRef.current.click()} 
                                disabled={loading}
                                style={{ 
                                    display: "inline-flex", alignItems: "center", gap: "0.5rem", 
                                    background: "#27ae60", color: "white", border: "none", 
                                    padding: "0.8rem 1.5rem", borderRadius: "12px", fontSize: "1rem", 
                                    fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                                    transition: "all 0.2s", boxShadow: "0 4px 12px rgba(39, 174, 96, 0.3)"
                                }}
                                onMouseOver={e => { if(!loading) e.currentTarget.style.background = "#219a52"; }}
                                onMouseOut={e => { if(!loading) e.currentTarget.style.background = "#27ae60"; }}
                            >
                                {loading ? <Loader2 size={18} className="spin" /> : <Upload size={18} />}
                                {loading ? "Procesando..." : "Subir Nuevo Logo"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
