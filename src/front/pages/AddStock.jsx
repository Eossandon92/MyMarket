import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import { PackageOpen, Search, CheckCircle, AlertCircle, RefreshCw, Hand, ArrowRight, Camera, Save, Trash2, ChevronLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const AddStock = () => {
    const { businessId, token } = useAuth();
    const navigate = useNavigate();
    // Single product states
    const [scannedProduct, setScannedProduct] = useState(null);
    const [qtyToAdd, setQtyToAdd] = useState("");
    const [manualBarcode, setManualBarcode] = useState("");

    // Global states
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [allProducts, setAllProducts] = useState([]);

    // Invoice OCR states
    const [invoiceItems, setInvoiceItems] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState("");

    // AI Excel upload states
    const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
    const [aiPreviewItems, setAiPreviewItems] = useState(null);
    const [isProcessingExcel, setIsProcessingExcel] = useState(false);
    const [excelError, setExcelError] = useState("");
    const [excelSuccess, setExcelSuccess] = useState("");

    const qtyInputRef = useRef(null);
    const manualInputRef = useRef(null);
    const fileInputRef = useRef(null);
    const excelFileInputRef = useRef(null);

    useEffect(() => {
        // Cargar todos los productos una vez para el mapeo manual
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            if (!businessId || !token) return;
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const res = await fetch(`${backendUrl}/api/products?business_id=${businessId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAllProducts(data);
            }
        } catch (error) {
            console.error("Error fetching products:", error);
        }
    };

    const resetState = () => {
        setScannedProduct(null);
        setQtyToAdd("");
        setErrorMsg("");
        setSuccessMsg("");
        setInvoiceItems(null);
        setAiPreviewItems(null);
        setIsExcelModalOpen(false);
        if (manualInputRef.current) {
            manualInputRef.current.focus();
        }
    };

    const fetchProductByBarcode = async (barcode) => {
        if (isUploading || invoiceItems) return; // No interrumpir si está en modo OCR

        setIsLoading(true);
        setErrorMsg("");
        setSuccessMsg("");
        setScannedProduct(null);

        try {
            if (!businessId || !token) return;
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const res = await fetch(`${backendUrl}/api/products/barcode/${barcode}?business_id=${businessId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setScannedProduct(data);
                setTimeout(() => {
                    if (qtyInputRef.current) qtyInputRef.current.focus();
                }, 50);
            } else {
                setErrorMsg(`No se encontró ningún producto con el código: ${barcode}`);
                setTimeout(() => setErrorMsg(""), 3000);
            }
        } catch (error) {
            console.error("Error fetching product:", error);
            setErrorMsg("Error de conexión al buscar el producto.");
            setTimeout(() => setErrorMsg(""), 3000);
        } finally {
            setIsLoading(false);
            setManualBarcode("");
        }
    };

    useBarcodeScanner((code) => {
        fetchProductByBarcode(code);
    }, { enabled: !scannedProduct && !isUploading && !invoiceItems });

    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (manualBarcode.trim()) {
            fetchProductByBarcode(manualBarcode.trim());
        }
    };

    const handleSaveSingleStock = async (e) => {
        e.preventDefault();
        const qty = parseInt(qtyToAdd, 10);
        if (!qty || qty <= 0 || !scannedProduct) return;

        setIsLoading(true);
        try {
            const newStock = scannedProduct.stock + qty;
            const backendUrl = import.meta.env.VITE_BACKEND_URL;

            const res = await fetch(`${backendUrl}/api/products/${scannedProduct.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ stock: newStock })
            });

            if (res.ok) {
                const updatedData = await res.json();
                setSuccessMsg(`¡✅ Se sumaron ${qty} unidades a ${updatedData.name}! Nuevo stock: ${updatedData.stock}`);
                setTimeout(resetState, 2000);
            } else {
                setErrorMsg("Error al guardar el nuevo stock");
            }
        } catch (error) {
            console.error("Error updating stock", error);
            setErrorMsg("Error de conexión");
        } finally {
            setIsLoading(false);
        }
    };

    // --- OCR Functions ---
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        setUploadProgress("La IA de Gemini está leyendo la factura...");
        setErrorMsg("");
        setSuccessMsg("");
        setInvoiceItems(null);
        setScannedProduct(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const res = await fetch(`${backendUrl}/api/inventory/scan-invoice`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setInvoiceItems(data.items);
                setSuccessMsg("¡Lectura completada! Revisa y confirma los productos.");
            } else {
                const err = await res.json();
                setErrorMsg(err.msg || "Error al procesar la factura con IA");
            }
        } catch (err) {
            console.error(err);
            setErrorMsg("Error de conexión con el OCR de IA");
        } finally {
            setIsUploading(false);
            setUploadProgress("");
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleRemoveInvoiceItem = (index) => {
        const newItems = [...invoiceItems];
        newItems.splice(index, 1);
        setInvoiceItems(newItems);
        if (newItems.length === 0) setInvoiceItems(null);
    };

    const handleUpdateProductSelect = (index, productId) => {
        const newItems = [...invoiceItems];
        newItems[index].predicted_product_id = productId ? parseInt(productId, 10) : null;
        setInvoiceItems(newItems);
    };

    const saveBulkInventory = async () => {
        const validItems = invoiceItems.filter(item => item.predicted_product_id && item.invoice_qty > 0);
        if (validItems.length === 0) {
            setErrorMsg("No hay productos válidos con emparejamiento para guardar.");
            return;
        }

        setIsLoading(true);
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const payload = {
                items: validItems.map(item => ({
                    product_id: item.predicted_product_id,
                    qty_to_add: item.invoice_qty
                }))
            };

            const res = await fetch(`${backendUrl}/api/inventory/bulk-add`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setSuccessMsg(`¡✅ Inventario masivo actualizado (${validItems.length} productos)!`);
                setTimeout(resetState, 3000);
            } else {
                setErrorMsg("Error al guardar el inventario masivo");
            }
        } catch (error) {
            console.error("Error bulk updating stock", error);
            setErrorMsg("Error de conexión");
        } finally {
            setIsLoading(false);
        }
    };

    // --- AI Excel Functions ---
    const handleExcelUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsProcessingExcel(true);
        setExcelError("");
        setExcelSuccess("");
        setAiPreviewItems(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const res = await fetch(`${backendUrl}/api/inventory/upload`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setAiPreviewItems(data.items);
            } else {
                const err = await res.json();
                setExcelError(err.msg || "Error al procesar el Excel con IA.");
            }
        } catch (err) {
            console.error(err);
            setExcelError("Error de conexión al procesar el Excel.");
        } finally {
            setIsProcessingExcel(false);
            if (excelFileInputRef.current) excelFileInputRef.current.value = "";
        }
    };

    const removePreviewItem = (index) => {
        const newItems = [...aiPreviewItems];
        newItems.splice(index, 1);
        setAiPreviewItems(newItems);
    };

    const confirmAIExcelImport = async () => {
        if (!aiPreviewItems || aiPreviewItems.length === 0) return;

        setIsProcessingExcel(true);
        setExcelError("");

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            // Endpoint /inventory/confirm expects { items: [...] }
            const res = await fetch(`${backendUrl}/api/inventory/confirm`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ items: aiPreviewItems })
            });

            if (res.ok) {
                setExcelSuccess(`¡✅ Se ingresaron ${aiPreviewItems.length} productos con éxito!`);
                setTimeout(() => {
                    resetState();
                    fetchProducts(); // refresh cache
                }, 2500);
            } else {
                const err = await res.json();
                setExcelError(err.msg || "Error al confirmar la importación.");
            }
        } catch (error) {
            console.error(error);
            setExcelError("Error de conexión al guardar los productos.");
        } finally {
            setIsProcessingExcel(false);
        }
    };

    return (
        <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto", fontFamily: "Inter, sans-serif" }}>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                    <h1 style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "2rem", fontWeight: 800, margin: "0 0 0.5rem", color: "#0f172a" }}>
                        <PackageOpen size={32} color="var(--color-primary)" />
                        Ingreso de Mercadería
                    </h1>
                    <p style={{ color: "#64748b", margin: 0, fontSize: "1rem" }}>Ingresa stock escaneando, con facturas o mediante Inteligencia Artificial.</p>
                </div>
                <button
                    onClick={() => navigate("/products/new")}
                    style={{
                        background: "white", color: "var(--color-primary)", border: "2px solid var(--color-primary)",
                        padding: "0.75rem 1.5rem", borderRadius: "100px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem",
                        boxShadow: "0 4px 6px rgba(0,0,0,0.05)"
                    }}
                >
                    + Nuevo Producto Manual
                </button>
            </div>

            {/* Actions Bar */}
            <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
                <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    style={{
                        background: "#0f172a", color: "white", border: "none", padding: "1rem 1.5rem", borderRadius: "12px",
                        fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, justifyContent: "center",
                        boxShadow: "0 4px 10px rgba(15, 23, 42, 0.2)"
                    }}
                >
                    {isUploading ? <RefreshCw className="spin" size={20} /> : <Camera size={20} />}
                    {isUploading ? uploadProgress : "Tomar Foto de Factura (IA)"}
                </button>

                <input
                    type="file"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    ref={excelFileInputRef}
                    onChange={handleExcelUpload}
                    style={{ display: 'none' }}
                />
                <button
                    onClick={() => {
                        setIsExcelModalOpen(true);
                        setAiPreviewItems(null);
                        setExcelError("");
                        setExcelSuccess("");
                    }}
                    style={{
                        background: "var(--color-primary)", color: "white", border: "none", padding: "1rem 1.5rem", borderRadius: "12px",
                        fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, justifyContent: "center",
                        boxShadow: "0 4px 10px rgba(34, 197, 94, 0.3)"
                    }}
                >
                    🪄 Importar Excel Inicial (IA)
                </button>
            </div>
            {errorMsg && (
                <div style={{ background: "#fef2f2", borderLeft: "4px solid #ef4444", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "#991b1b", fontWeight: 600 }}>
                    <AlertCircle size={20} /> {errorMsg}
                </div>
            )}

            {successMsg && (
                <div style={{ background: "#f0fdf4", borderLeft: "4px solid #22c55e", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "#166534", fontWeight: 700 }}>
                    {successMsg}
                </div>
            )}

            {isUploading && (
                <div style={{ textAlign: "center", padding: "4rem 2rem", background: "white", borderRadius: "20px", border: "1px solid #f1f5f9" }}>
                    <RefreshCw size={48} color="var(--color-primary)" className="spin" style={{ marginBottom: "1rem" }} />
                    <h2 style={{ margin: 0, color: "#1e293b" }}>{uploadProgress}</h2>
                    <p style={{ color: "#64748b" }}>Gemini está detectando los productos de tu imagen...</p>
                </div>
            )}

            {/* ---------------- OCR INVOICE MAPPING ---------------- */}
            {invoiceItems && !isUploading && (
                <div style={{ background: "white", borderRadius: "20px", padding: "2rem", boxShadow: "0 10px 30px rgba(0,0,0,0.03)", border: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                        <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem", color: "#0f172a" }}>
                            <CheckCircle color="var(--color-primary)" /> Revisión de Factura
                        </h2>
                        <button onClick={resetState} style={{ background: "transparent", border: "1px solid #e2e8f0", padding: "0.5rem 1rem", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}>
                            Cancelar
                        </button>
                    </div>

                    <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>Selecciona a qué producto interno corresponde cada ítem detectado o elimina los que no quieras ingresar al inventario.</p>

                    <div style={{ maxHeight: "350px", overflowY: "auto", overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px", marginBottom: "2rem" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
                            <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "white", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                                <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                                    <th style={{ textAlign: "left", padding: "1rem", color: "#64748b" }}>Ítem en Factura</th>
                                    <th style={{ textAlign: "center", padding: "1rem", color: "#64748b", width: "10%" }}>Cant.</th>
                                    <th style={{ textAlign: "left", padding: "1rem", color: "#64748b", width: "40%" }}>Emparejado con Producto</th>
                                    <th style={{ textAlign: "right", padding: "1rem", color: "#64748b", width: "10%" }}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoiceItems.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#f8fafc"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                                        <td style={{ padding: "1rem", fontWeight: 600, color: "#334155" }}>
                                            {item.invoice_item}
                                            {item.confidence === "high" && <span style={{ marginLeft: "0.5rem", fontSize: "0.7rem", padding: "2px 6px", background: "#dcfce7", color: "#166534", borderRadius: "10px" }}>Match IA</span>}
                                        </td>
                                        <td style={{ padding: "1rem", textAlign: "center", fontWeight: 800, color: "var(--color-primary)", fontSize: "1.2rem" }}>
                                            +{item.invoice_qty}
                                        </td>
                                        <td style={{ padding: "1rem" }}>
                                            <select
                                                value={item.predicted_product_id || ""}
                                                onChange={(e) => handleUpdateProductSelect(idx, e.target.value)}
                                                style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", border: item.predicted_product_id ? "1px solid #cbd5e1" : "2px solid #ef4444", outline: "none", background: "white" }}
                                            >
                                                <option value="">-- Seleccionar producto manualmente --</option>
                                                {allProducts.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td style={{ padding: "1rem", textAlign: "right" }}>
                                            <button onClick={() => handleRemoveInvoiceItem(idx)} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "0.5rem" }}>
                                                <Trash2 size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: "1.5rem", textAlign: "right", paddingBottom: "1rem" }}>
                        <button
                            onClick={saveBulkInventory}
                            disabled={isLoading}
                            style={{
                                background: "var(--color-primary)", color: "white", border: "none", padding: "0.75rem 1.5rem", borderRadius: "8px",
                                display: "inline-flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "1rem", cursor: isLoading ? "not-allowed" : "pointer",
                                boxShadow: "0 4px 10px rgba(34, 197, 94, 0.2)"
                            }}
                        >
                            {isLoading ? <RefreshCw className="spin" size={18} /> : <Save size={18} />}
                            Confirmar y Sumar Inventario
                        </button>
                    </div>
                </div>
            )}

            {/* ---------------- SINGLE SCAN MODE ---------------- */}
            {(!scannedProduct && !isLoading && !invoiceItems && !isUploading) && (
                <div style={{ background: "white", borderRadius: "20px", padding: "4rem 2rem", textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.03)", border: "1px solid #f1f5f9" }}>
                    <div style={{ display: "inline-flex", background: "#f8fafc", padding: "2rem", borderRadius: "50%", marginBottom: "1.5rem" }}>
                        <Hand size={64} color="#cbd5e1" />
                    </div>
                    <h2 style={{ margin: 0, color: "#cbd5e1", fontWeight: 700 }}>Esperando lectura del escáner...</h2>

                    <div style={{ marginTop: "3rem", paddingTop: "2rem", borderTop: "2px dashed #e2e8f0", maxWidth: "400px", marginInline: "auto" }}>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#64748b", fontSize: "0.9rem", textAlign: "left" }}>¿No tienes el lector? Búscalo manualmente por código:</label>
                        <form onSubmit={handleManualSubmit} style={{ display: "flex", gap: "0.5rem" }}>
                            <input
                                ref={manualInputRef}
                                type="text"
                                placeholder="Ingresa código de barras..."
                                value={manualBarcode}
                                onChange={(e) => setManualBarcode(e.target.value)}
                                style={{ flex: 1, padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", fontSize: "1rem", fontWeight: 600 }}
                            />
                            <button type="submit" style={{ background: "#0f172a", color: "white", border: "none", borderRadius: "10px", padding: "0 1rem", cursor: "pointer", fontWeight: 600 }}>
                                Buscar
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {isLoading && !scannedProduct && !invoiceItems && !isUploading && (
                <div style={{ textAlign: "center", padding: "3rem", background: "white", borderRadius: "20px", border: "1px solid #f1f5f9" }}>
                    <RefreshCw size={40} color="var(--color-primary)" className="spin" />
                    <h3 style={{ marginTop: "1rem", color: "#64748b" }}>Buscando producto...</h3>
                </div>
            )}

            {scannedProduct && (
                <div style={{ background: "white", borderRadius: "20px", padding: "2rem", boxShadow: "0 10px 30px rgba(0,0,0,0.03)", border: "1px solid #f1f5f9", animation: "fadeIn 0.3s ease-out" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
                        <div>
                            <span style={{ display: "inline-block", background: "#f1f5f9", color: "#475569", padding: "0.25rem 0.5rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                                CÓDIGO: {scannedProduct.barcode || 'N/A'}
                            </span>
                            <h2 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800, color: "#0f172a" }}>{scannedProduct.name}</h2>
                            <p style={{ margin: "0.25rem 0 0", color: "#64748b", fontWeight: 500 }}>{scannedProduct.category}</p>
                        </div>
                        <button onClick={resetState} style={{ background: "transparent", border: "1px solid #e2e8f0", color: "#64748b", padding: "0.5rem 1rem", borderRadius: "8px", cursor: "pointer", fontWeight: 600, transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#f1f5f9"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                            Cancelar
                        </button>
                    </div>

                    <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "2rem", background: "#f8fafc", padding: "1.5rem", borderRadius: "16px" }}>
                        <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontWeight: 600, color: "#64748b", fontSize: "0.9rem" }}>Stock Actual en Bodega</p>
                            <h3 style={{ margin: 0, fontSize: "2rem", fontWeight: 800, color: "#334155" }}>{scannedProduct.stock}</h3>
                        </div>
                        <ArrowRight size={32} color="#cbd5e1" />
                        <div style={{ flex: 1, textAlign: "right" }}>
                            <p style={{ margin: 0, fontWeight: 600, color: "#64748b", fontSize: "0.9rem" }}>Proyección de Stock</p>
                            <h3 style={{ margin: 0, fontSize: "2rem", fontWeight: 800, color: "var(--color-primary)" }}>
                                {scannedProduct.stock + (parseInt(qtyToAdd, 10) || 0)}
                            </h3>
                        </div>
                    </div>

                    <form onSubmit={handleSaveSingleStock} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                        <div>
                            <label style={{ display: "block", marginBottom: "0.75rem", fontWeight: 700, color: "#0f172a", fontSize: "1.1rem" }}>¿Cuántas unidades nuevas vas a ingresar?</label>
                            <input
                                ref={qtyInputRef}
                                type="number"
                                min="1"
                                placeholder="Ej: 12"
                                value={qtyToAdd}
                                onChange={(e) => setQtyToAdd(e.target.value)}
                                style={{
                                    width: "100%", padding: "1.5rem", fontSize: "2rem", fontWeight: 900,
                                    background: "white", border: "2px solid var(--color-primary)", borderRadius: "16px", boxSizing: "border-box",
                                    color: "var(--color-primary)", outline: "none", textAlign: "center", boxShadow: "0 0 0 4px rgba(34, 197, 94, 0.1)"
                                }}
                            />
                            <p style={{ margin: "0.5rem 0 0", color: "#94a3b8", fontSize: "0.9rem", textAlign: "center", fontWeight: 500 }}>
                                Escribe la cantidad y presiona <strong>ENTER</strong> para guardar
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={!qtyToAdd || parseInt(qtyToAdd, 10) <= 0 || isLoading}
                            style={{
                                width: "100%", padding: "1.5rem", borderRadius: "16px", border: "none",
                                background: (!qtyToAdd || parseInt(qtyToAdd, 10) <= 0) ? "#cbd5e1" : "var(--color-primary)",
                                color: "white", fontWeight: 800, fontSize: "1.2rem",
                                cursor: (!qtyToAdd || parseInt(qtyToAdd, 10) <= 0) ? "not-allowed" : "pointer",
                                display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem",
                                boxShadow: (!qtyToAdd || parseInt(qtyToAdd, 10) <= 0) ? "none" : "0 8px 20px rgba(34, 197, 94, 0.3)", transition: "all 0.2s"
                            }}
                        >
                            {isLoading ? <RefreshCw className="spin" /> : <><CheckCircle size={24} /> Guardar Ingreso</>}
                        </button>
                    </form>
                </div>
            )}

            {/* AI Excel Upload Modal */}
            {isExcelModalOpen && (
                <div style={{
                    position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)",
                    display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100, padding: "2rem"
                }}>
                    <div style={{
                        background: "white", width: "100%", maxWidth: "800px", maxHeight: "90vh", borderRadius: "24px", padding: "2.5rem",
                        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", position: "relative", display: "flex", flexDirection: "column"
                    }}>
                        <button onClick={() => { setIsExcelModalOpen(false); setAiPreviewItems(null); }} style={{
                            position: "absolute", top: "1.5rem", right: "1.5rem", background: "#f1f5f9", border: "none",
                            width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", color: "#64748b"
                        }}>✕</button>

                        <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>Importación Inicial con IA</h2>

                        {!aiPreviewItems ? (
                            <>
                                <p style={{ color: "#64748b", fontSize: "0.95rem", marginBottom: "2rem" }}>
                                    Sube tu Excel o CSV antiguo. Nuestra Inteligencia Artificial leerá la tabla, deducirá cuáles son los códigos, nombres y precios, y creará las categorías automáticamente.
                                </p>

                                {excelError && <div style={{ background: "#fef2f2", color: "#dc2626", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", fontWeight: 600 }}>{excelError}</div>}

                                <div
                                    onClick={() => excelFileInputRef.current?.click()}
                                    style={{
                                        border: "2px dashed #cbd5e1", borderRadius: "16px", padding: "4rem 2rem", textAlign: "center", cursor: "pointer",
                                        background: "#f8fafc", transition: "all 0.2s"
                                    }}
                                >
                                    {isProcessingExcel ? (
                                        <>
                                            <RefreshCw size={48} color="var(--color-primary)" className="spin" style={{ margin: "0 auto 1rem" }} />
                                            <h3 style={{ margin: 0, color: "#0f172a" }}>Analizando Documento...</h3>
                                            <p style={{ margin: "0.5rem 0 0", color: "#64748b" }}>Gemini está leyendo tu inventario. Esto tomará unos segundos.</p>
                                        </>
                                    ) : (
                                        <>
                                            <PackageOpen size={48} color="#94a3b8" style={{ margin: "0 auto 1rem" }} />
                                            <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.2rem" }}>Haz clic para subir archivo</h3>
                                            <p style={{ margin: "0.5rem 0 0", color: "#64748b" }}>Soporta .xlsx, .xls y .csv (Máx 150 filas por carga inicial)</p>
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                                <p style={{ color: "#0f172a", fontSize: "0.95rem", marginBottom: "1rem", fontWeight: 600 }}>
                                    ¡Listo! Gemini detectó <strong style={{ color: "var(--color-primary)" }}>{aiPreviewItems.length}</strong> productos. Revisa que estén correctos antes de guardarlos.
                                </p>

                                {excelError && <div style={{ background: "#fef2f2", color: "#dc2626", padding: "0.75rem", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.9rem", fontWeight: 600 }}>{excelError}</div>}
                                {excelSuccess && <div style={{ background: "#f0fdf4", color: "#16a34a", padding: "0.75rem", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.9rem", fontWeight: 700, display: "flex", gap: "0.5rem" }}><CheckCircle size={18} /> {excelSuccess}</div>}

                                <div style={{ overflowY: "auto", flex: 1, border: "1px solid #e2e8f0", borderRadius: "12px" }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                                        <thead style={{ background: "#f8fafc", position: "sticky", top: 0, zIndex: 1 }}>
                                            <tr>
                                                <th style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>#</th>
                                                <th style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>Producto</th>
                                                <th style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>Categoría (IA)</th>
                                                <th style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>P. Venta</th>
                                                <th style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>Stock</th>
                                                <th style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {aiPreviewItems.map((item, idx) => (
                                                <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                    <td style={{ padding: "0.75rem 1rem", color: "#94a3b8" }}>{item.barcode || '-'}</td>
                                                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#0f172a" }}>{item.name}</td>
                                                    <td style={{ padding: "0.75rem 1rem" }}>
                                                        <span style={{ background: "#e0f2fe", color: "#0284c7", padding: "0.2rem 0.5rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600 }}>{item.category_name}</span>
                                                    </td>
                                                    <td style={{ padding: "0.75rem 1rem", color: "#16a34a", fontWeight: 600 }}>${item.price}</td>
                                                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>{item.stock}</td>
                                                    <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                                                        <button onClick={() => removePreviewItem(idx)} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "0.25rem" }} title="Descartar este item">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {aiPreviewItems.length === 0 && (
                                                <tr>
                                                    <td colSpan="6" style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>No hay productos en la lista.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                                    <button
                                        onClick={() => setAiPreviewItems(null)}
                                        style={{ background: "#f1f5f9", color: "#64748b", border: "none", padding: "0.75rem 1.5rem", borderRadius: "12px", fontWeight: 600, cursor: "pointer" }}
                                    >
                                        Subir otro archivo
                                    </button>
                                    <button
                                        onClick={confirmAIExcelImport}
                                        disabled={isProcessingExcel || aiPreviewItems.length === 0 || excelSuccess}
                                        style={{ background: excelSuccess ? "#16a34a" : "var(--color-primary)", color: "white", border: "none", padding: "0.75rem 1.5rem", borderRadius: "12px", fontWeight: 700, cursor: (isProcessingExcel || aiPreviewItems.length === 0 || excelSuccess) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}
                                    >
                                        {isProcessingExcel ? <RefreshCw className="spin" size={18} /> : (excelSuccess ? <CheckCircle size={18} /> : <Save size={18} />)}
                                        {isProcessingExcel ? "Guardando..." : (excelSuccess ? "Completado" : "Confirmar e Insertar")}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};
