import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    ArrowLeft, DollarSign, TrendingUp, TrendingDown, Percent,
    ShoppingCart, CalendarDays, RefreshCcw, AlertTriangle, Package, Tag
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const API = `${import.meta.env.VITE_BACKEND_URL}/api`;

const PERIODS = [
    { id: "today", label: "Hoy" },
    { id: "week", label: "Esta semana" },
    { id: "month", label: "Este mes" },
    { id: "custom", label: "Personalizado" },
];

export const BalanceDashboard = () => {
    const { businessId, token } = useAuth();
    const [period, setPeriod] = useState("month");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const fetchBalance = async () => {
        setLoading(true);
        setError("");
        try {
            if (!businessId || !token) return;
            let url = `${API}/reports/balance?period=${period}&business_id=${businessId}`;
            if (period === "custom") {
                if (!dateFrom || !dateTo) {
                    setError("Selecciona las fechas de inicio y fin.");
                    setLoading(false);
                    return;
                }
                url += `&date_from=${dateFrom}&date_to=${dateTo}`;
            }
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Error obteniendo balance");
            setData(await res.json());
        } catch (e) {
            setError("No se pudo cargar el balance. Inténtalo de nuevo.");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchBalance();
    }, [period]);

    const fmt = (n) => `$${Number(n || 0).toLocaleString("es-CL")}`;
    const periodLabel = PERIODS.find((p) => p.id === period)?.label || "";

    // Chart helpers
    const dailySales = data?.daily_breakdown || [];
    const maxBar = Math.max(...dailySales.map((d) => Math.max(d.revenue, d.cost)), 1);

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                overflowY: "auto",
                background: "#f1f5f9",
                fontFamily: "Inter, sans-serif",
                zIndex: 100,
            }}
        >
            {/* Header */}
            <header
                style={{
                    background: "white",
                    borderBottom: "1px solid #e2e8f0",
                    padding: "1rem 2rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                }}
            >
                <Link
                    to="/"
                    style={{
                        color: "#64748b",
                        display: "flex",
                        alignItems: "center",
                        textDecoration: "none",
                    }}
                >
                    <ArrowLeft size={20} />
                </Link>
                <DollarSign size={22} color="#8b5cf6" />
                <h1
                    style={{
                        margin: 0,
                        fontSize: "1.2rem",
                        fontWeight: 700,
                        color: "#0f172a",
                    }}
                >
                    Balance de Ganancias y Pérdidas
                </h1>
            </header>

            <main
                style={{
                    padding: "2rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.5rem",
                }}
            >
                {/* Filters */}
                <div
                    style={{
                        background: "white",
                        borderRadius: "16px",
                        padding: "1.5rem",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: "0.75rem",
                    }}
                >
                    {PERIODS.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setPeriod(p.id)}
                            style={{
                                padding: "0.55rem 1.25rem",
                                borderRadius: "999px",
                                border: "2px solid",
                                borderColor: period === p.id ? "#8b5cf6" : "#e2e8f0",
                                background: period === p.id ? "#f5f3ff" : "white",
                                color: period === p.id ? "#6d28d9" : "#475569",
                                fontWeight: 700,
                                fontSize: "0.85rem",
                                cursor: "pointer",
                                fontFamily: "inherit",
                                transition: "all 0.15s",
                            }}
                        >
                            {p.label}
                        </button>
                    ))}

                    {period === "custom" && (
                        <>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                style={inputStyle}
                            />
                            <span style={{ color: "#94a3b8", fontWeight: 600 }}>→</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                style={inputStyle}
                            />
                            <button
                                onClick={fetchBalance}
                                style={{
                                    padding: "0.55rem 1.25rem",
                                    borderRadius: "999px",
                                    border: "none",
                                    background: "#8b5cf6",
                                    color: "white",
                                    fontWeight: 700,
                                    fontSize: "0.85rem",
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.4rem",
                                }}
                            >
                                <RefreshCcw size={14} /> Consultar
                            </button>
                        </>
                    )}
                </div>

                {error && (
                    <div
                        style={{
                            background: "#fef2f2",
                            border: "1px solid #fca5a5",
                            borderRadius: "12px",
                            padding: "1rem 1.5rem",
                            color: "#dc2626",
                            fontWeight: 600,
                        }}
                    >
                        {error}
                    </div>
                )}

                {loading && (
                    <div style={{ textAlign: "center", padding: "4rem", color: "#94a3b8" }}>
                        <RefreshCcw
                            size={32}
                            style={{ animation: "spin 1s linear infinite", marginBottom: "1rem" }}
                        />
                        <p style={{ margin: 0, fontWeight: 600 }}>Cargando balance...</p>
                    </div>
                )}

                {!loading && data && (
                    <>
                        {/* Cost warning */}
                        {data.products_with_cost_count < data.total_products && (
                            <div
                                style={{
                                    background: "#fffbeb",
                                    border: "1px solid #fde68a",
                                    borderRadius: "12px",
                                    padding: "1rem 1.5rem",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.75rem",
                                    color: "#92400e",
                                    fontWeight: 600,
                                    fontSize: "0.9rem",
                                }}
                            >
                                <AlertTriangle size={20} color="#f59e0b" />
                                <span>
                                    {data.products_with_cost_count} de {data.total_products} productos
                                    tienen precio de costo definido. Para un balance más preciso,
                                    ingresa el costo en la sección de Productos.
                                </span>
                            </div>
                        )}

                        {/* KPI Cards */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                                gap: "1rem",
                            }}
                        >
                            <KPICard
                                icon={<TrendingUp size={24} color="#27ae60" />}
                                label="Ingresos por Ventas"
                                value={fmt(data.total_revenue)}
                                sub={`${data.total_orders} ventas · ${periodLabel}`}
                                accent="#f0fdf4"
                            />
                            <KPICard
                                icon={<ShoppingCart size={24} color="#ef4444" />}
                                label="Costo Mercadería"
                                value={fmt(data.total_cost)}
                                sub="precio de costo"
                                accent="#fef2f2"
                            />
                            <KPICard
                                icon={
                                    data.gross_profit >= 0 ? (
                                        <TrendingUp size={24} color="#8b5cf6" />
                                    ) : (
                                        <TrendingDown size={24} color="#ef4444" />
                                    )
                                }
                                label="Ganancia Bruta"
                                value={fmt(data.gross_profit)}
                                sub={data.gross_profit >= 0 ? "utilidad" : "pérdida"}
                                accent={data.gross_profit >= 0 ? "#f5f3ff" : "#fef2f2"}
                                valueColor={data.gross_profit >= 0 ? "#6d28d9" : "#dc2626"}
                            />
                            <KPICard
                                icon={<Percent size={24} color="#0ea5e9" />}
                                label="Margen"
                                value={`${data.margin_percent}%`}
                                sub="margen de ganancia"
                                accent="#f0f9ff"
                            />
                            <KPICard
                                icon={<Tag size={24} color="#f97316" />}
                                label="Pérdida de Promos"
                                value={fmt(data.total_promotional_loss)}
                                sub="dsctos no percibidos"
                                accent="#fff7ed"
                                valueColor="#c2410c"
                            />
                        </div>

                        {/* Daily Chart */}
                        {dailySales.length > 0 && (
                            <div
                                style={{
                                    background: "white",
                                    borderRadius: "16px",
                                    padding: "1.5rem",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                                }}
                            >
                                <h2
                                    style={{
                                        margin: "0 0 0.5rem",
                                        fontSize: "1rem",
                                        fontWeight: 700,
                                        color: "#0f172a",
                                    }}
                                >
                                    📊 Balance por Día
                                </h2>
                                <div
                                    style={{
                                        display: "flex",
                                        gap: "0.75rem",
                                        marginBottom: "1rem",
                                        fontSize: "0.75rem",
                                        fontWeight: 600,
                                    }}
                                >
                                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <span
                                            style={{
                                                width: 12,
                                                height: 12,
                                                borderRadius: 3,
                                                background: "linear-gradient(180deg, #2ecc71, #1a9e5c)",
                                                display: "inline-block",
                                            }}
                                        />
                                        Ingresos
                                    </span>
                                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <span
                                            style={{
                                                width: 12,
                                                height: 12,
                                                borderRadius: 3,
                                                background: "linear-gradient(180deg, #f87171, #dc2626)",
                                                display: "inline-block",
                                            }}
                                        />
                                        Costo
                                    </span>
                                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <span
                                            style={{
                                                width: 12,
                                                height: 12,
                                                borderRadius: 3,
                                                background: "linear-gradient(180deg, #a78bfa, #7c3aed)",
                                                display: "inline-block",
                                            }}
                                        />
                                        Ganancia
                                    </span>
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "flex-end",
                                        gap: "0.5rem",
                                        height: "180px",
                                    }}
                                >
                                    {dailySales.map((d) => (
                                        <div
                                            key={d.day}
                                            style={{
                                                flex: 1,
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                gap: "3px",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: "0.65rem",
                                                    color: "#64748b",
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {fmt(d.profit).replace("$", "")}
                                            </span>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: "2px",
                                                    alignItems: "flex-end",
                                                    width: "100%",
                                                    justifyContent: "center",
                                                }}
                                            >
                                                <div
                                                    title={`Ingresos: ${fmt(d.revenue)}`}
                                                    style={{
                                                        width: "30%",
                                                        borderRadius: "4px 4px 0 0",
                                                        height: `${Math.max((d.revenue / maxBar) * 140, 4)}px`,
                                                        background: "linear-gradient(180deg, #2ecc71, #1a9e5c)",
                                                        transition: "height 0.4s ease",
                                                    }}
                                                />
                                                <div
                                                    title={`Costo: ${fmt(d.cost)}`}
                                                    style={{
                                                        width: "30%",
                                                        borderRadius: "4px 4px 0 0",
                                                        height: `${Math.max((d.cost / maxBar) * 140, 4)}px`,
                                                        background: "linear-gradient(180deg, #f87171, #dc2626)",
                                                        transition: "height 0.4s ease",
                                                    }}
                                                />
                                                <div
                                                    title={`Ganancia: ${fmt(d.profit)}`}
                                                    style={{
                                                        width: "30%",
                                                        borderRadius: "4px 4px 0 0",
                                                        height: `${Math.max((Math.abs(d.profit) / maxBar) * 140, 4)}px`,
                                                        background:
                                                            d.profit >= 0
                                                                ? "linear-gradient(180deg, #a78bfa, #7c3aed)"
                                                                : "linear-gradient(180deg, #fca5a5, #ef4444)",
                                                        transition: "height 0.4s ease",
                                                    }}
                                                />
                                            </div>
                                            <span
                                                style={{
                                                    fontSize: "0.65rem",
                                                    color: "#64748b",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {d.day.slice(5)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Two columns: Top Profitable / Top Losing */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "1.5rem",
                            }}
                        >
                            {/* Top Profitable */}
                            <div
                                style={{
                                    background: "white",
                                    borderRadius: "16px",
                                    padding: "1.5rem",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                                }}
                            >
                                <h2
                                    style={{
                                        margin: "0 0 1rem",
                                        fontSize: "1rem",
                                        fontWeight: 700,
                                        color: "#0f172a",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                    }}
                                >
                                    <TrendingUp size={18} color="#27ae60" /> Más Rentables
                                </h2>
                                {data.top_profitable.length === 0 ? (
                                    <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                                        Sin datos. Agrega costos a tus productos.
                                    </p>
                                ) : (
                                    data.top_profitable.map((p, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                padding: "0.65rem 0",
                                                borderBottom:
                                                    i < data.top_profitable.length - 1
                                                        ? "1px solid #f1f5f9"
                                                        : "none",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "0.75rem",
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        width: "24px",
                                                        height: "24px",
                                                        borderRadius: "50%",
                                                        background: i === 0 ? "#dcfce7" : "#f1f5f9",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontSize: "0.7rem",
                                                        fontWeight: 800,
                                                        color: i === 0 ? "#166534" : "#64748b",
                                                    }}
                                                >
                                                    {i + 1}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: "0.88rem",
                                                        fontWeight: 600,
                                                        color: "#1e293b",
                                                    }}
                                                >
                                                    {p.name}
                                                </span>
                                            </div>
                                            <div style={{ textAlign: "right" }}>
                                                <span
                                                    style={{
                                                        fontSize: "0.88rem",
                                                        fontWeight: 700,
                                                        color: "#27ae60",
                                                    }}
                                                >
                                                    {fmt(p.profit)}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: "0.75rem",
                                                        color: "#94a3b8",
                                                        display: "block",
                                                    }}
                                                >
                                                    {p.qty} uds · margen{" "}
                                                    {p.revenue > 0
                                                        ? Math.round(
                                                            (p.profit / p.revenue) * 100
                                                        )
                                                        : 0}
                                                    %
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Top Losing / Least Profitable */}
                            <div
                                style={{
                                    background: "white",
                                    borderRadius: "16px",
                                    padding: "1.5rem",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                                }}
                            >
                                <h2
                                    style={{
                                        margin: "0 0 1rem",
                                        fontSize: "1rem",
                                        fontWeight: 700,
                                        color: "#0f172a",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                    }}
                                >
                                    <TrendingDown size={18} color="#ef4444" /> Menor Margen
                                </h2>
                                {data.top_losing.length === 0 ? (
                                    <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                                        Sin datos. Agrega costos a tus productos.
                                    </p>
                                ) : (
                                    data.top_losing.map((p, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                padding: "0.65rem 0",
                                                borderBottom:
                                                    i < data.top_losing.length - 1
                                                        ? "1px solid #f1f5f9"
                                                        : "none",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "0.75rem",
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        width: "24px",
                                                        height: "24px",
                                                        borderRadius: "50%",
                                                        background:
                                                            p.profit < 0 ? "#fef2f2" : "#fffbeb",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontSize: "0.7rem",
                                                        fontWeight: 800,
                                                        color:
                                                            p.profit < 0 ? "#dc2626" : "#92400e",
                                                    }}
                                                >
                                                    {i + 1}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: "0.88rem",
                                                        fontWeight: 600,
                                                        color: "#1e293b",
                                                    }}
                                                >
                                                    {p.name}
                                                </span>
                                            </div>
                                            <div style={{ textAlign: "right" }}>
                                                <span
                                                    style={{
                                                        fontSize: "0.88rem",
                                                        fontWeight: 700,
                                                        color:
                                                            p.profit < 0
                                                                ? "#dc2626"
                                                                : "#f59e0b",
                                                    }}
                                                >
                                                    {fmt(p.profit)}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: "0.75rem",
                                                        color: "#94a3b8",
                                                        display: "block",
                                                    }}
                                                >
                                                    {p.qty} uds · margen{" "}
                                                    {p.revenue > 0
                                                        ? Math.round(
                                                            (p.profit / p.revenue) * 100
                                                        )
                                                        : 0}
                                                    %
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

// KPI Card component
const KPICard = ({ icon, label, value, sub, accent, valueColor }) => (
    <div
        style={{
            background: "white",
            borderRadius: "16px",
            padding: "1.5rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            display: "flex",
            gap: "1rem",
            alignItems: "center",
        }}
    >
        <div
            style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
            }}
        >
            {icon}
        </div>
        <div>
            <p
                style={{
                    margin: 0,
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                }}
            >
                {label}
            </p>
            <p
                style={{
                    margin: "0.2rem 0 0",
                    fontSize: "1.5rem",
                    fontWeight: 800,
                    color: valueColor || "#0f172a",
                }}
            >
                {value}
            </p>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8" }}>{sub}</p>
        </div>
    </div>
);

const inputStyle = {
    padding: "0.5rem 0.75rem",
    borderRadius: "10px",
    border: "2px solid #e2e8f0",
    fontSize: "0.85rem",
    fontFamily: "inherit",
    color: "#0f172a",
    outline: "none",
};
