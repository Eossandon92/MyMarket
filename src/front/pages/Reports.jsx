import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    ArrowLeft, BarChart2, TrendingUp, ShoppingCart,
    CalendarDays, RefreshCcw, Package
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

const API = "http://localhost:3001/api";

const PERIODS = [
    { id: "today", label: "Hoy" },
    { id: "week", label: "Esta semana" },
    { id: "month", label: "Este mes" },
    { id: "custom", label: "Personalizado" },
];

export const Reports = () => {
    const { businessId, token } = useAuth();
    const [period, setPeriod] = useState("today");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const fetchReport = async () => {
        setLoading(true);
        setError("");
        try {
            if (!businessId || !token) return;

            let url = `${API}/reports/sales?period=${period}&business_id=${businessId}`;
            if (period === "custom") {
                if (!dateFrom || !dateTo) { setError("Selecciona las fechas de inicio y fin."); setLoading(false); return; }
                url += `&date_from=${dateFrom}&date_to=${dateTo}`;
            }
            const res = await fetch(url, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Error obteniendo reporte");
            setData(await res.json());
        } catch (e) {
            setError("No se pudo cargar el reporte. Inténtalo de nuevo.");
        }
        setLoading(false);
    };

    useEffect(() => { fetchReport(); }, [period]);

    // ── Helpers ──
    const fmt = (n) => `$${Number(n || 0).toLocaleString("es-CL")}`;

    const periodLabel = PERIODS.find(p => p.id === period)?.label || "";

    // Agrupar órdenes por día para mini-gráfico de barras
    const dailySales = (() => {
        if (!data?.orders?.length) return [];
        const map = {};
        data.orders.forEach(o => {
            const day = o.created_at?.slice(0, 10) || "?";
            if (!map[day]) map[day] = { day, total: 0, count: 0 };
            map[day].total += o.total_price;
            map[day].count++;
        });
        return Object.values(map).sort((a, b) => a.day.localeCompare(b.day));
    })();

    const maxBar = Math.max(...dailySales.map(d => d.total), 1);

    return (
        <div style={{
            position: "fixed", inset: 0,
            overflowY: "auto",
            background: "#f1f5f9",
            fontFamily: "Inter, sans-serif",
            zIndex: 100
        }}>

            {/* ── Header ── */}
            <header style={{
                background: "white", borderBottom: "1px solid #e2e8f0",
                padding: "1rem 2rem", display: "flex", alignItems: "center", gap: "1rem",
                position: "sticky", top: 0, zIndex: 10
            }}>
                <Link to="/" style={{ color: "#64748b", display: "flex", alignItems: "center", textDecoration: "none" }}>
                    <ArrowLeft size={20} />
                </Link>
                <BarChart2 size={22} color="#27ae60" />
                <h1 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>
                    Reportes de Ventas
                </h1>
            </header>

            <main style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

                {/* ── Filtros ── */}
                <div style={{
                    background: "white", borderRadius: "16px", padding: "1.5rem",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", flexWrap: "wrap",
                    alignItems: "center", gap: "0.75rem"
                }}>
                    {PERIODS.map(p => (
                        <button key={p.id} onClick={() => setPeriod(p.id)} style={{
                            padding: "0.55rem 1.25rem", borderRadius: "999px", border: "2px solid",
                            borderColor: period === p.id ? "#27ae60" : "#e2e8f0",
                            background: period === p.id ? "#f0fdf4" : "white",
                            color: period === p.id ? "#166534" : "#475569",
                            fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
                            fontFamily: "inherit", transition: "all 0.15s"
                        }}>{p.label}</button>
                    ))}

                    {period === "custom" && (
                        <>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                style={inputStyle} />
                            <span style={{ color: "#94a3b8", fontWeight: 600 }}>→</span>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                style={inputStyle} />
                            <button onClick={fetchReport} style={{
                                padding: "0.55rem 1.25rem", borderRadius: "999px", border: "none",
                                background: "#27ae60", color: "white", fontWeight: 700,
                                fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit",
                                display: "flex", alignItems: "center", gap: "0.4rem"
                            }}>
                                <RefreshCcw size={14} /> Consultar
                            </button>
                        </>
                    )}
                </div>

                {error && (
                    <div style={{
                        background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "12px",
                        padding: "1rem 1.5rem", color: "#dc2626", fontWeight: 600
                    }}>{error}</div>
                )}

                {loading && (
                    <div style={{ textAlign: "center", padding: "4rem", color: "#94a3b8" }}>
                        <RefreshCcw size={32} style={{ animation: "spin 1s linear infinite", marginBottom: "1rem" }} />
                        <p style={{ margin: 0, fontWeight: 600 }}>Cargando reporte...</p>
                    </div>
                )}

                {!loading && data && (
                    <>
                        {/* ── KPI Cards ── */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                            <KPICard
                                icon={<TrendingUp size={24} color="#27ae60" />}
                                label="Total Recaudado"
                                value={fmt(data.total_revenue)}
                                sub={periodLabel}
                                accent="#f0fdf4"
                            />
                            <KPICard
                                icon={<ShoppingCart size={24} color="#3b82f6" />}
                                label="Total Ventas"
                                value={data.total_orders}
                                sub="transacciones"
                                accent="#eff6ff"
                            />
                            <KPICard
                                icon={<BarChart2 size={24} color="#f59e0b" />}
                                label="Ticket Promedio"
                                value={fmt(data.avg_ticket)}
                                sub="por venta"
                                accent="#fffbeb"
                            />
                        </div>

                        {/* ── Gráfico de ventas por día ── */}
                        {dailySales.length > 0 && (
                            <div style={{
                                background: "white", borderRadius: "16px", padding: "1.5rem",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
                            }}>
                                <h2 style={{ margin: "0 0 1.25rem", fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
                                    📊 Ventas por día
                                </h2>
                                <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", height: "160px" }}>
                                    {dailySales.map(d => (
                                        <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                                            <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700 }}>
                                                {fmt(d.total).replace("$", "")}
                                            </span>
                                            <div title={`${d.day}: ${fmt(d.total)}`} style={{
                                                width: "100%", borderRadius: "6px 6px 0 0",
                                                height: `${Math.max((d.total / maxBar) * 130, 6)}px`,
                                                background: "linear-gradient(180deg, #2ecc71, #1a9e5c)",
                                                transition: "height 0.4s ease"
                                            }} />
                                            <span style={{ fontSize: "0.65rem", color: "#64748b", whiteSpace: "nowrap" }}>
                                                {d.day.slice(5)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                            {/* ── Top productos ── */}
                            <div style={{
                                background: "white", borderRadius: "16px", padding: "1.5rem",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
                            }}>
                                <h2 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <Package size={18} color="#f59e0b" /> Productos más vendidos
                                </h2>
                                {data.top_products.length === 0
                                    ? <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Sin datos para el período.</p>
                                    : data.top_products.map((p, i) => (
                                        <div key={i} style={{
                                            display: "flex", justifyContent: "space-between", alignItems: "center",
                                            padding: "0.65rem 0", borderBottom: i < data.top_products.length - 1 ? "1px solid #f1f5f9" : "none"
                                        }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                                <span style={{
                                                    width: "24px", height: "24px", borderRadius: "50%", background: i === 0 ? "#fef9c3" : "#f1f5f9",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    fontSize: "0.7rem", fontWeight: 800, color: i === 0 ? "#92400e" : "#64748b"
                                                }}>{i + 1}</span>
                                                <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#1e293b" }}>{p.name}</span>
                                            </div>
                                            <div style={{ textAlign: "right" }}>
                                                <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#27ae60" }}>{fmt(p.revenue)}</span>
                                                <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>{p.qty} unidades</span>
                                            </div>
                                        </div>
                                    ))
                                }
                            </div>

                            {/* ── Últimas órdenes ── */}
                            <div style={{
                                background: "white", borderRadius: "16px", padding: "1.5rem",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden"
                            }}>
                                <h2 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <ShoppingCart size={18} color="#3b82f6" /> Últimas transacciones
                                </h2>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "320px", overflowY: "auto" }}>
                                    {data.orders.length === 0
                                        ? <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Sin ventas en el período.</p>
                                        : data.orders.slice(0, 20).map(o => (
                                            <div key={o.id} style={{
                                                display: "flex", justifyContent: "space-between", alignItems: "center",
                                                padding: "0.6rem 0.75rem", borderRadius: "10px", background: "#f8fafc"
                                            }}>
                                                <div>
                                                    <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" }}>
                                                        Venta #{o.id}
                                                    </p>
                                                    <p style={{ margin: 0, fontSize: "0.72rem", color: "#94a3b8" }}>
                                                        {new Date(o.created_at).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })}
                                                        {" · "}{o.items?.length || 0} ítem{o.items?.length !== 1 ? "s" : ""}
                                                    </p>
                                                </div>
                                                <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#27ae60" }}>
                                                    {fmt(o.total_price)}
                                                </span>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

// ── Sub-componente KPI ──
const KPICard = ({ icon, label, value, sub, accent }) => (
    <div style={{
        background: "white", borderRadius: "16px", padding: "1.5rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", gap: "1rem", alignItems: "center"
    }}>
        <div style={{
            width: "48px", height: "48px", borderRadius: "14px", background: accent,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
        }}>
            {icon}
        </div>
        <div>
            <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
            <p style={{ margin: "0.2rem 0 0", fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>{value}</p>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8" }}>{sub}</p>
        </div>
    </div>
);

const inputStyle = {
    padding: "0.5rem 0.75rem", borderRadius: "10px",
    border: "2px solid #e2e8f0", fontSize: "0.85rem",
    fontFamily: "inherit", color: "#0f172a", outline: "none"
};
