import React, { useEffect, useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { CheckoutModal } from "../components/CheckoutModal";
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard } from "lucide-react";

export const Home = () => {
	const [products, setProducts] = useState([]);
	const [categories, setCategories] = useState([]);
	const [selectedCategory, setSelectedCategory] = useState("Todos");
	const [cart, setCart] = useState([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [isModalOpen, setIsModalOpen] = useState(false);

	useEffect(() => {
		fetchProducts();
	}, []);

	const fetchProducts = async () => {
		try {
			const backendUrl = import.meta.env.VITE_BACKEND_URL;
			const res = await fetch(`${backendUrl}/api/products`);
			if (res.ok) {
				const data = await res.json();
				setProducts(data);
				const cats = ["Todos", ...new Set(data.map(p => p.category).filter(Boolean))];
				setCategories(cats);
			}
		} catch (error) {
			console.error("Error fetching products:", error);
		}
	};

	const currentProducts = products.filter(p => {
		const matchesCategory = selectedCategory === "Todos" || p.category === selectedCategory;
		const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
		return matchesCategory && matchesSearch;
	});

	const handleAddToCart = (product) => {
		setCart((prev) => {
			const existing = prev.find((item) => item.id === product.id);
			if (existing) {
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

	const handleConfirmCheckout = async () => {
		try {
			const backendUrl = import.meta.env.VITE_BACKEND_URL;
			const orderData = {
				items: cart.map(({ id, quantity }) => ({ product_id: id, quantity }))
			};
			const res = await fetch(`${backendUrl}/api/orders`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(orderData),
			});
			if (res.ok) {
				alert("¡Pago exitoso! Orden registrada.");
				setCart([]);
				setIsModalOpen(false);
			} else {
				alert("Error al procesar la orden.");
			}
		} catch (error) {
			console.error("Error checkout:", error);
			alert("Error de conexión al procesar el pago.");
		}
	};

	const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
	const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

	return (
		<div className="pos-layout">
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
						<span style={{ fontWeight: 700, color: "var(--color-text-main)" }}>GreenMart POS</span>
						<span>·</span>
						<span>Cajero: Admin</span>
					</div>
				</div>

				{/* Category Pills */}
				<div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
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
					alignItems: "start",
					alignContent: "start",
				}}>
					{currentProducts.length > 0 ? currentProducts.map((product) => (
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
					)) : (
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
								display: "flex", alignItems: "center", gap: "0.75rem",
								padding: "0.75rem", background: "#F8FAFC", borderRadius: "12px"
							}}>
								<img
									src={item.image_url || `https://ui-avatars.com/api/?name=${item.name}&background=E8F8F5&color=2ECC71&size=56`}
									alt={item.name}
									style={{ width: "44px", height: "44px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }}
								/>
								<div style={{ flex: 1, minWidth: 0 }}>
									<p style={{ fontSize: "0.9rem", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</p>
									<p style={{ fontSize: "0.8rem", color: "var(--color-primary)", fontWeight: "700" }}>${item.price.toLocaleString("es-CL")}</p>
								</div>
								<div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
									<button onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} style={{ width: "26px", height: "26px", borderRadius: "7px", border: "1px solid var(--border-color)", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
										<Minus size={13} />
									</button>
									<span style={{ fontWeight: "700", minWidth: "20px", textAlign: "center", fontSize: "0.95rem" }}>{item.quantity}</span>
									<button onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)} style={{ width: "26px", height: "26px", borderRadius: "7px", border: "1px solid var(--border-color)", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
										<Plus size={13} />
									</button>
									<button onClick={() => handleRemoveFromCart(item.id)} style={{ width: "26px", height: "26px", borderRadius: "7px", border: "none", background: "#FEE2E2", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-danger)" }}>
										<Trash2 size={13} />
									</button>
								</div>
								<p style={{ fontWeight: "700", fontSize: "0.9rem", minWidth: "60px", textAlign: "right" }}>${(item.price * item.quantity).toLocaleString("es-CL")}</p>
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
		</div>
	);
};