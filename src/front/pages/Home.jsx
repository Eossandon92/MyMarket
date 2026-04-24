import React, { useEffect, useState, useCallback } from "react";
import { Sidebar } from "../components/Sidebar";
import { CheckoutModal } from "../components/CheckoutModal";
import { ReceiptModal } from "../components/ReceiptModal";
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Scan } from "lucide-react";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import { useAuth } from "../context/AuthContext";
import { useInventory } from "../context/InventoryContext";
import { NotificationBell } from "../components/NotificationBell";

export const Home = () => {
	const { businessId, businessName, token, user } = useAuth();
	const { products, isLoading, categories: rawCategories } = useInventory();
	const [selectedCategory, setSelectedCategory] = useState("Todos");
	const [cart, setCart] = useState([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [receiptData, setReceiptData] = useState(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [scanToast, setScanToast] = useState(null); // { msg, type: 'success'|'error' }

	// Calculate display categories (including "Todos")
	const categories = ["Todos", ...new Set(products.map(p => p.category).filter(Boolean))];

	// Barcode scanner — sempre activo en el POS
	const showToast = useCallback((msg, type = "success") => {
		setScanToast({ msg, type });
		setTimeout(() => setScanToast(null), 2500);
	}, []);

	const handleBarcodeScan = useCallback((code) => {
		if (!products || products.length === 0) return;

		// Look up in the already loaded catalog (handling both products and promotions)
		const foundItem = products.find(p => p.barcode && p.barcode.toString().trim() === code.toString().trim());

		if (foundItem) {
			handleAddToCart(foundItem);
			showToast(`✅ ${foundItem.name} agregado al carrito`, "success");
		} else {
			showToast(`❌ Código no encontrado: ${code}`, "error");
		}
	}, [products, showToast]);
	// El escáner está siempre activo en la pantalla del POS
	useBarcodeScanner(handleBarcodeScan, { enabled: true });

	const currentProducts = products.filter(p => {
		const matchesCategory = selectedCategory === "Todos" || p.category === selectedCategory;
		const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
		return matchesCategory && matchesSearch;
	});

	const handleAddToCart = (product) => {
		if (!product.price || Number(product.price) <= 0) {
			showToast(`❌ El producto "${product.name}" no tiene precio.`, "error");
			return;
		}

		const existing = cart.find((item) => item.id === product.id);
		const currentQty = existing ? existing.quantity : 0;

		// Promos might not have a stock field directly or it's handled differently, check if stock exists
		if (product.stock !== undefined && product.stock !== null && currentQty >= product.stock) {
			showToast(`❌ Sin stock suficiente para "${product.name}".`, "error");
			return;
		}

		setCart((prev) => {
			const existingPrev = prev.find((item) => item.id === product.id);
			if (existingPrev) {
				return prev.map((item) =>
					item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
				);
			}
			return [...prev, { ...product, quantity: 1 }];
		});
	};

	const handleUpdateQuantity = (id, newQty) => {
		if (newQty < 1) {
			setCart((prev) => prev.filter((item) => item.id !== id));
			return;
		}

		const productInView = products.find(p => p.id === id);
		if (productInView && productInView.stock !== undefined && productInView.stock !== null && newQty > productInView.stock) {
			showToast(`❌ Límite de stock alcanzado para "${productInView.name}".`, "error");
			return;
		}

		setCart((prev) =>
			prev.map((item) => (item.id === id ? { ...item, quantity: newQty } : item))
		);
	};

	const handleRemoveFromCart = (id) => {
		setCart((prev) => prev.filter((item) => item.id !== id));
	};

	const handleOpenModal = () => {
		if (cart.length > 0) setIsModalOpen(true);
	};

	const handleConfirmCheckout = async (method, cashReceived = 0) => {
		try {
			if (!businessId || !token || !user) return;
			setIsProcessing(true);
			const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
			const orderData = {
				business_id: businessId,
				user_id: user.id,
				payment_method: method,
				items: cart.map(item => ({
					product_id: item.is_promotion ? null : item.id,
					is_promotion: item.is_promotion || false,
					real_promo_id: item.real_promo_id || null,
					quantity: item.quantity
				}))
			};
			const res = await fetch(`${backendUrl}/api/orders`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${token}`
				},
				body: JSON.stringify(orderData),
			});
			if (res.ok) {
				const createdOrder = await res.json();
				setReceiptData({
					order: createdOrder,
					cart: [...cart],
					paymentMethod: method,
					cashReceived: cashReceived,
				});
				setIsModalOpen(false);
			} else {
				const errData = await res.json().catch(() => ({}));
				alert(errData.msg || "Error al procesar la orden.");
			}
		} catch (error) {
			console.error("Error checkout:", error);
			alert("Error de conexión al procesar el pago.");
		} finally {
			setIsProcessing(false);
		}
	};

	const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
	const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

	return (
		<div className="pos-layout">
			{/* Toast de feedback del scanner */}
			{scanToast && (
				<div style={{
					position: "fixed",
					top: "1.25rem",
					left: "50%",
					transform: "translateX(-50%)",
					zIndex: 9999,
					background: scanToast.type === "success" ? "#22c55e" : "#ef4444",
					color: "white",
					padding: "0.75rem 1.5rem",
					borderRadius: "12px",
					fontWeight: "700",
					fontSize: "1rem",
					boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
					display: "flex",
					alignItems: "center",
					gap: "0.5rem",
					animation: "fadeInDown 0.2s ease"
				}}>
					<Scan size={18} />
					{scanToast.msg}
				</div>
			)}
			{/* Left Sidebar - Navigation */}
			<Sidebar
				categories={categories}
				selectedCategory={selectedCategory}
				onSelectCategory={setSelectedCategory}
			/>

			{/* Center - Product Catalog */}
			<main className="pos-main" style={{ padding: "1.5rem", gap: "1rem", flex: 1 }}>
				{/* Search Header */}
				<div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
					<div className="search-bar" style={{ flex: 1, maxWidth: "none" }}>
						<Search size={18} />
						<input
							type="text"
							placeholder="Buscar productos por nombre..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
					<div style={{
						display: "flex", alignItems: "center", gap: "0.5rem",
						background: "white", borderRadius: "12px", padding: "0.75rem 1.25rem",
						boxShadow: "var(--shadow-sm)", fontSize: "0.9rem", color: "var(--color-text-muted)"
					}}>
						<span style={{ fontWeight: 700, color: "var(--color-text-main)" }}>{businessName} POS</span>
						<span>·</span>
						<span style={{ marginRight: "0.5rem" }}>Cajero: {user?.name || 'Admin'}</span>
						<NotificationBell />
					</div>
				</div>

				{/* Category Pills */}
				<div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.5rem", marginBottom: "0.5rem" }}>
					{categories.map((cat, idx) => (
						<button
							key={idx}
							onClick={() => setSelectedCategory(cat)}
							style={{
								whiteSpace: "nowrap",
								padding: "0.6rem 1.25rem",
								borderRadius: "100px",
								border: "none",
								fontFamily: "var(--font-family-base)",
								fontSize: "0.95rem",
								fontWeight: selectedCategory === cat ? "700" : "500",
								cursor: "pointer",
								transition: "all 0.2s",
								backgroundColor: selectedCategory === cat ? "var(--color-primary)" : "white",
								color: selectedCategory === cat ? "white" : "var(--color-text-muted)",
								boxShadow: selectedCategory === cat
									? "0 4px 12px rgba(46, 204, 113, 0.35)"
									: "var(--shadow-sm)",
							}}
						>
							{cat}
						</button>
					))}
				</div>

				{/* Product Grid */}
				<div style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
					gap: "1rem",
					overflowY: "auto",
					flex: 1,
					alignContent: "start",
				}}>
					{isLoading ? (
						<div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "5rem 2rem" }}>
							<div className="zoko-loader-wrapper">
								<div className="zoko-loader-circle"></div>
								<div className="zoko-loader-circle"></div>
								<div className="zoko-loader-circle"></div>
								<div className="zoko-loader-shadow"></div>
								<div className="zoko-loader-shadow"></div>
								<div className="zoko-loader-shadow"></div>
							</div>
							<p style={{ marginTop: "1.5rem", color: "#64748b", fontWeight: "600" }}>Cargando productos...</p>
						</div>
					) : currentProducts.length > 0 ? (
						currentProducts.map((product) => (
							<article
								key={product.id}
								onClick={() => handleAddToCart(product)}
								style={{
									background: "white",
									borderRadius: "var(--border-radius-md)",
									padding: "1rem",
									cursor: "pointer",
									border: "2px solid transparent",
									transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
									display: "flex",
									flexDirection: "column",
									boxShadow: "var(--shadow-sm)",
									minHeight: "255px",
									height: "100%",
								}}
								onMouseOver={(e) => {
									e.currentTarget.style.borderColor = "var(--color-primary)";
									e.currentTarget.style.transform = "translateY(-3px)";
									e.currentTarget.style.boxShadow = "var(--shadow-md)";
								}}
								onMouseOut={(e) => {
									e.currentTarget.style.borderColor = "transparent";
									e.currentTarget.style.transform = "translateY(0)";
									e.currentTarget.style.boxShadow = "var(--shadow-sm)";
								}}
							>
								<div style={{
									height: "110px",
									background: "#F8FAFC",
									borderRadius: "var(--border-radius-sm)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									marginBottom: "0.75rem",
									overflow: "hidden"
								}}>
									<img
										src={product.image_url || `https://ui-avatars.com/api/?name=${product.name}&background=E8F8F5&color=2ECC71&size=120`}
										alt={product.name}
										style={{ width: "100%", height: "100%", objectFit: "contain" }}
									/>
								</div>
								<p style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--color-text-main)", marginBottom: "0.25rem", lineHeight: "1.3" }}>{product.name}</p>
								<p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>{product.category}</p>
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
									<span style={{ fontWeight: "800", fontSize: "1.05rem", color: "var(--color-text-main)" }}>
										${product.price.toLocaleString("es-CL")}
									</span>
									<div style={{
										width: "28px", height: "28px", borderRadius: "8px",
										backgroundColor: "var(--color-primary)", display: "flex",
										alignItems: "center", justifyContent: "center",
										boxShadow: "0 2px 8px rgba(46, 204, 113, 0.4)"
									}}>
										<Plus size={16} color="white" />
									</div>
								</div>
							</article>
						))
					) : (
						<div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "4rem", color: "var(--color-text-muted)" }}>
							<ShoppingCart size={48} style={{ opacity: 0.3, marginBottom: "1rem" }} />
							<p style={{ fontSize: "1.1rem" }}>No hay productos en esta categoría.</p>
						</div>
					)}
				</div>
			</main>

			{/* Right Panel - Order + Numpad */}
			<aside style={{
				width: "380px",
				minWidth: "380px",
				backgroundColor: "white",
				display: "flex",
				flexDirection: "column",
				borderLeft: "1px solid var(--border-color)",
			}}>
				{/* Order Header */}
				<div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border-color)" }}>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
						<h2 style={{ fontSize: "1.25rem", margin: 0 }}>Orden Actual</h2>
						{cart.length > 0 && (
							<button
								onClick={() => setCart([])}
								style={{ background: "none", border: "none", color: "var(--color-danger)", cursor: "pointer", fontFamily: "inherit", fontSize: "0.9rem", fontWeight: "600" }}
							>
								Limpiar
							</button>
						)}
					</div>
				</div>

				{/* Order Items */}
				<div style={{ flex: 1, overflowY: "auto", padding: "0.75rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
					{cart.length === 0 ? (
						<div style={{ textAlign: "center", marginTop: "2rem", color: "var(--color-text-muted)" }}>
							<ShoppingCart size={40} style={{ opacity: 0.3, marginBottom: "0.75rem" }} />
							<p style={{ fontSize: "0.95rem" }}>El carrito está vacío</p>
						</div>
					) : (
						cart.map((item) => (
							<div key={item.id} style={{
								display: "flex", alignItems: "center", gap: "0.4rem",
								padding: "0.5rem", background: "#F8FAFC", borderRadius: "12px"
							}}>
								<img
									src={item.image_url || `https://ui-avatars.com/api/?name=${item.name}&background=E8F8F5&color=2ECC71&size=40`}
									alt={item.name}
									style={{ width: "40px", height: "40px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }}
								/>
								<div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
									<p style={{
										fontSize: "0.85rem", fontWeight: "600", color: "var(--color-text-main)",
										display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textOverflow: "ellipsis",
										lineHeight: "1.2", marginBottom: "0.2rem"
									}}>
										{item.name}
									</p>
									<p style={{ fontSize: "0.8rem", color: "var(--color-primary)", fontWeight: "700" }}>${item.price.toLocaleString("es-CL")}</p>
								</div>

								<div style={{ display: "flex", alignItems: "center", gap: "0.2rem", flexShrink: 0 }}>
									<button onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} style={{ width: "24px", height: "24px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
										<Minus size={12} />
									</button>
									<span style={{ fontWeight: "700", minWidth: "16px", textAlign: "center", fontSize: "0.9rem" }}>{item.quantity}</span>
									<button onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)} style={{ width: "24px", height: "24px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
										<Plus size={12} />
									</button>
									<button onClick={() => handleRemoveFromCart(item.id)} style={{ width: "24px", height: "24px", borderRadius: "6px", border: "none", background: "#FEE2E2", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-danger)", marginLeft: "0.1rem", padding: 0 }}>
										<Trash2 size={12} />
									</button>
								</div>

								<div style={{ fontWeight: "700", fontSize: "0.9rem", minWidth: "45px", textAlign: "right", flexShrink: 0 }}>
									${(item.price * item.quantity).toLocaleString("es-CL")}
								</div>
							</div>
						))
					)}
				</div>

				{/* Totals Summary */}
				<div style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--border-color)", background: "#FAFAFA" }}>
					<div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem", color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
						<span>Subtotal ({totalItems} items)</span>
						<span>${subtotal.toLocaleString("es-CL")}</span>
					</div>
					<div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
						<span>IVA (19%)</span>
						<span>${Math.round(subtotal * 0.19).toLocaleString("es-CL")}</span>
					</div>
					<div style={{ display: "flex", justifyContent: "space-between", paddingTop: "0.75rem", borderTop: "2px dashed var(--border-color)", fontWeight: "800", fontSize: "1.4rem" }}>
						<span>Total</span>
						<span style={{ color: "var(--color-primary)" }}>${subtotal.toLocaleString("es-CL")}</span>
					</div>
				</div>

				{/* Checkout Button */}
				<div style={{ padding: "1rem 1.5rem" }}>
					<button
						onClick={handleOpenModal}
						disabled={cart.length === 0}
						style={{
							width: "100%",
							padding: "1.1rem",
							background: cart.length > 0 ? "var(--color-primary)" : "#E2E8F0",
							color: cart.length > 0 ? "white" : "var(--color-text-muted)",
							border: "none",
							borderRadius: "var(--border-radius-md)",
							fontFamily: "var(--font-family-base)",
							fontSize: "1.1rem",
							fontWeight: "700",
							cursor: cart.length > 0 ? "pointer" : "not-allowed",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "0.5rem",
							boxShadow: cart.length > 0 ? "0 8px 20px rgba(46, 204, 113, 0.3)" : "none",
							transition: "all 0.2s",
						}}
					>
						<CreditCard size={20} />
						Cobrar ${subtotal.toLocaleString("es-CL")}
					</button>
				</div>
			</aside>

			{isModalOpen && (
				<CheckoutModal
					total={subtotal}
					onClose={() => setIsModalOpen(false)}
					onConfirm={handleConfirmCheckout}
				/>
			)}

			{receiptData && (
				<ReceiptModal
					order={receiptData.order}
					cart={receiptData.cart}
					paymentMethod={receiptData.paymentMethod}
					cashReceived={receiptData.cashReceived}
					business={user?.business}
					businessName={businessName}
					cashierName={user?.name}
					onClose={() => {
						setReceiptData(null);
						setCart([]);
					}}
				/>
			)}

			{/* Procesando Pago Overlay */}
			{isProcessing && (
				<div style={{
					position: "fixed", inset: 0, zIndex: 20000,
					background: "rgba(255, 255, 255, 0.9)",
					backdropFilter: "blur(5px)",
					display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
				}}>
					<div className="zoko-loader-wrapper">
						<div className="zoko-loader-circle"></div>
						<div className="zoko-loader-circle"></div>
						<div className="zoko-loader-circle"></div>
						<div className="zoko-loader-shadow"></div>
						<div className="zoko-loader-shadow"></div>
						<div className="zoko-loader-shadow"></div>
					</div>
					<h2 style={{ color: "#0f172a", fontWeight: 800, marginTop: "1rem" }}>Procesando Pago...</h2>
					<p style={{ color: "#64748b", fontWeight: 600 }}>Generando Boleta Electrónica SII</p>
				</div>
			)}
		</div>
	);
};