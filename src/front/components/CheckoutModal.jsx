import React, { useState } from "react";
import { CreditCard, Banknote, X, CheckCircle, Smartphone } from "lucide-react";

export const CheckoutModal = ({ total, onClose, onConfirm }) => {
    const [cashReceived, setCashReceived] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("cash");

    const cash = parseFloat(cashReceived) || 0;
    const change = cash - total;
    const isValid = paymentMethod !== "cash" || cash >= total;

    const presetAmounts = [
        total,
        Math.ceil(total / 1000) * 1000,
        Math.ceil(total / 5000) * 5000,
        Math.ceil(total / 10000) * 10000,
        Math.ceil(total / 20000) * 20000,
    ].filter((a, i, arr) => arr.indexOf(a) === i && a >= total).slice(0, 4);

    const methods = [
        { id: "cash", label: "Efectivo", icon: <Banknote size={22} /> },
        { id: "card", label: "Tarjeta", icon: <CreditCard size={22} /> },
        { id: "mobile", label: "Transferencia", icon: <Smartphone size={22} /> },
    ];

    return (
        <div style={{
            position: "fixed", inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, padding: "1rem"
        }}>
            <div style={{
                background: "white",
                borderRadius: "24px",
                width: "100%",
                maxWidth: "520px",
                overflow: "hidden",
                boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
                animation: "fadeInDown 0.25s ease"
            }}>

                {/* ── Header con gradiente ── */}
                <div style={{
                    background: "linear-gradient(135deg, #1a9e5c 0%, #27ae60 60%, #2ecc71 100%)",
                    padding: "1.75rem 2rem",
                    position: "relative",
                    color: "white"
                }}>
                    <button onClick={onClose} style={{
                        position: "absolute", top: "1.25rem", right: "1.25rem",
                        background: "rgba(255,255,255,0.2)", border: "none",
                        borderRadius: "50%", width: "36px", height: "36px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", color: "white", transition: "background 0.2s"
                    }}
                        onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.35)"}
                        onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
                    >
                        <X size={18} />
                    </button>
                    <p style={{ margin: 0, fontSize: "0.82rem", letterSpacing: "0.08em", opacity: 0.85, fontWeight: 600, textTransform: "uppercase" }}>
                        Total a cobrar
                    </p>
                    <p style={{ margin: "0.3rem 0 0", fontSize: "2.8rem", fontWeight: 800, letterSpacing: "-1px" }}>
                        ${total.toLocaleString("es-CL")}
                    </p>
                </div>

                {/* ── Body ── */}
                <div style={{ padding: "1.75rem 2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

                    {/* Métodos de pago */}
                    <div>
                        <p style={{ margin: "0 0 0.75rem", fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            Método de pago
                        </p>
                        <div style={{ display: "flex", gap: "0.75rem" }}>
                            {methods.map(m => (
                                <button key={m.id} onClick={() => setPaymentMethod(m.id)} style={{
                                    flex: 1,
                                    padding: "0.9rem 0.5rem",
                                    borderRadius: "14px",
                                    border: paymentMethod === m.id ? "2px solid #27ae60" : "2px solid #e2e8f0",
                                    background: paymentMethod === m.id ? "#f0fdf4" : "white",
                                    color: paymentMethod === m.id ? "#1a9e5c" : "#64748b",
                                    cursor: "pointer",
                                    fontWeight: 700,
                                    fontSize: "0.8rem",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: "0.45rem",
                                    transition: "all 0.18s",
                                    boxShadow: paymentMethod === m.id ? "0 0 0 3px rgba(39,174,96,0.12)" : "none"
                                }}>
                                    {m.icon}
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sección efectivo */}
                    {paymentMethod === "cash" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            {/* Input monto recibido */}
                            <div>
                                <p style={{ margin: "0 0 0.5rem", fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                    Monto recibido
                                </p>
                                <div style={{ position: "relative" }}>
                                    <span style={{
                                        position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)",
                                        fontSize: "1.6rem", fontWeight: 700, color: "#cbd5e1"
                                    }}>$</span>
                                    <input
                                        type="number"
                                        autoFocus
                                        value={cashReceived}
                                        onChange={e => setCashReceived(e.target.value)}
                                        style={{
                                            width: "100%",
                                            padding: "0.9rem 1rem 0.9rem 2.5rem",
                                            fontSize: "1.8rem",
                                            fontWeight: 700,
                                            border: "2px solid #e2e8f0",
                                            borderRadius: "14px",
                                            outline: "none",
                                            color: "#0f172a",
                                            fontFamily: "inherit",
                                            boxSizing: "border-box",
                                            transition: "border-color 0.2s"
                                        }}
                                        onFocus={e => e.target.style.borderColor = "#27ae60"}
                                        onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                                    />
                                </div>
                            </div>

                            {/* Atajos rápidos */}
                            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                {presetAmounts.map(amt => (
                                    <button key={amt} onClick={() => setCashReceived(amt.toString())} style={{
                                        padding: "0.45rem 1rem",
                                        borderRadius: "999px",
                                        border: cashReceived === amt.toString() ? "2px solid #27ae60" : "2px solid #e2e8f0",
                                        background: cashReceived === amt.toString() ? "#f0fdf4" : "#f8fafc",
                                        color: cashReceived === amt.toString() ? "#1a9e5c" : "#475569",
                                        fontWeight: 700,
                                        fontSize: "0.85rem",
                                        cursor: "pointer",
                                        fontFamily: "inherit",
                                        transition: "all 0.15s"
                                    }}>
                                        ${amt.toLocaleString("es-CL")}
                                    </button>
                                ))}
                            </div>

                            {/* Vuelto */}
                            {cash > 0 && (
                                <div style={{
                                    borderRadius: "14px",
                                    padding: "1rem 1.25rem",
                                    background: change >= 0 ? "#f0fdf4" : "#fef2f2",
                                    border: `1.5px solid ${change >= 0 ? "#86efac" : "#fca5a5"}`,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                }}>
                                    <span style={{ fontWeight: 700, color: change >= 0 ? "#166534" : "#dc2626", fontSize: "1rem" }}>
                                        {change >= 0 ? "💵 Vuelto" : "❌ Faltan"}
                                    </span>
                                    <span style={{ fontWeight: 800, fontSize: "1.4rem", color: change >= 0 ? "#16a34a" : "#dc2626" }}>
                                        ${Math.abs(change).toLocaleString("es-CL")}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tarjeta / Transferencia */}
                    {paymentMethod !== "cash" && (
                        <div style={{
                            borderRadius: "14px",
                            padding: "1.5rem",
                            background: "#f8fafc",
                            border: "1.5px dashed #cbd5e1",
                            textAlign: "center",
                            color: "#64748b"
                        }}>
                            {paymentMethod === "card"
                                ? <><CreditCard size={36} style={{ opacity: 0.4, marginBottom: "0.75rem" }} /><p style={{ margin: 0, fontWeight: 600 }}>Pase la tarjeta por el terminal de pago</p></>
                                : <><Smartphone size={36} style={{ opacity: 0.4, marginBottom: "0.75rem" }} /><p style={{ margin: 0, fontWeight: 600 }}>Transfiera al número de cuenta registrado</p></>
                            }
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div style={{
                    padding: "1.25rem 2rem",
                    borderTop: "1px solid #f1f5f9",
                    display: "flex",
                    gap: "0.75rem",
                    background: "#fafafa"
                }}>
                    <button onClick={onClose} style={{
                        flex: "0 0 auto",
                        padding: "0.85rem 1.5rem",
                        borderRadius: "14px",
                        border: "2px solid #e2e8f0",
                        background: "white",
                        color: "#64748b",
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "all 0.2s"
                    }}
                        onMouseOver={e => e.currentTarget.style.background = "#f1f5f9"}
                        onMouseOut={e => e.currentTarget.style.background = "white"}
                    >
                        Cancelar
                    </button>
                    <button onClick={() => onConfirm(paymentMethod, cash)} disabled={!isValid} style={{
                        flex: 1,
                        padding: "0.85rem 1.5rem",
                        borderRadius: "14px",
                        border: "none",
                        background: isValid
                            ? "linear-gradient(135deg, #1a9e5c, #2ecc71)"
                            : "#e2e8f0",
                        color: isValid ? "white" : "#94a3b8",
                        fontWeight: 800,
                        fontSize: "1.05rem",
                        cursor: isValid ? "pointer" : "not-allowed",
                        fontFamily: "inherit",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        boxShadow: isValid ? "0 6px 20px rgba(39,174,96,0.35)" : "none",
                        transition: "all 0.2s"
                    }}>
                        <CheckCircle size={20} />
                        Confirmar Pago
                    </button>
                </div>
            </div>
        </div>
    );
};
