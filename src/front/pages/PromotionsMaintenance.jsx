import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Search, Save, Package, Printer, Copy, ArrowLeft } from "lucide-react";
import Barcode from "react-barcode";
import { useAuth } from "../context/AuthContext";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";

export const PromotionsMaintenance = () => {
    const { token, businessId } = useAuth();
    const [products, setProducts] = useState([]);
    const [promotions, setPromotions] = useState([]);

    const [promoName, setPromoName] = useState("");
    const [promoPrice, setPromoPrice] = useState("");
    const [promoBarcode, setPromoBarcode] = useState("");
    const [promoItems, setPromoItems] = useState([]); // { product_id, quantity, name, price }

    // Search State
    const [searchTerm, setSearchTerm] = useState("");
    const searchInputRef = useRef(null);

    const generateRandomBarcode = () => {
        // Generates a random 13 digit number starting with 9
        const ran = "9" + Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
        setPromoBarcode(ran);
    };

    useEffect(() => {
        if (businessId && token) {
            fetchProducts();
            fetchPromotions();
            generateRandomBarcode();
        }
    }, [businessId, token]);

    const fetchProducts = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/products?business_id=${businessId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            }
        } catch (error) {
            console.error("Error fetching products", error);
        }
    };

    const fetchPromotions = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/promotions?business_id=${businessId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // We map them because they come back disguised as products for the POS
                setPromotions(data);
            }
        } catch (error) {
            console.error("Error fetching promos", error);
        }
    };

    const handleBarcodeScanned = (code) => {
        // If focusing search or scanning implicitly
        if (document.activeElement === searchInputRef.current || !document.activeElement.tagName.match(/INPUT|TEXTAREA/i)) {
            // Let's assume they are scanning the new barcode for the package:
            setPromoBarcode(code);
        }
    };

    useBarcodeScanner(handleBarcodeScanned);

    const handleAddProductToPromo = (product) => {
        setPromoItems(prev => {
            const existing = prev.find(item => item.product_id === product.id);
            if (existing) {
                return prev.map(item => item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            } else {
                return [...prev, { product_id: product.id, quantity: 1, name: product.name, price: product.price }];
            }
        });
        setSearchTerm("");
        if (searchInputRef.current) searchInputRef.current.focus();
    };

    const handleRemoveItem = (productId) => {
        setPromoItems(prev => prev.filter(item => item.product_id !== productId));
    };

    const handleUpdateItemQuantity = (productId, delta) => {
        setPromoItems(prev => prev.map(item => {
            if (item.product_id === productId) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : item;
            }
            return item;
        }));
    };

    const handleSavePromotion = async (e) => {
        e.preventDefault();

        if (!promoName.trim() || !promoPrice || promoItems.length === 0) {
            alert("Por favor completa el nombre, precio y agrega al menos un producto.");
            return;
        }

        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/promotions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: promoName.trim(),
                    price: parseFloat(promoPrice),
                    barcode: promoBarcode,
                    items: promoItems.map(i => ({ product_id: i.product_id, quantity: i.quantity }))
                })
            });

            if (res.ok) {
                alert("Promoción guardada exitosamente");
                setPromoName("");
                setPromoPrice("");
                generateRandomBarcode();
                setPromoItems([]);
                fetchPromotions();
            } else {
                const err = await res.json();
                alert(err.msg || "Error al crear la promoción");
            }
        } catch (error) {
            console.error("Error saving promotion:", error);
            alert("Error de conexión");
        }
    };

    const handleDeletePromotion = async (promoVirtualId) => {
        // ID comes as promo_XX
        const realId = promoVirtualId.replace('promo_', '');

        if (!window.confirm("¿Seguro que deseas eliminar este pack promocional?")) return;

        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/promotions/${realId}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                fetchPromotions();
            } else {
                alert("No se pudo eliminar la promoción");
            }
        } catch (error) {
            console.error("Error deleting promotion", error);
        }
    };

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.barcode && p.barcode.includes(searchTerm)));

    const handlePrintBarcode = (promo) => {
        if (!promo.barcode) return;
        const printWindow = window.open('', '_blank');
        const svgElement = document.getElementById(`barcode-wrapper-${promo.id}`);

        if (svgElement) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Imprimir - ${promo.name}</title>
                        <style>
                            @page { margin: 0; }
                            body { 
                                display: flex; flex-direction: column; align-items: center; justify-content: flex-start; 
                                font-family: sans-serif; padding-top: 20px; 
                            }
                            h2 { margin: 0 0 10px 0; font-size: 16px; text-align: center; }
                            .barcode-container svg { width: auto; max-width: 100%; height: auto; }
                        </style>
                    </head>
                    <body>
                        <h2>${promo.name}</h2>
                        <div class="barcode-container">${svgElement.innerHTML}</div>
                        <script>
                            setTimeout(() => {
                                window.print();
                                window.close();
                            }, 300);
                        </script>
                    </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    return (
        <div style={{ position: "fixed", inset: 0, overflowY: "auto", background: "#f1f5f9", fontFamily: "Inter, sans-serif", zIndex: 100 }}>
            {/* Header */}
            <header style={{
                background: "white", borderBottom: "1px solid #e2e8f0",
                padding: "1rem 2rem", display: "flex", alignItems: "center", gap: "1rem",
                position: "sticky", top: 0, zIndex: 10
            }}>
                <Link to="/" style={{ color: "#64748b", display: "flex", alignItems: "center", textDecoration: "none" }}>
                    <ArrowLeft size={20} />
                </Link>
                <Package size={22} color="#8b5cf6" />
                <h1 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>
                    Gestión de Promociones
                </h1>
            </header>

            <main style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto", display: "flex", gap: "2rem" }}>

            {/* Left Side: Create Promo Form */}
            <div style={{ flex: "1", background: "white", padding: "2rem", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Package size={24} color="var(--color-primary)" />
                    Crear Nuevo Pack / Promoción
                </h2>

                <form onSubmit={handleSavePromotion}>
                    <div style={{ marginBottom: "1rem" }}>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.9rem" }}>Nombre del Pack</label>
                        <input
                            type="text"
                            required
                            value={promoName}
                            onChange={(e) => setPromoName(e.target.value)}
                            placeholder="Ej: Pack Año Nuevo (2 Pisco + 1 Bebida)"
                            style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)", fontSize: "1rem" }}
                        />
                    </div>

                    <div style={{ marginBottom: "1rem" }}>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.9rem" }}>Precio del Pack ($)</label>
                        <input
                            type="number"
                            required
                            min="0"
                            value={promoPrice}
                            onChange={(e) => setPromoPrice(e.target.value)}
                            placeholder="Precio oferta"
                            style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)", fontSize: "1rem" }}
                        />
                    </div>

                    {/* Product Search */}
                    <div style={{ marginTop: "2rem", borderTop: "1px solid var(--border-color)", paddingTop: "1.5rem" }}>
                        <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1rem" }}>Agrega Productos al Pack</h3>

                        <div style={{ position: "relative", marginBottom: "1rem" }}>
                            <Search size={20} color="#94A3B8" style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)" }} />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Buscar producto por nombre..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: "100%", padding: "0.75rem 1rem 0.75rem 3rem", borderRadius: "8px", border: "1px solid var(--border-color)", fontSize: "1rem" }}
                            />
                        </div>

                        {/* Search Results Dropdown-ish inline */}
                        {searchTerm && (
                            <div style={{ border: "1px solid var(--border-color)", borderRadius: "8px", maxHeight: "150px", overflowY: "auto", marginBottom: "1rem" }}>
                                {filteredProducts.map(product => (
                                    <div
                                        key={product.id}
                                        onClick={() => handleAddProductToPromo(product)}
                                        style={{ padding: "0.75rem", borderBottom: "1px solid #f1f5f9", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                                    >
                                        <span>{product.name}</span>
                                        <span style={{ color: "var(--color-primary)", fontWeight: "600" }}>${product.price}</span>
                                    </div>
                                ))}
                                {filteredProducts.length === 0 && <div style={{ padding: "0.75rem", color: "#64748b" }}>No se encontraron productos</div>}
                            </div>
                        )}

                        {/* Selected Items List */}
                        <div style={{ background: "#F8FAFC", borderRadius: "8px", padding: "1rem" }}>
                            {promoItems.length === 0 ? (
                                <p style={{ textAlign: "center", color: "#64748b", margin: 0, fontSize: "0.9rem" }}>No hay productos en esta promo aún.</p>
                            ) : (
                                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                    {promoItems.map(item => (
                                        <li key={item.product_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem", background: "white", padding: "0.5rem 1rem", borderRadius: "6px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                                            <span style={{ fontWeight: "500", flex: 1 }}>{item.name}</span>

                                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                <button type="button" onClick={() => handleUpdateItemQuantity(item.product_id, -1)} style={{ width: "24px", height: "24px", borderRadius: "4px", border: "1px solid #e2e8f0", background: "white", cursor: "pointer" }}>-</button>
                                                <span style={{ width: "20px", textAlign: "center", fontWeight: "600" }}>{item.quantity}</span>
                                                <button type="button" onClick={() => handleUpdateItemQuantity(item.product_id, 1)} style={{ width: "24px", height: "24px", borderRadius: "4px", border: "1px solid #e2e8f0", background: "white", cursor: "pointer" }}>+</button>
                                            </div>

                                            <button type="button" onClick={() => handleRemoveItem(item.product_id)} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", marginLeft: "1rem" }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Sum visualization */}
                    {promoItems.length > 0 && (
                        <div style={{ marginTop: "1rem", textAlign: "right", fontSize: "0.9rem", color: "#64748b" }}>
                            Valor individual sumado: <span style={{ textDecoration: "line-through" }}>${promoItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0).toLocaleString()}</span>
                        </div>
                    )}

                    <button type="submit" style={{ marginTop: "1.5rem", width: "100%", padding: "1rem", background: "var(--color-primary)", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", fontSize: "1rem", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}>
                        <Save size={20} />
                        Guardar Promoción
                    </button>
                </form>
            </div>

            {/* Right Side: List of Active Promos */}
            <div style={{ flex: "1", background: "white", padding: "2rem", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem" }}>Packs Activos</h2>

                {promotions.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
                        <Package size={48} style={{ opacity: 0.5, marginBottom: "1rem" }} />
                        <p>No tienes promociones activas.</p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {promotions.map((promo) => (
                            <div key={promo.id} style={{ border: "1px solid var(--border-color)", padding: "1rem", borderRadius: "12px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", color: "var(--color-text-main)" }}>{promo.name}</h4>
                                        <span style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--color-primary)" }}>${promo.price.toLocaleString("es-CL")}</span>
                                    </div>
                                    <div style={{ display: "flex", gap: "0.5rem" }}>
                                        <button onClick={() => handleDeletePromotion(promo.id)} title="Eliminar Pack" style={{ background: "#fee2e2", border: "none", width: "32px", height: "32px", borderRadius: "8px", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>


                                <div style={{ fontSize: "0.85rem", color: "#64748b", background: "#f8fafc", padding: "0.5rem", borderRadius: "6px" }}>
                                    <strong>Contenido:</strong>
                                    <ul style={{ margin: "0.25rem 0 0 1rem", padding: 0 }}>
                                        {promo.items.map((item, idx) => (
                                            <li key={idx}>{item.quantity}x {item.product ? item.product.name : "Producto Eliminado"}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            </main>
        </div>
    );
};
