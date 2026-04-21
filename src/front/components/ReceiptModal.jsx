import React from "react";
import { X, Printer, ShoppingBag, CreditCard, Banknote, Smartphone, CheckCircle } from "lucide-react";

const PAYMENT_LABELS = {
    cash: { label: "Efectivo", icon: <Banknote size={16} />, color: "#16a34a", bg: "#dcfce7" },
    card: { label: "Tarjeta / POS", icon: <CreditCard size={16} />, color: "#0284c7", bg: "#e0f2fe" },
    mobile: { label: "Transferencia", icon: <Smartphone size={16} />, color: "#7c3aed", bg: "#ede9fe" },
};

export const ReceiptModal = ({ order, cart, paymentMethod, cashReceived, businessName, cashierName, onClose }) => {
    const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const ivaAmount = Math.round(subtotal * 0.19);
    const total = subtotal;
    const change = cashReceived > 0 ? cashReceived - total : 0;
    const method = PAYMENT_LABELS[paymentMethod] || PAYMENT_LABELS.cash;

    const now = new Date();
    const dateStr = now.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });
    const timeStr = now.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

    const handlePrint = () => {
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        const receiptHtml = `
            <html>
                <head>
                    <title>Ticket - ${businessName || "Zoko"}</title>
                    <style>
                        @page { margin: 0; }
                        body {
                            margin: 0;
                            padding: 0;
                            background: white;
                            font-family: 'Courier New', Courier, monospace;
                        }
                        .ticket {
                            width: 65mm; /* Even safer width to avoid any clipping */
                            margin: 0;
                            padding: 5mm 10mm 5mm 2mm; /* Large right buffer for amounts */
                            color: black;
                            font-size: 11px;
                            line-height: 1.3;
                            font-weight: 600;
                            box-sizing: border-box;
                        }
                        .header { text-align: center; margin-bottom: 4mm; padding-right: 8mm; }
                        .header h2 { margin: 0; font-size: 18px; text-transform: uppercase; font-weight: 800; }
                        .header p { margin: 2px 0; font-size: 11px; font-weight: 600; }
                        .info { font-size: 11px; margin-bottom: 4mm; border-bottom: 1.5px dashed black; padding-bottom: 2mm; font-weight: 600; padding-right: 8mm; }
                        .items { width: 100%; }
                        .item-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
                        .item-name { flex: 1; padding-right: 6px; font-weight: 600; }
                        .item-qty-price { white-space: nowrap; font-weight: 500; font-size: 11px; }
                        .item-total { font-weight: 800; font-size: 12px; }
                        .totals { margin-top: 5mm; border-top: 1.5px dashed black; padding-top: 2mm; }
                        .total-row { display: flex; justify-content: space-between; font-weight: 900; font-size: 16px; margin-top: 2mm; }
                        .sub-row { display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; margin-bottom: 1mm; }
                        .footer { text-align: center; margin-top: 10mm; font-size: 10px; border-top: 1.5px dashed black; padding-top: 2mm; font-weight: 600; padding-right: 8mm; }
                    </style>
                </head>
                <body>
                    <div class="ticket">
                        <div class="header">
                        <h2>${businessName || "Zoko"}</h2>
                        <p>Orden #${order?.id || "—"}</p>
                        <p>${dateStr} ${timeStr}</p>
                    </div>
                    <div class="info"><p>Atendido por: ${cashierName || "Admin"}</p></div>
                    <div class="items">
                        ${cart.map(item => `
                            <div class="item-row">
                                <div class="item-name">${item.name}</div>
                            </div>
                            <div class="item-row" style="margin-bottom: 3px;">
                                <div class="item-qty-price">${item.quantity} x $${item.price.toLocaleString("es-CL")}</div>
                                <div class="item-total">$${(item.price * item.quantity).toLocaleString("es-CL")}</div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="totals">
                        <div class="sub-row">
                            <span>Subtotal:</span>
                            <span>$${subtotal.toLocaleString("es-CL")}</span>
                        </div>
                        <div class="sub-row">
                            <span>IVA (19%):</span>
                            <span>$${ivaAmount.toLocaleString("es-CL")}</span>
                        </div>
                        <div class="total-row">
                            <span>TOTAL:</span>
                            <span>$${total.toLocaleString("es-CL")}</span>
                        </div>
                    </div>
                    <div class="info" style="border-top: 1px dashed black; border-bottom: none; margin-top: 3mm; padding-top: 2mm;">
                        <div class="sub-row"><span>M. Pago:</span><span>${method.label}</span></div>
                        ${paymentMethod === 'cash' ? `
                            <div class="sub-row"><span>Recibido:</span><span>$${cashReceived.toLocaleString("es-CL")}</span></div>
                            <div class="sub-row"><span>Vuelto:</span><span>$${change.toLocaleString("es-CL")}</span></div>
                        ` : ''}
                    </div>
                    <div class="footer"><p>¡GRACIAS POR SU COMPRA!</p><p>${businessName || "Zoko"}</p></div>
                    </div>
                    <script>
                        window.onload = function() {
                            setTimeout(() => {
                                window.print();
                                // Esperamos 1.5 segundos extras para asegurar que el sistema reciba el trabajo
                                setTimeout(() => { window.close(); }, 1500);
                            }, 500);
                        };
                    </script>
                </body>
            </html>
        `;
        printWindow.document.write(receiptHtml);
        printWindow.document.close();
    };

    return (
        <>
            {/* Print-specific global styles */}
            <style>{`
                @keyframes receiptSlideUp {
                    from { opacity: 0; transform: translateY(30px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                .receipt-modal-box {
                    animation: receiptSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .receipt-row:hover { background: #f8fafc !important; }
            `}</style>

            {/* Backdrop */}
            <div
                className="receipt-modal-backdrop"
                style={{
                    position: "fixed", inset: 0,
                    background: "rgba(15, 23, 42, 0.72)",
                    backdropFilter: "blur(8px)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 10000, padding: "1rem",
                }}
                onClick={onClose}
            >
                {/* Receipt Card */}
                <div
                    id="receipt-print-root"
                    className="receipt-modal-box"
                    onClick={e => e.stopPropagation()}
                    style={{
                        background: "white",
                        borderRadius: "24px",
                        width: "100%",
                        maxWidth: "460px",
                        maxHeight: "92vh",
                        overflowY: "auto",
                        boxShadow: "0 32px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.05)",
                        fontFamily: "'Inter', system-ui, sans-serif",
                        position: "relative",
                    }}
                >
                    {/* Close button */}
                    <button
                        className="receipt-no-print"
                        onClick={onClose}
                        style={{
                            position: "absolute", top: "1rem", right: "1rem",
                            background: "#f1f5f9", border: "none",
                            width: "36px", height: "36px", borderRadius: "50%",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", color: "#64748b", zIndex: 10,
                            transition: "background 0.2s",
                        }}
                        onMouseOver={e => e.currentTarget.style.background = "#e2e8f0"}
                        onMouseOut={e => e.currentTarget.style.background = "#f1f5f9"}
                    >
                        <X size={18} />
                    </button>

                    {/* ── Header ── */}
                    <div style={{
                        background: "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)",
                        padding: "2rem 2rem 1.5rem",
                        borderRadius: "24px 24px 0 0",
                        color: "white",
                        textAlign: "center",
                    }}>
                        <div style={{
                            width: "52px", height: "52px", background: "rgba(255,255,255,0.15)",
                            borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                            margin: "0 auto 0.75rem", border: "2px solid rgba(255,255,255,0.3)"
                        }}>
                            <CheckCircle size={28} color="white" />
                        </div>
                        <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.3px" }}>
                            ¡Pago Exitoso!
                        </h2>
                        <p style={{ margin: "0.5rem 0 0", fontSize: "1.6rem", fontWeight: 950, letterSpacing: "-0.8px" }}>
                            <span style={{ color: "#fbc531" }}>Z</span>
                            <span style={{ color: "#eb4d4b" }}>o</span>
                            <span style={{ color: "#27ae60" }}>k</span>
                            <span style={{ color: "#00a8ff" }}>o</span>
                        </p>
                    </div>

                    {/* ── Receipt Info Bar ── */}
                    <div style={{
                        background: "#f8fafc",
                        borderBottom: "1px solid #f1f5f9",
                        padding: "0.9rem 1.75rem",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        fontSize: "0.78rem", color: "#64748b", fontWeight: 600,
                    }}>
                        <span>Orden #{order?.id || "—"}</span>
                        <span>{dateStr} · {timeStr}</span>
                        <span>Caj: {cashierName || "Admin"}</span>
                    </div>

                    {/* ── Items Table ── */}
                    <div style={{ padding: "1.25rem 1.75rem" }}>
                        <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                            Detalle de compra
                        </p>

                        <div style={{ borderRadius: "14px", border: "1px solid #f1f5f9", overflow: "hidden" }}>
                            {/* Table header */}
                            <div style={{
                                display: "grid", gridTemplateColumns: "1fr 60px 80px",
                                padding: "0.6rem 1rem", background: "#f8fafc",
                                fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em",
                            }}>
                                <span>Producto</span>
                                <span style={{ textAlign: "center" }}>Cant.</span>
                                <span style={{ textAlign: "right" }}>Total</span>
                            </div>

                            {/* Items */}
                            {cart.map((item, idx) => (
                                <div
                                    key={item.id}
                                    className="receipt-row"
                                    style={{
                                        display: "grid", gridTemplateColumns: "1fr 60px 80px",
                                        padding: "0.7rem 1rem",
                                        borderTop: idx === 0 ? "none" : "1px solid #f8fafc",
                                        transition: "background 0.15s",
                                        alignItems: "center",
                                    }}
                                >
                                    <div>
                                        <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 600, color: "#0f172a", lineHeight: 1.3 }}>
                                            {item.name}
                                        </p>
                                        <p style={{ margin: "0.1rem 0 0", fontSize: "0.75rem", color: "#94a3b8", fontWeight: 500 }}>
                                            ${item.price.toLocaleString("es-CL")} c/u
                                        </p>
                                    </div>
                                    <span style={{ textAlign: "center", fontWeight: 700, fontSize: "0.9rem", color: "#475569" }}>
                                        ×{item.quantity}
                                    </span>
                                    <span style={{ textAlign: "right", fontWeight: 700, fontSize: "0.92rem", color: "#0f172a" }}>
                                        ${(item.price * item.quantity).toLocaleString("es-CL")}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Separator ── */}
                    <div style={{ margin: "0 1.75rem", borderTop: "2px dashed #e2e8f0" }} />

                    {/* ── Totals ── */}
                    <div style={{ padding: "1.1rem 1.75rem 0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem", fontSize: "0.88rem", color: "#64748b" }}>
                            <span>Subtotal ({cart.reduce((a, i) => a + i.quantity, 0)} items)</span>
                            <span style={{ fontWeight: 600 }}>${subtotal.toLocaleString("es-CL")}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", fontSize: "0.88rem", color: "#64748b" }}>
                            <span>IVA incluido (19%)</span>
                            <span style={{ fontWeight: 600 }}>${ivaAmount.toLocaleString("es-CL")}</span>
                        </div>
                        <div style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "0.85rem 1.1rem",
                            background: "#f0fdf4", borderRadius: "14px",
                            border: "1.5px solid #bbf7d0",
                        }}>
                            <span style={{ fontWeight: 800, fontSize: "1rem", color: "#065f46" }}>TOTAL</span>
                            <span style={{ fontWeight: 900, fontSize: "1.6rem", color: "#065f46", letterSpacing: "-0.5px" }}>
                                ${total.toLocaleString("es-CL")}
                            </span>
                        </div>
                    </div>

                    {/* ── Payment Method ── */}
                    <div style={{ padding: "0.85rem 1.75rem" }}>
                        <div style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "0.75rem 1rem",
                            background: method.bg, borderRadius: "12px",
                            border: `1.5px solid ${method.color}33`,
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: method.color, fontWeight: 700, fontSize: "0.9rem" }}>
                                {method.icon}
                                <span>{method.label}</span>
                            </div>
                            {paymentMethod === "cash" && cashReceived > 0 && (
                                <div style={{ fontSize: "0.82rem", color: method.color, fontWeight: 600, textAlign: "right" }}>
                                    <div>Recibido: ${cashReceived.toLocaleString("es-CL")}</div>
                                    <div style={{ fontSize: "1rem", fontWeight: 800 }}>
                                        Vuelto: ${change.toLocaleString("es-CL")}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Footer ── */}
                    <div style={{
                        padding: "0.75rem 1.75rem 1.75rem",
                        display: "flex", gap: "0.75rem",
                    }}>
                        <button
                            className="receipt-no-print"
                            onClick={handlePrint}
                            style={{
                                flex: "0 0 auto",
                                padding: "0.8rem 1.1rem",
                                borderRadius: "14px",
                                border: "2px solid #e2e8f0",
                                background: "white",
                                color: "#475569",
                                fontWeight: 700,
                                fontSize: "0.9rem",
                                cursor: "pointer",
                                display: "flex", alignItems: "center", gap: "0.45rem",
                                fontFamily: "inherit",
                                transition: "all 0.2s",
                            }}
                            onMouseOver={e => e.currentTarget.style.background = "#f1f5f9"}
                            onMouseOut={e => e.currentTarget.style.background = "white"}
                        >
                            <Printer size={18} />
                            Imprimir
                        </button>
                        <button
                            className="receipt-no-print"
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: "0.8rem 1.5rem",
                                borderRadius: "14px",
                                border: "none",
                                background: "linear-gradient(135deg, #065f46, #059669)",
                                color: "white",
                                fontWeight: 800,
                                fontSize: "0.95rem",
                                cursor: "pointer",
                                fontFamily: "inherit",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                                boxShadow: "0 6px 20px rgba(5,150,105,0.35)",
                                transition: "all 0.2s",
                            }}
                            onMouseOver={e => e.currentTarget.style.opacity = "0.9"}
                            onMouseOut={e => e.currentTarget.style.opacity = "1"}
                        >
                            <ShoppingBag size={18} />
                            Nueva Venta
                        </button>
                    </div>

                    {/* ── Thank-you footer ── */}
                    <div style={{
                        textAlign: "center", padding: "0 1.75rem 1.5rem",
                        fontSize: "0.78rem", color: "#94a3b8", fontWeight: 500,
                    }}>
                        ¡Gracias por su compra! · {businessName || "Zoko"}
                    </div>
                </div>
            </div>
        </>
    );
};
