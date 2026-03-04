import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "../context/AuthContext";

export const CashRegister = () => {
    const { businessId, token, user } = useAuth();
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [summary, setSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isClosed, setIsClosed] = useState(false);

    // Usamos strings vacíos para permitir que el usuario borre el campo libremente
    const [startingCash, setStartingCash] = useState("");
    const [countedCash, setCountedCash] = useState("");
    const [countedCard, setCountedCard] = useState("");

    const fetchRegisterData = async () => {
        setIsLoading(true);
        if (!businessId || !token) return;
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            // Endpoint que trae el resumen por medio de pago del día
            const res = await fetch(`${backendUrl}/api/reports/cash-register?date=${date}&business_id=${businessId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.is_closed) {
                    setIsClosed(true);
                    setSummary(data.summary);
                    setStartingCash(data.session_data.starting_cash);
                    setCountedCash(data.session_data.counted_cash);
                    setCountedCard(data.session_data.counted_card);
                } else {
                    setIsClosed(false);
                    setSummary(data.summary);
                    setStartingCash("");
                    setCountedCash("");
                    setCountedCard("");
                }
            } else {
                console.error("No se pudo cargar el arqueo");
            }
        } catch (error) {
            console.error("Error al cargar arqueo:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRegisterData();
    }, [date]);

    // Derived calculations (casting safely)
    const valStartingCash = Number(startingCash) || 0;
    const valCountedCash = Number(countedCash) || 0;
    const valCountedCard = Number(countedCard) || 0;

    const expectedCash = summary ? valStartingCash + summary.cash.total : valStartingCash;
    const difference = valCountedCash - expectedCash;
    const isBalanced = difference === 0;
    const hasCashInput = countedCash.toString().trim() !== "";

    const expectedCard = summary ? summary.card.total : 0;
    const cardDifference = valCountedCard - expectedCard;
    const cardIsBalanced = cardDifference === 0;
    const hasCardInput = countedCard.toString().trim() !== "";

    const generatePDF = (sumData, diffData) => {
        const doc = new jsPDF();

        doc.setFontSize(22);
        doc.text("Cierre de Caja - MyMarket", 14, 20);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Fecha del Reporte: ${date}`, 14, 28);
        doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 34);

        autoTable(doc, {
            startY: 45,
            head: [['Resumen General', 'Monto']],
            body: [
                ['Ventas Totales del Día', `$${sumData.total_revenue.toLocaleString("es-CL")}`],
                ['Ticket Promedio', `$${sumData.total_orders > 0 ? Math.round(sumData.total_revenue / sumData.total_orders).toLocaleString("es-CL") : "0"}`],
                ['Operaciones (Tickets)', sumData.total_orders]
            ],
            theme: 'grid',
            headStyles: { fillColor: [39, 174, 96] }
        });

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 15,
            head: [['Medio de Pago', 'Cantidad Tx', 'Total Registrado']],
            body: [
                ['Efectivo', sumData.cash.count, `$${sumData.cash.total.toLocaleString("es-CL")}`],
                ['Tarjeta/POS', sumData.card.count, `$${sumData.card.total.toLocaleString("es-CL")}`],
                ['Transferencia/App', sumData.mobile.count, `$${sumData.mobile.total.toLocaleString("es-CL")}`]
            ],
            theme: 'striped',
            headStyles: { fillColor: [51, 65, 85] }
        });

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 15,
            head: [['Arqueo de Efectivo', 'Valores']],
            body: [
                ['Fondo Inicial (Vuelto)', `$${diffData.valStartingCash.toLocaleString("es-CL")}`],
                ['Ventas Físicas (Sistema)', `+$${sumData.cash.total.toLocaleString("es-CL")}`],
                ['Efectivo Teórico Esperado', `$${diffData.expectedCash.toLocaleString("es-CL")}`],
                ['Monto Físico Contado en Caja', `$${diffData.valCountedCash.toLocaleString("es-CL")}`],
                ['Descuadre (Sobrante/Faltante)', `$${diffData.difference.toLocaleString("es-CL")}`]
            ],
            theme: 'grid',
            headStyles: { fillColor: [2, 132, 199] }
        });

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 15,
            head: [['Conciliación Transbank', 'Valores']],
            body: [
                ['Venta Electrónica (Sistema)', `$${diffData.expectedCard.toLocaleString("es-CL")}`],
                ['Total Voucher (Cierre Lote)', `$${diffData.valCountedCard.toLocaleString("es-CL")}`],
                ['Descuadre Terminal', `$${diffData.cardDifference.toLocaleString("es-CL")}`]
            ],
            theme: 'grid',
            headStyles: { fillColor: [147, 51, 234] }
        });

        doc.save(`CierreCaja_${date}.pdf`);
    };

    const handleCloseRegister = async () => {
        if (isClosed) {
            // Ya está cerrado, solo generar el PDF con los datos actuales
            generatePDF(summary, { valStartingCash, expectedCash, valCountedCash, difference, expectedCard, valCountedCard, cardDifference });
            return;
        }

        if (!window.confirm("¿Estás seguro de cerrar la caja? Esta acción no se puede deshacer y bloqueará las modificaciones del día.")) {
            return;
        }

        setIsLoading(true);
        try {
            if (!businessId || !token || !user) return;
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const res = await fetch(`${backendUrl}/api/reports/cash-register/close`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    date: date,
                    business_id: businessId,
                    user_id: user.id,
                    starting_cash: valStartingCash,
                    counted_cash: valCountedCash,
                    counted_card: valCountedCard
                })
            });

            if (res.ok) {
                setIsClosed(true);
                generatePDF(summary, { valStartingCash, expectedCash, valCountedCash, difference, expectedCard, valCountedCard, cardDifference });
                alert("¡Caja cerrada correctamente! El reporte PDF ha sido descargado.");
            } else {
                const err = await res.json();
                alert(err.msg || "Error al cerrar la caja");
            }
        } catch (error) {
            console.error("Error al hacer checkout de caja:", error);
            alert("Error de conexión al cerrar la caja.");
        } finally {
            setIsLoading(false);
        }
    };

    // Styles
    const cardStyle = {
        backgroundColor: "white",
        borderRadius: "16px",
        padding: "1.5rem",
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        border: "1px solid #f1f5f9"
    };

    const headerIconStyle = {
        background: "#f0fdf4",
        padding: "0.5rem",
        borderRadius: "10px",
        color: "var(--color-primary)",
        display: "inline-flex"
    };

    const inputStyle = {
        width: "100%", padding: "1rem 1rem 1rem 2.5rem", fontSize: "1.2rem", fontWeight: 600,
        background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", boxSizing: "border-box",
        color: "#0f172a", outline: "none", transition: "all 0.2s"
    };

    return (
        <div style={{ position: "fixed", inset: 0, overflowY: "auto", padding: "1.5rem", paddingBottom: "5rem", fontFamily: "var(--font-family-base)", background: "#f8fafc", zIndex: 100 }}>
            <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

                {/* Cabecera y Navegación */}
                <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", backgroundColor: "white", padding: "1rem 1.5rem", borderRadius: "16px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={headerIconStyle}>
                            <Calculator size={24} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: "1.4rem", color: "#0f172a", margin: 0, fontWeight: 700 }}>Cierre de Caja</h2>
                            <p style={{ color: "#64748b", margin: 0, fontSize: "0.9rem", fontWeight: 500 }}>
                                Punto de Venta Principal - Turno
                            </p>
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <Link to="/" style={{
                            display: "flex", alignItems: "center", gap: "0.5rem",
                            padding: "0.5rem 1rem", backgroundColor: "#f1f5f9", borderRadius: "10px",
                            color: "#475569", textDecoration: "none", fontWeight: "600", fontSize: "0.9rem",
                            transition: "background 0.2s"
                        }} onMouseOver={e => e.currentTarget.style.backgroundColor = "#e2e8f0"} onMouseOut={e => e.currentTarget.style.backgroundColor = "#f1f5f9"}>
                            <ArrowLeft size={16} /> Volver
                        </Link>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            style={{
                                padding: "0.5rem 0.75rem",
                                borderRadius: "10px",
                                border: "1px solid #e2e8f0",
                                background: "white",
                                fontSize: "0.9rem",
                                fontWeight: "600",
                                color: "#334155",
                                outline: "none",
                                cursor: "pointer",
                            }}
                        />
                        <button
                            onClick={fetchRegisterData}
                            style={{
                                display: "flex", alignItems: "center", gap: "0.4rem",
                                padding: "0.5rem 1rem",
                                backgroundColor: "var(--color-primary)",
                                border: "none",
                                borderRadius: "10px",
                                cursor: "pointer",
                                fontWeight: "600",
                                color: "white",
                                fontSize: "0.9rem",
                                transition: "all 0.15s",
                            }}
                            onMouseOver={e => e.currentTarget.style.opacity = "0.9"}
                            onMouseOut={e => e.currentTarget.style.opacity = "1"}
                        >
                            <RefreshCw size={16} className={isLoading ? "spin" : ""} />
                            Sincronizar
                        </button>
                    </div>
                </div>

                {isLoading || !summary ? (
                    <div style={{ textAlign: "center", padding: "4rem 2rem", background: "white", borderRadius: "16px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
                        <RefreshCw size={32} className="spin" style={{ marginBottom: "1rem", color: "var(--color-primary)" }} />
                        <h3 style={{ margin: 0, color: "#334155", fontSize: "1.1rem", fontWeight: 600 }}>Calculando totales...</h3>
                    </div>
                ) : (
                    <>
                        {/* KPIs Superiores */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
                            {/* KPI Ventas */}
                            <div style={cardStyle}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                                    <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem", fontWeight: 600 }}>Ventas del Día</p>
                                    <div style={{ color: "var(--color-primary)", background: "#f0fdf4", padding: "0.4rem", borderRadius: "8px" }}><Banknote size={18} /></div>
                                </div>
                                <h2 style={{ margin: 0, fontSize: "2.2rem", fontWeight: 800, color: "#0f172a" }}>${summary.total_revenue.toLocaleString("es-CL")}</h2>
                            </div>

                            {/* KPI Ticket Promedio */}
                            <div style={cardStyle}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                                    <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem", fontWeight: 600 }}>Ticket Promedio</p>
                                    <div style={{ color: "var(--color-primary)", background: "#f0fdf4", padding: "0.4rem", borderRadius: "8px" }}><Activity size={18} /></div>
                                </div>
                                <h2 style={{ margin: 0, fontSize: "2.2rem", fontWeight: 800, color: "#0f172a" }}>
                                    ${summary.total_orders > 0 ? Math.round(summary.total_revenue / summary.total_orders).toLocaleString("es-CL") : "0"}
                                </h2>
                                <p style={{ margin: "0.25rem 0 0", color: "#94a3b8", fontSize: "0.8rem", fontWeight: 500 }}>Basado en tickets emitidos</p>
                            </div>

                            {/* KPI Operaciones */}
                            <div style={cardStyle}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                                    <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem", fontWeight: 600 }}>Operaciones</p>
                                    <div style={{ color: "var(--color-primary)", background: "#f0fdf4", padding: "0.4rem", borderRadius: "8px" }}><BarChart2 size={18} /></div>
                                </div>
                                <h2 style={{ margin: 0, fontSize: "2.2rem", fontWeight: 800, color: "#0f172a" }}>{summary.total_orders}</h2>
                            </div>
                        </div>

                        {/* Main Grid: Arqueo vs Resumen Medios */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>

                            {/* COLUMNA IZQUIERDA: Arqueo de Efectivo */}
                            <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "1rem" }}>
                                    <Calculator size={20} color="var(--color-primary)" />
                                    <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>Arqueo de Efectivo</h3>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                    {/* Fondo Inicial */}
                                    <div>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#64748b", fontSize: "0.9rem" }}>Fondo Inicial</label>
                                        <div style={{ position: "relative" }}>
                                            <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", fontSize: "1.1rem", fontWeight: 600, color: "#94a3b8" }}>$</span>
                                            <input
                                                type="number" min="0" placeholder="0.00" value={startingCash} onChange={(e) => setStartingCash(e.target.value)}
                                                disabled={isClosed}
                                                style={{ ...inputStyle, opacity: isClosed ? 0.6 : 1, cursor: isClosed ? "not-allowed" : "text" }}
                                                onFocus={e => { if (!isClosed) { e.currentTarget.style.borderColor = "var(--color-primary)"; e.currentTarget.style.background = "white"; } }}
                                                onBlur={e => { if (!isClosed) { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#f8fafc"; } }}
                                            />
                                        </div>
                                    </div>

                                    {/* Monto Físico Contado */}
                                    <div>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#64748b", fontSize: "0.9rem" }}>Monto Físico Contado</label>
                                        <div style={{ position: "relative" }}>
                                            <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", fontSize: "1.1rem", fontWeight: 600, color: "#94a3b8" }}>$</span>
                                            <input
                                                type="number" min="0" placeholder="0.00" value={countedCash} onChange={(e) => setCountedCash(e.target.value)}
                                                disabled={isClosed}
                                                style={{ ...inputStyle, opacity: isClosed ? 0.6 : 1, cursor: isClosed ? "not-allowed" : "text" }}
                                                onFocus={e => { if (!isClosed) { e.currentTarget.style.borderColor = "var(--color-primary)"; e.currentTarget.style.background = "white"; } }}
                                                onBlur={e => { if (!isClosed) { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#f8fafc"; } }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Efectivo Teórico */}
                                <div style={{ backgroundColor: "#fffbeb", borderRadius: "12px", border: "1px solid #fef3c7", padding: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <p style={{ margin: 0, fontWeight: 700, color: "#451a03", fontSize: "1rem" }}>Efectivo Teórico (Sistema)</p>
                                        <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#78350f" }}>Ventas efectivo ({summary.cash.count}) + Fondo inicial</p>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <h3 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "var(--color-primary)" }}>${expectedCash.toLocaleString("es-CL")}</h3>
                                        {hasCashInput && (
                                            <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", fontWeight: 600, color: isBalanced ? "#16a34a" : (difference > 0 ? "#0284c7" : "#dc2626") }}>
                                                {isBalanced ? "Cuadra Perfecto" : `Sobrante/Faltante: ${difference > 0 ? "+" : ""}$${difference.toLocaleString("es-CL")}`}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* COLUMNA DERECHA: Conciliación Tarjetas y Transferencias */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

                                {/* Tarjetas */}
                                <div style={{ ...cardStyle }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "1rem", marginBottom: "1rem" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                            <CreditCard size={20} color="var(--color-primary)" />
                                            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>Conciliación de Tarjetas</h3>
                                        </div>
                                        {hasCardInput && (
                                            <span style={{ background: cardIsBalanced ? "#dcfce7" : "#fee2e2", color: cardIsBalanced ? "#16a34a" : "#dc2626", padding: "0.25rem 0.5rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700 }}>
                                                {cardIsBalanced ? "OK" : "DIFERENCIA"}
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                                        <div>
                                            <p style={{ margin: 0, fontWeight: 600, color: "#334155", fontSize: "0.95rem" }}>Ventas por Tbank/POS</p>
                                            <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#64748b" }}>{summary.card.count} transacciones en sistema</p>
                                        </div>
                                        <p style={{ margin: 0, fontWeight: 700, fontSize: "1.1rem", color: "#0f172a" }}>${summary.card.total.toLocaleString("es-CL")}</p>
                                    </div>

                                    <div style={{ backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <p style={{ margin: 0, fontWeight: 600, color: "var(--color-primary)", fontSize: "0.95rem" }}>Total Cierre Z (Voucher)</p>
                                        <div style={{ position: "relative", width: "140px" }}>
                                            <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "1rem", fontWeight: 600, color: "#94a3b8" }}>$</span>
                                            <input
                                                type="number" min="0" placeholder="0" value={countedCard} onChange={(e) => setCountedCard(e.target.value)}
                                                disabled={isClosed}
                                                style={{
                                                    width: "100%", padding: "0.5rem 0.5rem 0.5rem 1.75rem", fontSize: "1.1rem", fontWeight: 700,
                                                    background: isClosed ? "#f1f5f9" : "white", border: "1px solid #cbd5e1", borderRadius: "8px", boxSizing: "border-box",
                                                    color: "var(--color-primary)", outline: "none", textAlign: "right",
                                                    opacity: isClosed ? 0.6 : 1, cursor: isClosed ? "not-allowed" : "text"
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {hasCardInput && !cardIsBalanced && (
                                        <p style={{ margin: "0.5rem 0 0", textAlign: "right", fontSize: "0.85rem", fontWeight: 700, color: cardDifference > 0 ? "#0284c7" : "#dc2626" }}>
                                            Diferencia: {cardDifference > 0 ? "+" : ""}${cardDifference.toLocaleString("es-CL")}
                                        </p>
                                    )}
                                </div>

                                {/* Transferencias */}
                                <div style={{ ...cardStyle }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "1rem", marginBottom: "1rem" }}>
                                        <Smartphone size={20} color="var(--color-primary)" />
                                        <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>Transferencias</h3>
                                    </div>

                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div>
                                            <p style={{ margin: 0, fontWeight: 600, color: "#334155", fontSize: "0.95rem" }}>Billeteras / App Banco</p>
                                            <p style={{ margin: "0.15rem 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                                                {summary.total_revenue > 0 ? Math.round((summary.mobile.total / summary.total_revenue) * 100) : 0}% de los ingresos
                                            </p>
                                        </div>
                                        <p style={{ margin: 0, fontWeight: 700, fontSize: "1.1rem", color: "#0f172a" }}>${summary.mobile.total.toLocaleString("es-CL")}</p>
                                    </div>
                                    <div style={{ marginTop: "0.75rem", height: "6px", width: "100%", backgroundColor: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                                        <div style={{ height: "100%", width: `${summary.total_revenue > 0 ? (summary.mobile.total / summary.total_revenue) * 100 : 0}%`, backgroundColor: "var(--color-primary)", transition: "width 0.5s ease-out" }}></div>
                                    </div>
                                </div>

                                {isClosed && (
                                    <div style={{ padding: "0.75rem", background: "#f0fdf4", color: "#166534", borderRadius: "8px", display: "flex", gap: "0.5rem", alignItems: "center", justifyContent: "center", border: "1px solid #bbf7d0", fontSize: "0.9rem", fontWeight: 600 }}>
                                        <Lock size={16} /> Caja cerrada para este día. Datos en solo lectura.
                                    </div>
                                )}

                                <button onClick={handleCloseRegister} style={{
                                    width: "100%", padding: "1.25rem", borderRadius: "12px", border: "none",
                                    background: isClosed ? "var(--color-primary)" : "#0f172a", color: "white", fontWeight: 700, fontSize: "1.1rem",
                                    cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem",
                                    boxShadow: isClosed ? "0 4px 12px rgba(39, 174, 96, 0.2)" : "0 4px 12px rgba(15,23,42,0.15)", transition: "all 0.2s"
                                }} onMouseOver={e => e.currentTarget.style.opacity = "0.9"} onMouseOut={e => e.currentTarget.style.opacity = "1"}>
                                    {isClosed ? <><FileText size={20} /> Re-imprimir Reporte PDF</> : <><Lock size={20} /> Confirmar y Cerrar Caja</>}
                                </button>

                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
