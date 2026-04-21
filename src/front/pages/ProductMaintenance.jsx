import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Edit2, Trash2, PlusCircle, Scan, Search } from "lucide-react";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import { useAuth, API } from "../context/AuthContext";

export const ProductMaintenance = () => {
  const { businessId, token } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [enlargedImage, setEnlargedImage] = useState(null);

  // Default empty form state
  const initialFormState = {
    name: "",
    price: "",
    category: "",
    stock: "",
    image_url: "",
    barcode: "",
    description: "",
    min_stock: 5,
    cost_price: ""
  };
  const [formData, setFormData] = useState(initialFormState);
  const [scannerFeedback, setScannerFeedback] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Fetch all products and categories when component mounts
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // Helper para limpiar nombres de categoría de Open Food Facts
  const cleanCategory = (tag) =>
    tag?.replace(/^(en:|es:|fr:)/, "").replace(/-/g, " ") || "";

  // Look up product info from external barcode APIs (en cadena, mayor cobertura)
  const lookupBarcodeInfo = async (code) => {
    // 1) Open Food Facts — alimentos/bebidas globales
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 1 && data.product) {
          const p = data.product;
          const name = p.product_name_es || p.product_name_en || p.product_name || p.abbreviated_product_name || "";
          // Intentar obtener gramaje: campo texto primero, luego campos numéricos estructurados
          const qty = p.quantity ||
            (p.product_quantity && p.product_quantity_unit
              ? `${p.product_quantity} ${p.product_quantity_unit}`
              : p.product_quantity ? String(p.product_quantity) : "");
          if (name) return {
            name,
            image_url: p.image_front_url || p.image_url || "",
            category: cleanCategory(p.categories_tags?.[0]),
            brand: p.brands || "",
            quantity: qty
          };
        }
      }
    } catch (_) { /* try next */ }

    // 2) Open Beauty Facts — cosméticos, higiene personal
    try {
      const res = await fetch(`https://world.openbeautyfacts.org/api/v0/product/${code}.json`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 1 && data.product) {
          const p = data.product;
          const name = p.product_name_es || p.product_name_en || p.product_name || "";
          if (name) return {
            name,
            image_url: p.image_front_url || p.image_url || "",
            category: cleanCategory(p.categories_tags?.[0]) || "Higiene y Belleza",
            brand: p.brands || "",
            quantity: p.quantity || ""
          };
        }
      }
    } catch (_) { /* try next */ }

    // 3) Open Products Facts — productos del hogar, limpieza, etc.
    try {
      const res = await fetch(`https://world.openproductsfacts.org/api/v0/product/${code}.json`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 1 && data.product) {
          const p = data.product;
          const name = p.product_name_es || p.product_name_en || p.product_name || "";
          if (name) return {
            name,
            image_url: p.image_front_url || p.image_url || "",
            category: cleanCategory(p.categories_tags?.[0]) || "Productos del Hogar",
            brand: p.brands || "",
            quantity: p.quantity || ""
          };
        }
      }
    } catch (_) { /* try next */ }

    // 4) Datakick — base abierta de productos variados
    try {
      const res = await fetch(`https://www.datakick.org/api/items/${code}`);
      if (res.ok) {
        const data = await res.json();
        const name = data.name || data.brand_name || "";
        if (name) return {
          name,
          image_url: data.images?.[0]?.url || "",
          category: data.category || "",
          brand: data.brand_name || "",
          quantity: data.size || ""
        };
      }
    } catch (_) { /* try next */ }

    // 5) UPC Item DB — retail general (100 req/día en plan trial)
    try {
      const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`);
      if (res.ok) {
        const data = await res.json();
        if (data.items?.length > 0) {
          const item = data.items[0];
          if (item.title) return {
            name: item.title,
            image_url: item.images?.[0] || "",
            category: item.category || "",
            brand: item.brand || "",
            quantity: item.size || item.weight || ""
          };
        }
      }
    } catch (_) { /* try next */ }

    // 6) go-upc.com API — cobertura global adicional
    try {
      const res = await fetch(`https://go-upc.com/api/v1/code/${code}`, {
        headers: { "Accept": "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.product?.name) return {
          name: data.product.name,
          image_url: data.product.imageUrl || "",
          category: data.product.category || "",
          brand: data.product.brand || "",
          quantity: data.product.weight || ""
        };
      }
    } catch (_) { /* not found in any source */ }

    return null;
  };

  // Barcode scanner: only active when modal is open
  const handleBarcodeScan = useCallback(async (code) => {
    setFormData(prev => ({ ...prev, barcode: code }));
    setScannerFeedback(`🔍 Buscando en bases de datos...`);
    setIsLookingUp(true);

    const info = await lookupBarcodeInfo(code);
    setIsLookingUp(false);

    if (info && info.name) {
      // Construir descripción automática: marca + gramaje
      const descParts = [info.brand, info.quantity].filter(Boolean);
      const autoDesc = descParts.join(" · ");

      // Nombre completo: marca (si no está incluida) + nombre + gramaje
      const brandPrefix = (info.brand && !info.name.toLowerCase().includes(info.brand.toLowerCase()))
        ? `${info.brand} ` : "";
      const fullName = `${brandPrefix}${info.name}${info.quantity ? " " + info.quantity : ""}`;

      setFormData(prev => ({
        ...prev,
        barcode: code,
        name: fullName,
        category: prev.category || info.category || prev.category,
        description: prev.description || autoDesc,
        // Conservamos temporalmente la URL anterior hasta que la IA traiga la nueva
        image_url: prev.image_url || ""
      }));
      const extra = [info.brand && `Marca: ${info.brand}`, info.quantity && `Gramaje: ${info.quantity}`].filter(Boolean).join(" · ");
      setScannerFeedback(`✅ ${fullName}${extra ? " — " + extra : ""}`);

      // Siempre buscar imagen con el robot IA primero. Si falla o no encuentra, que use fallbackUrl (info.image_url)
      setScannerFeedback(f => f + " · 🎨 Buscando imagen mediante IA...");
      handleGenerateImage(fullName, info.image_url);
    } else {
      setScannerFeedback(`⚠️ Código ${code} no encontrado — completa manualmente.`);
    }
    setTimeout(() => setScannerFeedback(""), 6000);
  }, []);

  useBarcodeScanner(handleBarcodeScan, { enabled: isModalOpen });

  const fetchCategories = async () => {
    try {
      if (!businessId || !token) return;

      const response = await fetch(`${API}/categories?business_id=${businessId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      if (!businessId || !token) return;

      const response = await fetch(`${API}/products?business_id=${businessId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      } else {
        console.error("Failed to fetch products");
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      price: product.price,
      category: product.category,
      stock: product.stock,
      image_url: product.image_url || "",
      barcode: product.barcode || "",
      description: product.description || "",
      min_stock: product.min_stock ?? 5,
      cost_price: product.cost_price ?? ""
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormState);
    setEditingId(null);
  };

  const handleGenerateImage = async (nameOverride, fallbackUrl = "") => {
    // Ensure we use a clean string, avoiding event objects if accidentally passed
    const providedName = typeof nameOverride === "string" ? nameOverride : "";
    const nameToUse = (providedName || formData.name || "").trim();

    if (!nameToUse) {
      alert("Por favor ingresa un nombre de producto válido primero para buscar la imagen.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(`${API}/generate-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ product_name: nameToUse })
      });

      if (response.ok) {
        const data = await response.json();
        // Si la IA devolvió el placeholder de error/no encontrado, priorizamos la imagen de la BD (OpenFoodFacts) si existe
        if (data.image_url && data.image_url.includes("placehold.co") && fallbackUrl) {
          setFormData(prev => ({ ...prev, image_url: fallbackUrl }));
        } else {
          setFormData(prev => ({ ...prev, image_url: data.image_url }));
        }
      } else {
        if (!nameOverride) alert("Error al intentar generar la imagen con IA.");
        if (fallbackUrl) setFormData(prev => ({ ...prev, image_url: fallbackUrl }));
      }
    } catch (error) {
      console.error("Error generating image:", error);
      if (!nameOverride) alert("Error de red al conectar con el servidor para la imagen.");
      if (fallbackUrl) setFormData(prev => ({ ...prev, image_url: fallbackUrl }));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Convert price and stock to numbers before sending
    const payload = {
      ...formData,
      business_id: businessId,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock, 10),
      cost_price: formData.cost_price !== "" ? parseFloat(formData.cost_price) : null
    };

    try {
      const url = editingId
        ? `${API}/products/${editingId}`
        : `${API}/products`;

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // Refresh products list and close modal
        fetchProducts();
        closeModal();
      } else {
        const errData = await response.json();
        alert(`Error: ${errData.msg || "Failed to save product"}`);
      }
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Network error while saving the product.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este producto?")) {
      try {
        const response = await fetch(`${API}/products/${id}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
          fetchProducts();
        } else {
          alert("Error al eliminar el producto.");
        }
      } catch (error) {
        console.error("Error deleting product:", error);
      }
    }
  };

  const displayCategories = ["Todos", ...categories.map(cat => cat.name)];
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === "Todos" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Reset pagination if filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="maintenance-container" style={{ position: "fixed", inset: 0, overflowY: "auto", padding: "2rem", paddingBottom: "5rem", fontFamily: "var(--font-family-base)", background: "var(--color-bg-main)", zIndex: 100 }}>

      {/* Back Button */}
      <div style={{ marginBottom: "1.5rem" }}>
        <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "var(--color-primary)", textDecoration: "none", fontWeight: "600", fontSize: "1.1rem" }}>
          <ArrowLeft size={20} />
          Volver al POS
        </Link>
      </div>

      <div className="maintenance-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2 style={{ fontSize: "2rem", color: "var(--color-text-main)", margin: 0 }}>Mantención de Productos</h2>
          <p style={{ color: "var(--color-text-muted)", marginTop: "0.5rem", fontSize: "1rem" }}>Administra tu catálogo de productos, precios y stock</p>
        </div>
        <button
          onClick={openCreateModal}
          style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.75rem 1.5rem", backgroundColor: "var(--color-primary)", color: "white",
            border: "none", borderRadius: "12px", fontSize: "1rem", fontWeight: "bold",
            cursor: "pointer", boxShadow: "0 4px 12px rgba(46, 204, 113, 0.3)", transition: "all 0.2s"
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = "var(--color-primary-hover)"}
          onMouseOut={(e) => e.target.style.backgroundColor = "var(--color-primary)"}
        >
          <PlusCircle size={20} />
          Agregar Producto
        </button>
      </div>

      {/* Barra de Búsqueda */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div className="search-bar" style={{ maxWidth: "100%" }}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar productos por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Category Pills Filter */}
      <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "1.5rem", marginBottom: "0.5rem" }}>
        {displayCategories.map((cat, idx) => (
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
                : "0 2px 4px rgba(0,0,0,0.02)",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="table-container" style={{ backgroundColor: "var(--color-bg-card)", borderRadius: "var(--border-radius-lg)", boxShadow: "var(--shadow-md)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "2px solid var(--border-color)" }}>
              {["ID","Imagen","Nombre","Categoría","P. Venta","P. Costo","Margen","Ganancia","Stock","Estado",""].map((h, i) => (
                <th key={i} style={{ padding: "1rem 1rem", color: "var(--color-text-muted)", fontWeight: "600", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap", ...(i === 10 ? { textAlign: "right" } : {}) }}>{h || "Acciones"}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentProducts.length > 0 ? (
              currentProducts.map((product) => (
                <tr key={product.id} style={{ borderBottom: "1px solid var(--border-color)", transition: "background-color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#F8FAFC"} onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                  <td style={{ padding: "1rem 1.5rem", color: "var(--color-text-muted)", fontWeight: "500" }}>#{product.id}</td>
                  <td style={{ padding: "1rem 1.5rem" }}>
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        onClick={() => setEnlargedImage(product.image_url)}
                        style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--border-color)", cursor: "pointer", transition: "transform 0.2s" }}
                        onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                        onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                        title="Ver imagen grande"
                      />
                    ) : (
                      <div style={{ width: "48px", height: "48px", backgroundColor: "#F1F5F9", borderRadius: "8px", border: "1px solid var(--border-color)" }}></div>
                    )}
                  </td>
                  <td style={{ padding: "1rem 1.5rem", fontWeight: "600", color: "var(--color-text-main)", fontSize: "1.1rem" }}>{product.name}</td>
                  <td style={{ padding: "1rem 1.5rem" }}>
                    <span style={{ backgroundColor: "var(--color-primary-light)", color: "var(--color-primary)", padding: "0.25rem 0.75rem", borderRadius: "100px", fontSize: "0.85rem", fontWeight: "600" }}>
                      {product.category}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: "700", color: "var(--color-text-main)" }}>${product.price.toLocaleString("es-CL")}</td>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: "500", color: product.cost_price != null ? "var(--color-text-main)" : "#cbd5e1" }}>
                    {product.cost_price != null ? `$${product.cost_price.toLocaleString("es-CL")}` : "—"}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    {product.cost_price != null ? (
                      <span style={{ fontWeight: 700, fontSize: "0.9rem", color: ((product.price - product.cost_price) / product.price * 100) >= 30 ? "#16a34a" : ((product.price - product.cost_price) / product.price * 100) >= 10 ? "#f59e0b" : "#ef4444" }}>
                        {Math.round((product.price - product.cost_price) / product.price * 100)}%
                      </span>
                    ) : <span style={{ color: "#cbd5e1" }}>—</span>}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    {product.cost_price != null ? (
                      <span style={{ fontWeight: 700, fontSize: "0.9rem", color: (product.price - product.cost_price) >= 0 ? "#16a34a" : "#ef4444" }}>
                        {(product.price - product.cost_price) >= 0 ? "+" : ""}${(product.price - product.cost_price).toLocaleString("es-CL")}
                      </span>
                    ) : <span style={{ color: "#cbd5e1" }}>—</span>}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: "500" }}>
                    {product.stock}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    {(() => {
                      if (product.stock <= 0) return <span style={{ background: "#fef2f2", color: "#dc2626", padding: "0.2rem 0.6rem", borderRadius: "100px", fontSize: "0.78rem", fontWeight: 700 }}>Sin Stock</span>;
                      if (product.stock <= (product.min_stock || 5)) return <span style={{ background: "#fffbeb", color: "#d97706", padding: "0.2rem 0.6rem", borderRadius: "100px", fontSize: "0.78rem", fontWeight: 700 }}>Bajo</span>;
                      if (product.cost_price == null) return <span style={{ background: "#f1f5f9", color: "#94a3b8", padding: "0.2rem 0.6rem", borderRadius: "100px", fontSize: "0.78rem", fontWeight: 700 }}>Sin Costo</span>;
                      return <span style={{ background: "#f0fdf4", color: "#16a34a", padding: "0.2rem 0.6rem", borderRadius: "100px", fontSize: "0.78rem", fontWeight: 700 }}>OK</span>;
                    })()}
                  </td>
                  <td style={{ padding: "1rem 1.5rem", textAlign: "right" }}>
                    <button
                      onClick={() => openEditModal(product)}
                      style={{ background: "none", border: "none", color: "var(--color-secondary)", cursor: "pointer", padding: "0.5rem", marginRight: "0.5rem", transition: "transform 0.2s" }}
                      title="Editar"
                      onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                      onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                    >
                      <Edit2 size={20} />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      style={{ background: "none", border: "none", color: "var(--color-danger)", cursor: "pointer", padding: "0.5rem", transition: "transform 0.2s" }}
                      title="Eliminar"
                      onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                      onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                    >
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="11" style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)", fontSize: "1.1rem" }}>
                  No hay productos registrados en el catálogo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginTop: "1.5rem", gap: "1rem" }}>
          <button
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
            style={{
              padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: currentPage === 1 ? "#F1F5F9" : "white",
              color: currentPage === 1 ? "#94A3B8" : "var(--color-primary)", fontWeight: "600", cursor: currentPage === 1 ? "not-allowed" : "pointer"
            }}
          >
            Anterior
          </button>
          <span style={{ color: "var(--color-text-muted)", fontWeight: "500", fontSize: "0.95rem" }}>
            Página <strong style={{ color: "var(--color-text-main)" }}>{currentPage}</strong> de {totalPages}
          </span>
          <button
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{
              padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: currentPage === totalPages ? "#F1F5F9" : "white",
              color: currentPage === totalPages ? "#94A3B8" : "var(--color-primary)", fontWeight: "600", cursor: currentPage === totalPages ? "not-allowed" : "pointer"
            }}
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Basic Bootstrap Modal Structure */}
      {isModalOpen && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div style={{ position: "fixed", inset: 0, zIndex: 1055, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
            <div className="modal-content" style={{ width: "900px", maxWidth: "90vw", maxHeight: "90vh", borderRadius: "16px", boxShadow: "0 25px 50px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column" }}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    {editingId ? "Editar Producto" : "Nuevo Producto"}
                  </h5>
                  <button type="button" className="btn-close" onClick={closeModal}></button>
                </div>
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", overflow: "hidden", flex: 1 }}>
                  <div className="modal-body" style={{ overflowY: "auto", overflowX: "hidden", paddingRight: "10px" }}>

                    <div style={{ display: "flex", gap: "2rem" }}>
                      {/* LEFT COLUMN - Form fields */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="row">
                          <div className="col-md-8 mb-3">
                            <label className="form-label">Nombre del Producto</label>
                            <input
                              type="text"
                              className="form-control"
                              name="name"
                              value={formData.name}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                          <div className="col-md-4 mb-3">
                            <label className="form-label">Categoría</label>
                            <select
                              className="form-select"
                              name="category"
                              value={formData.category}
                              onChange={handleInputChange}
                              required
                            >
                              <option value="">Selecciona</option>
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.name}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="row">
                          <div className="col-md-3 mb-3">
                            <label className="form-label">Precio Venta</label>
                            <input
                              type="number"
                              step="0.01"
                              className="form-control"
                              name="price"
                              value={formData.price}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                          <div className="col-md-3 mb-3">
                            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "4px" }}>P. Costo <span style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 400 }}>(opc.)</span></label>
                            <input
                              type="number"
                              step="0.01"
                              className="form-control"
                              name="cost_price"
                              value={formData.cost_price}
                              onChange={handleInputChange}
                              placeholder="Ej: 500"
                              style={{ borderColor: formData.cost_price ? "#27ae60" : undefined }}
                            />
                          </div>
                          <div className="col-md-3 mb-3">
                            <label className="form-label">Stock</label>
                            <input
                              type="number"
                              className="form-control"
                              name="stock"
                              value={formData.stock}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                          <div className="col-md-3 mb-3">
                            <label className="form-label">Stock Mín.</label>
                            <input
                              type="number"
                              className="form-control"
                              name="min_stock"
                              value={formData.min_stock}
                              onChange={handleInputChange}
                              min="0"
                              title="Alerta cuando el stock llegue a este valor"
                            />
                          </div>
                        </div>

                        <div className="mb-3">
                          <label className="form-label d-flex align-items-center gap-2">
                            <Scan size={16} />
                            Código de Barras
                            {isLookingUp && (
                              <span style={{ fontSize: "0.78rem", color: "#0ea5e9", fontWeight: 600 }}>
                                🔍 Consultando...
                              </span>
                            )}
                            {!isLookingUp && scannerFeedback && (
                              <span style={{
                                fontSize: "0.78rem",
                                fontWeight: 600,
                                color: scannerFeedback.includes("✅") ? "var(--color-primary)"
                                  : scannerFeedback.includes("⚠️") ? "#f59e0b"
                                    : "var(--color-text-muted)"
                              }}>
                                {scannerFeedback}
                              </span>
                            )}
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="barcode"
                            value={formData.barcode}
                            onChange={handleInputChange}
                            placeholder="Escanea o escribe el código..."
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const code = formData.barcode.trim();
                                if (code) handleBarcodeScan(code);
                              }
                            }}
                          />
                          <small className="form-text text-muted">
                            Apunta el lector de barras al producto mientras este modal esté abierto.
                          </small>
                        </div>

                        <div className="mb-3">
                          <label className="form-label">URL de Imagen (Opcional)</label>
                          <div className="input-group">
                            <input
                              type="url"
                              className="form-control"
                              name="image_url"
                              value={formData.image_url}
                              onChange={handleInputChange}
                              placeholder="https://ejemplo.com/imagen.jpg"
                            />
                            <button
                              type="button"
                              className="btn btn-warning"
                              onClick={() => handleGenerateImage()}
                              disabled={isGenerating || !formData.name || !formData.name.trim()}
                            >
                              {isGenerating ? "Cargando..." : "✨ IA"}
                            </button>
                          </div>
                          <small className="form-text text-muted">
                            Escribe nombre primero y autocompleta.
                          </small>
                        </div>
                      </div>

                      {/* RIGHT COLUMN - Image preview */}
                      <div style={{ width: "200px", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: "0.5rem" }}>
                        <div style={{
                          width: "180px", height: "180px", borderRadius: "16px", border: "2px dashed #cbd5e1",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: "#f8fafc", overflow: "hidden"
                        }}>
                          {formData.image_url ? (
                            <img
                              src={formData.image_url}
                              alt="Previsualización"
                              style={{ width: "100%", height: "100%", objectFit: "contain", padding: "8px" }}
                              onError={(e) => { e.target.style.display = "none"; }}
                            />
                          ) : (
                            <span style={{ color: "#cbd5e1", fontSize: "0.8rem", textAlign: "center", padding: "1rem" }}>
                              Sin imagen
                            </span>
                          )}
                        </div>
                        {formData.image_url && (
                          <p style={{ marginTop: "0.5rem", fontSize: "0.7rem", color: "#64748b", textAlign: "center", wordBreak: "break-all", maxWidth: "180px" }}>
                            Miniatura cargada ✅
                          </p>
                        )}
                      </div>
                    </div>

                  </div>
                  <div className="modal-footer" style={{ gap: "1rem" }}>
                    <button type="button" className="btn btn-secondary" onClick={closeModal}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {editingId ? "Guardar Cambios" : "Crear Producto"}
                    </button>
                  </div>
                </form>
              </div>
          </div>
        </>
      )}

      {/* Enlarged Image Modal */}
      {enlargedImage && (
        <div
          onClick={() => setEnlargedImage(null)}
          style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", zIndex: 1050,
            display: "flex", justifyContent: "center", alignItems: "center", cursor: "zoom-out"
          }}
        >
          <img
            src={enlargedImage}
            alt="Producto enlarge"
            style={{ maxWidth: "90%", maxHeight: "90vh", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setEnlargedImage(null)}
            style={{
              position: "absolute", top: "20px", right: "20px", background: "white", border: "none",
              borderRadius: "50%", width: "40px", height: "40px", fontSize: "1.5rem", fontWeight: "bold",
              cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", color: "#333"
            }}
          >
            ×
          </button>
        </div>
      )}

    </div>
  );
};
