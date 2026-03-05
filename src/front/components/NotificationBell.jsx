import React, { useState, useEffect, useRef } from "react";
import { Bell, AlertTriangle, X, Package, Printer } from "lucide-react";
import { Link } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "../context/AuthContext";

const API = "http://localhost:3001/api";

export const NotificationBell = () => {
    const { businessId, token } = useAuth();
    const [lowStock, setLowStock] = useState([]);
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    const fetchLowStock = async () => {
        try {
            if (!businessId || !token) return;
            const res = await fetch(`${API}/products/low-stock?business_id=${businessId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) setLowStock(await res.json());
        } catch { }
    };

    useEffect(() => {
        if (businessId && token) {
            fetchLowStock();
            const interval = setInterval(fetchLowStock, 60000); // refresca cada 1 min
            return () => clearInterval(interval);
        }
    }, [businessId, token]);

    // Cierra al hacer click fuera
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const count = lowStock.length;

    const handlePrintShoppingList = () => {
        if (count === 0) return;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Lista de Compras - Stock Bajo", 14, 22);
        doc.setFontSize(11);
        doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 30);

        const tableColumn = ["Producto", "Categoría", "Stock Actual", "Mínimo"];
        const tableRows = [];

        lowStock.forEach(product => {
            const productData = [
                product.name,
                product.category || "Variados",
                product.stock,
                product.min_stock || 0
            ];
            tableRows.push(productData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            styles: { fontSize: 10 },
            headStyles: { fillColor: [239, 68, 68] } // red-500
        });

        doc.save("lista_de_compras_stock_bajo.pdf");
        setOpen(false); // Close the popup after generating
    };

    return (
        <div ref={ref} style={{ position: "relative" }}>
            {/* ── Botón campana ── */}
            <button
                onClick={() => setOpen(o => !o)}
                title="Alertas de stock"
                style={{
                    position: "relative",
                    background: count > 0 ? "#fff7ed" : "transparent",
                    border: count > 0 ? "1px solid #fed7aa" : "1px solid transparent",
                    borderRadius: "12px",
                    padding: "0.6rem 0.75rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    width: "100%",
                    color: count > 0 ? "#c2410c" : "var(--color-text-muted)",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    transition: "all 0.2s",
                }}
            >
                <div style={{ position: "relative" }}>
                    <Bell size={20} />
                    {count > 0 && (
                        <span style={{
                            position: "absolute",
                            top: "-6px", right: "-6px",
                            background: "#ef4444",
                            color: "white",
                            borderRadius: "50%",
                            width: "16px", height: "16px",
                            fontSize: "0.65rem",
                            fontWeight: 800,
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>{count > 9 ? "9+" : count}</span>
                    )}
                </div>
                <span>Alertas{count > 0 ? ` (${count})` : ""}</span>
            </button>

            {/* ── Panel desplegable ── */}
            {open && (
                <div style={{
                    position: "fixed",
                    left: "220px",
                    bottom: "80px",
                    width: "320px",
                    background: "white",
                    borderRadius: "16px",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
                    zIndex: 9999,
                    overflow: "hidden",
                    border: "1px solid #e2e8f0",
                }}>
                    {/* Header */}
                    <div style={{
                        padding: "1rem 1.25rem",
                        borderBottom: "1px solid #f1f5f9",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        background: count > 0 ? "#fff7ed" : "#f8fafc"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <AlertTriangle size={18} color={count > 0 ? "#c2410c" : "#94a3b8"} />
                            <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>
                                Stock Bajo
                            </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            {count > 0 && (
                                <button
                                    onClick={handlePrintShoppingList}
                                    title="Exportar Lista de Compras PDF"
                                    style={{
                                        background: "#ffedd5", border: "none", cursor: "pointer",
                                        color: "#c2410c", padding: "0.4rem", borderRadius: "6px",
                                        display: "flex", alignItems: "center"
                                    }}
                                >
                                    <Printer size={16} />
                                </button>
                            )}
                            <button onClick={() => setOpen(false)} style={{
                                background: "none", border: "none", cursor: "pointer", color: "#94a3b8"
                            }}>
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div style={{ maxHeight: "360px", overflowY: "auto" }}>
                        {count === 0 ? (
                            <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                                <Package size={32} style={{ opacity: 0.3, marginBottom: "0.5rem" }} />
                                <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600 }}>
                                    Todo el stock está bien ✅
                                </p>
                            </div>
                        ) : (
                            lowStock.map(p => (
                                <div key={p.id} style={{
                                    padding: "0.85rem 1.25rem",
                                    borderBottom: "1px solid #f1f5f9",
                                    display: "flex", alignItems: "center", gap: "0.75rem"
                                }}>
                                    <img
                                        src={p.image_url || `https://ui-avatars.com/api/?name=${p.name}&background=FEE2E2&color=ef4444&size=48`}
                                        alt={p.name}
                                        style={{ width: "40px", height: "40px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{
                                            margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "#0f172a",
                                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                                        }}>{p.name}</p>
                                        <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8" }}>{p.category}</p>
                                    </div>
                                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                                        <span style={{
                                            display: "inline-block",
                                            padding: "0.2rem 0.6rem",
                                            borderRadius: "999px",
                                            background: p.stock === 0 ? "#fef2f2" : "#fff7ed",
                                            color: p.stock === 0 ? "#dc2626" : "#c2410c",
                                            fontSize: "0.75rem", fontWeight: 800
                                        }}>
                                            {p.stock === 0 ? "Sin stock" : `${p.stock} ud.`}
                                        </span>
                                        <p style={{ margin: "2px 0 0", fontSize: "0.7rem", color: "#94a3b8" }}>mín. {p.min_stock}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {count > 0 && (
                        <div style={{ padding: "0.75rem 1.25rem", borderTop: "1px solid #f1f5f9", background: "#fafafa" }}>
                            <Link to="/admin/products" onClick={() => setOpen(false)} style={{
                                display: "block", textAlign: "center", fontSize: "0.82rem",
                                fontWeight: 700, color: "#27ae60", textDecoration: "none"
                            }}>
                                Ver productos → Gestionar stock
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
