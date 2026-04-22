import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Edit2, Trash2, PlusCircle, Scan, Search, Download, RefreshCw, CheckCircle, Save, PackageOpen, X } from "lucide-react";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import { useAuth, API } from "../context/AuthContext";
import { useInventory } from "../context/InventoryContext";

export const ProductMaintenance = () => {
  const { businessId, token } = useAuth();
  const { products, categories, fetchProducts, fetchCategories, isLoading } = useInventory();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [enlargedImage, setEnlargedImage] = useState(null);

  // AI Excel upload states
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [aiPreviewItems, setAiPreviewItems] = useState(null);
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);
  const [excelMeta, setExcelMeta] = useState(null);
  const [excelError, setExcelError] = useState("");
  const [excelSuccess, setExcelSuccess] = useState("");

  const excelFileInputRef = useRef(null);

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
    cost_price: "",
    margin: ""
  };
  const [formData, setFormData] = useState(initialFormState);
  const [scannerFeedback, setScannerFeedback] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Data is now managed by Context. 
  // Initial fetch happens in InventoryProvider.
  useEffect(() => {
    // We can manually refresh if we want to be sure, but it should be loaded.
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

  const handleBarcodeScan = useCallback(async (code) => {
    setFormData(prev => ({ ...prev, barcode: code }));
    setScannerFeedback(`🔍 Buscando en bases de datos...`);
    setIsLookingUp(true);

    const info = await lookupBarcodeInfo(code);
    setIsLookingUp(false);

    if (info && info.name) {
      const descParts = [info.brand, info.quantity].filter(Boolean);
      const autoDesc = descParts.join(" · ");
      const brandPrefix = (info.brand && !info.name.toLowerCase().includes(info.brand.toLowerCase()))
        ? `${info.brand} ` : "";
      const fullName = `${brandPrefix}${info.name}${info.quantity ? " " + info.quantity : ""}`;

      setFormData(prev => ({
        ...prev,
        barcode: code,
        name: fullName,
        category: prev.category || info.category || prev.category,
        description: prev.description || autoDesc,
        image_url: prev.image_url || ""
      }));
      const extra = [info.brand && `Marca: ${info.brand}`, info.quantity && `Gramaje: ${info.quantity}`].filter(Boolean).join(" · ");
      setScannerFeedback(`✅ ${fullName}${extra ? " — " + extra : ""}`);

      setScannerFeedback(f => f + " · 🎨 Buscando imagen mediante IA...");
      handleGenerateImage(fullName, info.image_url);
    } else {
      setScannerFeedback(`⚠️ Código ${code} no encontrado — completa manualmente.`);
    }
    setTimeout(() => setScannerFeedback(""), 6000);
  }, []);

  useBarcodeScanner(handleBarcodeScan, { enabled: isModalOpen });

  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingExcel(true);
    setExcelError("");
    setExcelSuccess("");
    setAiPreviewItems(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API}/inventory/upload`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setAiPreviewItems(data.items);
        setExcelMeta({ sheet_info: data.sheet_info, columns_detected: data.columns_detected });
      } else {
        const err = await response.json();
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
    setExcelSuccess("");

    try {
      const response = await fetch(`${API}/inventory/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ items: aiPreviewItems })
      });

      if (response.ok) {
        setExcelSuccess(`¡✅ Se ingresaron ${aiPreviewItems.length} productos con éxito!`);
        setTimeout(() => {
          setIsExcelModalOpen(false);
          setAiPreviewItems(null);
          fetchProducts();
        }, 2500);
      } else {
        const err = await response.json();
        setExcelError(err.msg || "Error al confirmar la importación.");
      }
    } catch (error) {
      console.error(error);
      setExcelError("Error de conexión al guardar los productos.");
    } finally {
      setIsProcessingExcel(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === "margin" || name === "cost_price") {
        const cost = parseFloat(name === "cost_price" ? value : prev.cost_price);
        const margin = parseFloat(name === "margin" ? value : prev.margin);
        if (!isNaN(cost) && !isNaN(margin) && margin < 100) {
          const calculatedPrice = Math.round(cost / (1 - margin / 100));
          newData.price = calculatedPrice.toString();
        }
      } else if (name === "price") {
        const price = parseFloat(value);
        const cost = parseFloat(prev.cost_price);
        if (!isNaN(price) && !isNaN(cost) && price > 0) {
          const calculatedMargin = Math.round(((price - cost) / price) * 100);
          newData.margin = calculatedMargin.toString();
        }
      }
      return newData;
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
      cost_price: product.cost_price ?? "",
      margin: (product.price && product.cost_price) 
        ? Math.round(((product.price - product.cost_price) / product.price) * 100).toString() 
        : ""
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormState);
    setEditingId(null);
  };

  const handleGenerateImage = async (nameOverride, fallbackUrl = "") => {
    const providedName = typeof nameOverride === "string" ? nameOverride : "";
    const nameToUse = (providedName || formData.name || "").trim();
    if (!nameToUse) {
      if (typeof nameOverride !== "string") alert("Por favor ingresa un nombre de producto válido primero.");
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
        if (data.image_url && data.image_url.includes("placehold.co") && fallbackUrl) {
          setFormData(prev => ({ ...prev, image_url: fallbackUrl }));
        } else {
          setFormData(prev => ({ ...prev, image_url: data.image_url }));
        }
      } else {
        if (fallbackUrl) setFormData(prev => ({ ...prev, image_url: fallbackUrl }));
      }
    } catch (error) {
      if (fallbackUrl) setFormData(prev => ({ ...prev, image_url: fallbackUrl }));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      business_id: businessId,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock, 10),
      cost_price: formData.cost_price !== "" ? parseFloat(formData.cost_price) : null
    };
    try {
      const url = editingId ? `${API}/products/${editingId}` : `${API}/products`;
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
        fetchProducts();
        closeModal();
      } else {
        const errData = await response.json();
        alert(`Error: ${errData.msg || "Failed to save product"}`);
      }
    } catch (error) {
      alert("Network error while saving the product.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este producto?")) {
      setDeletingId(id);
      try {
        const response = await fetch(`${API}/products/${id}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
          await fetchProducts();
        } else {
          const data = await response.json();
          alert(`Error: ${data.msg || "Error al eliminar el producto"}`);
        }
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("Error de red al intentar eliminar el producto.");
      } finally {
        setDeletingId(null);
      }
    }
  };

  const displayCategories = ["Todos", ...categories.map(cat => cat.name)];
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === "Todos" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="maintenance-container" style={{ 
      position: "fixed", inset: 0, overflowY: "auto", 
      fontFamily: "'Outfit', 'Inter', sans-serif", 
      background: "#f1f5f9", zIndex: 100 
    }}>
      {/* Top Navigation Bar - Premium Glassmorphism */}
      <header style={{ 
        background: "rgba(255, 255, 255, 0.8)", 
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(226, 232, 240, 0.8)", 
        padding: "0.75rem 2.5rem", 
        display: "flex", 
        alignItems: "center", 
        gap: "1.5rem",
        position: "sticky",
        top: 0,
        zIndex: 1000,
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)"
      }}>
        <Link to="/" style={{ 
          color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", 
          width: "40px", height: "40px", borderRadius: "12px", 
          background: "white", boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          transition: "all 0.2s" 
        }} onMouseOver={e => { e.currentTarget.style.background = "var(--color-primary)"; e.currentTarget.style.color = "white"; }} onMouseOut={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.color = "#64748b"; }}>
          <ArrowLeft size={20} />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ 
            width: "44px", height: "44px", background: "var(--color-primary-light)", 
            borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 10px rgba(46, 204, 113, 0.2)"
          }}>
            <PackageOpen size={26} color="var(--color-primary)" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>Mantención de Productos</h1>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>Gestión Centralizada de Inventario</p>
          </div>
        </div>
      </header>

      <div style={{ padding: "2.5rem", width: "100%", boxSizing: "border-box" }}>
        <div style={{ maxWidth: "1600px", margin: "0 auto" }}>
          <div className="maintenance-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2.5rem" }}>
            <div>
              <span style={{ 
                background: "#dcfce7", color: "#166534", padding: "0.4rem 1rem", 
                borderRadius: "100px", fontSize: "0.75rem", fontWeight: 800, marginBottom: "0.75rem", display: "inline-block" 
              }}>MÓDULO DE INVENTARIO</span>
              <h2 style={{ fontSize: "2.2rem", color: "#0f172a", fontWeight: 900, margin: 0, letterSpacing: "-0.03em" }}>Catálogo maestro</h2>
              <p style={{ color: "#64748b", marginTop: "0.5rem", fontSize: "1.1rem" }}>Administra stock, precios y márgenes con herramientas de IA</p>
            </div>
            
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <input type="file" accept=".csv, .xlsx, .xls" ref={excelFileInputRef} onChange={handleExcelUpload} style={{ display: 'none' }} />
              
              <a href="/Plantilla_Inventario_Zoko.xlsx" download style={{ 
                display: "flex", alignItems: "center", gap: "0.6rem", 
                padding: "0.8rem 1.25rem", backgroundColor: "white", color: "#475569", 
                border: "1px solid #e2e8f0", borderRadius: "16px", fontSize: "0.95rem", fontWeight: "700", 
                textDecoration: "none", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", transition: "all 0.2s" 
              }} onMouseOver={e => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.transform = "translateY(-1px)"; }} onMouseOut={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.transform = "translateY(0)"; }}>
                <Download size={19} />
                <span className="d-none d-md-inline">Plantilla</span>
              </a>

              <button onClick={() => { setIsExcelModalOpen(true); setAiPreviewItems(null); }} style={{ 
                display: "flex", alignItems: "center", gap: "0.6rem", 
                padding: "0.8rem 1.25rem", backgroundColor: "white", color: "#0f172a", 
                border: "1px solid #e2e8f0", borderRadius: "16px", fontSize: "0.95rem", fontWeight: "700", 
                cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", transition: "all 0.2s" 
              }} onMouseOver={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.transform = "translateY(-1px)"; }} onMouseOut={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.transform = "translateY(0)"; }}>
                <RefreshCw size={19} />
                <span className="d-none d-md-inline">Carga Masiva</span>
              </button>

              <button onClick={openCreateModal} style={{ 
                display: "flex", alignItems: "center", gap: "0.75rem", 
                padding: "0.9rem 1.75rem", backgroundColor: "var(--color-primary)", color: "white", 
                border: "none", borderRadius: "16px", fontSize: "1rem", fontWeight: "800", 
                cursor: "pointer", boxShadow: "0 8px 20px rgba(46, 204, 113, 0.3)", transition: "all 0.3s" 
              }} onMouseOver={e => { e.currentTarget.style.background = "var(--color-primary-hover)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 25px rgba(46, 204, 113, 0.4)"; }} onMouseOut={e => { e.currentTarget.style.background = "var(--color-primary)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(46, 204, 113, 0.3)"; }}>
                <PlusCircle size={22} />
                Agregar Producto
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1.5rem", marginBottom: "2rem", alignItems: "center", flexWrap: "wrap" }}>
            <div className="search-bar" style={{ 
              flex: 1, minWidth: "300px", maxWidth: "600px", 
              background: "white", borderRadius: "18px", padding: "0.5rem 1.25rem",
              display: "flex", alignItems: "center", gap: "0.75rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)", border: "1px solid #e2e8f0",
              transition: "all 0.3s"
            }} onFocusIn={e => e.currentTarget.style.borderColor = "var(--color-primary)"} onFocusOut={e => e.currentTarget.style.borderColor = "#e2e8f0"}>
              <Search size={20} color="#94a3b8" />
              <input 
                type="text" 
                placeholder="Buscar productos por nombre, código o categoría..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                style={{ 
                  border: "none", outline: "none", background: "transparent", 
                  width: "100%", fontSize: "1rem", color: "#0f172a", py: "0.5rem" 
                }}
              />
            </div>
            
            <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", flex: 2, padding: "0.25rem 0" }}>
              {displayCategories.map((cat, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setSelectedCategory(cat)} 
                  style={{ 
                    whiteSpace: "nowrap", padding: "0.7rem 1.5rem", borderRadius: "14px", 
                    border: selectedCategory === cat ? "none" : "1px solid #e2e8f0", 
                    fontSize: "0.9rem", fontWeight: "700",
                    transition: "all 0.2s",
                    backgroundColor: selectedCategory === cat ? "var(--color-primary)" : "white", 
                    color: selectedCategory === cat ? "white" : "#64748b",
                    boxShadow: selectedCategory === cat ? "0 4px 10px rgba(46, 204, 113, 0.2)" : "none",
                    cursor: "pointer"
                  }}
                  onMouseOver={e => { if (selectedCategory !== cat) e.currentTarget.style.backgroundColor = "#f8fafc"; }}
                  onMouseOut={e => { if (selectedCategory !== cat) e.currentTarget.style.backgroundColor = "white"; }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="table-responsive" style={{ background: "white", borderRadius: "24px", padding: "1.5rem", boxShadow: "0 10px 25px -4px rgba(0,0,0,0.04), 0 4px 10px -2px rgba(0,0,0,0.02)", border: "1px solid #e2e8f0" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 0.75rem", textAlign: "left" }}>
              <thead>
                <tr style={{ color: "#94a3b8", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "800", letterSpacing: "0.05em" }}>
                  <th style={{ padding: "0 1.5rem 0.5rem" }}>Producto</th>
                  <th style={{ padding: "0 1rem 0.5rem" }}>Categoría</th>
                  <th style={{ padding: "0 1rem 0.5rem" }}>Precio Venta</th>
                  <th style={{ padding: "0 1rem 0.5rem" }}>P. Costo</th>
                  <th style={{ padding: "0 1rem 0.5rem" }}>Margen</th>
                  <th style={{ padding: "0 1rem 0.5rem" }}>Stock</th>
                  <th style={{ padding: "0 1.5rem 0.5rem", textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentProducts.map((product) => {
                  const profit = product.price - (product.cost_price || 0);
                  const margin = product.price > 0 ? Math.round((profit / product.price) * 100) : 0;
                  
                  return (
                    <tr key={product.id} className="product-row" style={{ 
                      transition: "all 0.25s", cursor: "default"
                    }} onMouseOver={e => { e.currentTarget.style.backgroundColor = "#f8fafc"; e.currentTarget.style.transform = "translateY(-1px)"; }} onMouseOut={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.transform = "translateY(0)"; }}>
                      <td style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                          <div style={{ 
                            width: "56px", height: "56px", borderRadius: "14px", overflow: "hidden", 
                            background: "#f1f5f9", flexShrink: 0, border: "2px solid white", boxShadow: "0 4px 6px rgba(0,0,0,0.04)" 
                          }}>
                            {product.image_url ? (
                              <img src={product.image_url} onClick={() => setEnlargedImage(product.image_url)} style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "zoom-in" }} />
                            ) : (
                              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#cbd5e1" }}>
                                <PackageOpen size={24} />
                              </div>
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: "800", color: "#0f172a", fontSize: "1.05rem", marginBottom: "0.1rem" }}>{product.name}</div>
                            <div style={{ color: "#94a3b8", fontSize: "0.8rem", fontWeight: "600" }}>#{product.id} · {product.barcode || "Sin barcode"}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "1.25rem 1rem", borderBottom: "1px solid #f1f5f9" }}>
                        <span style={{ 
                          backgroundColor: "#f1f5f9", color: "#475569", 
                          padding: "0.5rem 1rem", borderRadius: "12px", fontSize: "0.85rem", fontWeight: "700",
                          border: "1px solid #e2e8f0"
                        }}>
                          {product.category}
                        </span>
                      </td>
                      <td style={{ padding: "1.25rem 1rem", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ fontWeight: "900", color: "#0f172a", fontSize: "1.1rem" }}>${product.price.toLocaleString("es-CL")}</div>
                      </td>
                      <td style={{ padding: "1.25rem 1rem", borderBottom: "1px solid #f1f5f9" }}>
                         <div style={{ fontWeight: "600", color: product.cost_price ? "#64748b" : "#cbd5e1" }}>
                          {product.cost_price ? `$${product.cost_price.toLocaleString("es-CL")}` : "—"}
                        </div>
                      </td>
                      <td style={{ padding: "1.25rem 1rem", borderBottom: "1px solid #f1f5f9" }}>
                        {product.cost_price ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <div style={{ 
                              color: margin >= 30 ? "#16a34a" : margin >= 15 ? "#f59e0b" : "#ef4444", 
                              fontWeight: "900", fontSize: "1.1rem" 
                            }}>{margin}%</div>
                            <div style={{ color: "#94a3b8", fontSize: "0.75rem", fontWeight: "700" }}>Ganancia: ${profit.toLocaleString("es-CL")}</div>
                          </div>
                        ) : <span style={{ color: "#cbd5e1" }}>—</span>}
                      </td>
                      <td style={{ padding: "1.25rem 1rem", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ 
                            fontWeight: "800", color: product.stock <= 0 ? "#ef4444" : "#0f172a",
                            fontSize: "1.1rem"
                          }}>{product.stock} un.</span>
                          {product.stock <= (product.min_stock || 5) && (
                            <span style={{ color: "#f59e0b", fontSize: "0.7rem", fontWeight: "800", textTransform: "uppercase" }}>
                              Stock Crítico
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f5f9", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => openEditModal(product)}
                            disabled={deletingId !== null}
                            style={{ 
                              background: "white", border: "1px solid #e2e8f0", color: "#64748b", 
                              cursor: deletingId ? "not-allowed" : "pointer", width: "40px", height: "40px", borderRadius: "12px",
                              display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s",
                              opacity: deletingId ? 0.5 : 1
                            }}
                            onMouseOver={e => { if(!deletingId) { e.currentTarget.style.borderColor = "#2ecc71"; e.currentTarget.style.color = "#2ecc71"; } }}
                            onMouseOut={e => { if(!deletingId) { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#64748b"; } }}
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            disabled={deletingId !== null}
                            style={{ 
                              background: deletingId === product.id ? "#fef2f2" : "white", 
                              border: `1px solid ${deletingId === product.id ? "#ef4444" : "#e2e8f0"}`, 
                              color: deletingId === product.id ? "#ef4444" : "#64748b", 
                              cursor: deletingId ? "not-allowed" : "pointer", width: "40px", height: "40px", borderRadius: "12px",
                              display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s",
                              opacity: (deletingId && deletingId !== product.id) ? 0.5 : 1
                            }}
                            onMouseOver={e => { if(!deletingId) { e.currentTarget.style.borderColor = "#ef4444"; e.currentTarget.style.color = "#ef4444"; } }}
                            onMouseOut={e => { if(!deletingId) { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#64748b"; } }}
                          >
                            {deletingId === product.id ? (
                               <div className="zoko-loader-wrapper" style={{ transform: "scale(0.35)", marginBottom: 0, width: "30px", height: "15px" }}>
                                  <div className="zoko-loader-circle"></div>
                                  <div className="zoko-loader-circle"></div>
                                  <div className="zoko-loader-circle"></div>
                               </div>
                            ) : (
                               <Trash2 size={18} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ 
              display: "flex", justifyContent: "center", alignItems: "center", 
              marginTop: "2.5rem", gap: "1rem", color: "#64748b" 
            }}>
              <button 
                onClick={() => paginate(currentPage - 1)} 
                disabled={currentPage === 1}
                style={{ 
                  background: "white", border: "1px solid #e2e8f0", padding: "0.6rem 1.25rem", 
                  borderRadius: "12px", fontWeight: "700", cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  opacity: currentPage === 1 ? 0.5 : 1
                }}
              >Anterior</button>
              <div style={{ display: "flex", gap: "0.25rem" }}>
                {[...Array(totalPages)].map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => paginate(i + 1)}
                    style={{
                      width: "36px", height: "36px", borderRadius: "10px", border: "none",
                      backgroundColor: currentPage === i + 1 ? "var(--color-primary)" : "transparent",
                      color: currentPage === i + 1 ? "white" : "#64748b",
                      fontWeight: "800", cursor: "pointer"
                    }}
                  >{i + 1}</button>
                ))}
              </div>
              <button 
                onClick={() => paginate(currentPage + 1)} 
                disabled={currentPage === totalPages}
                style={{ 
                  background: "white", border: "1px solid #e2e8f0", padding: "0.6rem 1.25rem", 
                  borderRadius: "12px", fontWeight: "700", cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  opacity: currentPage === totalPages ? 0.5 : 1
                }}
              >Siguiente</button>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <>
          <div className="modal-backdrop fade show" style={{ background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(8px)" }}></div>
          <div style={{ position: "fixed", inset: 0, zIndex: 1055, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
            <div className="modal-content" style={{ 
              width: "850px", maxWidth: "95vw", height: "auto", maxHeight: "90vh",
              borderRadius: "24px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", 
              display: "flex", flexDirection: "column", border: "none", overflow: "hidden" 
            }}>
              <div className="modal-header" style={{ padding: "1.25rem 2rem", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h5 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em" }}>
                  {editingId ? "Editar Producto" : "Nuevo Producto"}
                </h5>
                <button type="button" onClick={closeModal} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "0.5rem", borderRadius: "50%" }}>
                  <X size={22} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", overflow: "hidden", flex: 1 }}>
                <div className="modal-body" style={{ overflowY: "auto", padding: "1.5rem 2rem", scrollbarWidth: "thin" }}>
                  <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
                    
                    {/* LEFT COLUMN - Fields */}
                    <div style={{ flex: 1, minWidth: "280px" }}>
                      
                      <div className="mb-3">
                        <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: "700", color: "#475569" }}>Nombre</label>
                        <input 
                          type="text" 
                          name="name" 
                          value={formData.name} 
                          onChange={handleInputChange} 
                          onBlur={() => {
                            if (formData.name.trim() && !formData.image_url) {
                              handleGenerateImage();
                            }
                          }}
                          placeholder="Ej: Coca Cola 330ml"
                          required 
                          style={{ 
                            borderRadius: "12px", padding: "0.5rem 0.8rem", border: "1px solid #e2e8f0", 
                            fontSize: "0.9rem", color: "#0f172a", width: "100%", outline: "none", background: "#f8fafc", transition: "all 0.2s" 
                          }}
                        />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }} className="mb-3">
                        <div>
                          <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: "700", color: "#475569" }}>Categoría</label>
                          <select 
                            name="category" 
                            value={formData.category} 
                            onChange={handleInputChange} 
                            required
                            style={{ 
                              borderRadius: "12px", padding: "0.5rem 0.8rem", border: "1px solid #e2e8f0", 
                              fontSize: "0.9rem", color: "#0f172a", width: "100%", outline: "none", background: "#f8fafc", cursor: "pointer"
                            }}
                          >
                            <option value="">Selecciona</option>
                            {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: "700", color: "#475569" }}>
                             Código Barras
                          </label>
                          <input 
                            type="text" 
                            name="barcode" 
                            value={formData.barcode} 
                            onChange={handleInputChange} 
                            placeholder="7801234567..."
                            style={{ 
                              borderRadius: "12px", padding: "0.5rem 0.8rem", border: "1px solid #e2e8f0", 
                              fontSize: "0.9rem", color: "#0f172a", width: "100%", outline: "none", background: "#f8fafc"
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }} className="mb-3">
                        <div>
                          <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: "700", color: "#475569" }}>Costo</label>
                          <input 
                            type="number" 
                            name="cost_price" 
                            value={formData.cost_price} 
                            onChange={handleInputChange} 
                            placeholder="500"
                            style={{ 
                              borderRadius: "12px", padding: "0.5rem 0.8rem", border: "1px solid #e2e8f0", 
                              fontSize: "0.9rem", color: "#0f172a", width: "100%", outline: "none", background: "#f8fafc"
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: "700", color: "var(--color-primary)" }}>Margen %</label>
                          <input 
                            type="number" 
                            name="margin" 
                            value={formData.margin} 
                            onChange={handleInputChange} 
                            placeholder="30"
                            style={{ 
                              borderRadius: "12px", padding: "0.5rem 0.8rem", border: "1px solid var(--color-primary-light)", 
                              fontSize: "0.9rem", color: "var(--color-primary)", fontWeight: "bold", width: "100%", outline: "none", background: "#f0fdf4"
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: "700", color: "#475569" }}>P. Venta</label>
                          <input 
                            type="number" 
                            name="price" 
                            value={formData.price} 
                            onChange={handleInputChange} 
                            required 
                            placeholder="650"
                            style={{ 
                              borderRadius: "12px", padding: "0.5rem 0.8rem", border: "1px solid #e2e8f0", 
                              fontSize: "0.9rem", color: "#0f172a", fontWeight: "bold", width: "100%", outline: "none", background: "#f8fafc"
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }} className="mb-3">
                        <div>
                          <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: "700", color: "#475569" }}>Stock</label>
                          <input 
                            type="number" 
                            name="stock" 
                            value={formData.stock} 
                            onChange={handleInputChange} 
                            required 
                            style={{ 
                              borderRadius: "12px", padding: "0.5rem 0.8rem", border: "1px solid #e2e8f0", 
                              fontSize: "0.9rem", color: "#0f172a", width: "100%", outline: "none", background: "#f8fafc"
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: "700", color: "#475569" }}>Stock Mín.</label>
                          <input 
                            type="number" 
                            name="min_stock" 
                            value={formData.min_stock} 
                            onChange={handleInputChange} 
                            style={{ 
                              borderRadius: "12px", padding: "0.5rem 0.8rem", border: "1px solid #e2e8f0", 
                              fontSize: "0.9rem", color: "#0f172a", width: "100%", outline: "none", background: "#f8fafc"
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: "700", color: "#475569" }}>Descripción (Opcional)</label>
                        <textarea 
                          name="description" 
                          value={formData.description} 
                          onChange={handleInputChange}
                          rows="2"
                          placeholder="Añade detalles del producto..."
                          style={{ 
                            borderRadius: "12px", padding: "0.5rem 0.8rem", border: "1px solid #e2e8f0", 
                            fontSize: "0.9rem", color: "#0f172a", width: "100%", outline: "none", background: "#f8fafc", resize: "none"
                          }}
                        />
                      </div>
                    </div>

                    {/* RIGHT COLUMN - Image area */}
                    <div style={{ width: "200px", display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center" }}>
                      <div style={{ 
                        width: "100%", height: "200px", border: "2px dashed #cbd5e1", 
                        borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", 
                        background: "#f8fafc", overflow: "hidden", position: "relative" 
                      }}>
                        {formData.image_url ? (
                          <img src={formData.image_url} style={{ width: "100%", height: "100%", objectFit: "contain", padding: "1rem" }} />
                        ) : (
                          <div style={{ textAlign: "center", color: "#94a3b8" }}>
                            <PackageOpen size={40} strokeWidth={1.5} style={{ marginBottom: "0.5rem" }} />
                            <div style={{ fontSize: "0.8rem", fontWeight: "600" }}>Sin imagen</div>
                          </div>
                        )}
                        {isGenerating && (
                          <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.8)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 20 }}>
                            <div className="zoko-loader-wrapper" style={{ marginBottom: 0, transform: "scale(0.8)" }}>
                              <div className="zoko-loader-circle"></div>
                              <div className="zoko-loader-circle"></div>
                              <div className="zoko-loader-circle"></div>
                              <div className="zoko-loader-shadow"></div>
                              <div className="zoko-loader-shadow"></div>
                              <div className="zoko-loader-shadow"></div>
                            </div>
                            <div style={{ marginTop: "1rem", fontSize: "0.8rem", fontWeight: "800", color: "var(--color-primary)", letterSpacing: "0.05em" }}>BUSCANDO...</div>
                          </div>
                        )}
                      </div>

                      <button 
                        type="button" 
                        onClick={() => handleGenerateImage()} 
                        disabled={isGenerating || !formData.name}
                        style={{ 
                          width: "100%", padding: "0.75rem", backgroundColor: "#ffb100", color: "white", 
                          border: "none", borderRadius: "14px", fontSize: "0.9rem", fontWeight: "800", 
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                          boxShadow: "0 4px 10px rgba(255, 177, 0, 0.3)", transition: "all 0.2s"
                        }}
                        onMouseOver={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.backgroundColor = "#ffa000"; }}
                        onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.backgroundColor = "#ffb100"; }}
                      >
                         ✨ Buscar Imagen IA
                      </button>

                      <div style={{ width: "100%" }}>
                        <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.8rem", fontWeight: "700", color: "#94a3b8" }}>URL Manual</label>
                        <input 
                          type="url" 
                          name="image_url" 
                          value={formData.image_url} 
                          onChange={handleInputChange} 
                          placeholder="https://..."
                          style={{ 
                            borderRadius: "10px", padding: "0.4rem 0.6rem", border: "1px solid #e2e8f0", 
                            fontSize: "0.8rem", color: "#64748b", width: "100%", outline: "none", background: "#f8fafc"
                          }}
                        />
                      </div>
                    </div>

                  </div>
                </div>

                <div className="modal-footer" style={{ padding: "1.25rem 2rem", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                  <button type="button" onClick={closeModal} style={{ 
                    padding: "0.7rem 1.5rem", background: "#f1f5f9", border: "none", borderRadius: "12px", 
                    color: "#64748b", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" 
                  }} onMouseOver={e => e.currentTarget.style.background = "#e2e8f0"} onMouseOut={e => e.currentTarget.style.background = "#f1f5f9"}>Cancelar</button>
                  <button type="submit" style={{ 
                    padding: "0.7rem 1.75rem", background: "var(--color-primary)", border: "none", borderRadius: "12px", 
                    color: "white", fontWeight: "800", cursor: "pointer", boxShadow: "0 4px 10px rgba(46, 204, 113, 0.25)",
                    transition: "all 0.2s" 
                  }} onMouseOver={e => { e.currentTarget.style.background = "var(--color-primary-hover)"; e.currentTarget.style.transform = "translateY(-1px)"; }} onMouseOut={e => { e.currentTarget.style.background = "var(--color-primary)"; e.currentTarget.style.transform = "translateY(0)"; }}>
                    {editingId ? "Guardar Cambios" : "Crear Producto"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {isExcelModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div style={{ background: "white", padding: "2.5rem", borderRadius: "32px", width: "100%", maxWidth: "900px", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.04em" }}>Carga Masiva Inteligente</h3>
                <p style={{ margin: "0.25rem 0 0 0", color: "#64748b", fontWeight: "600" }}>Analizamos tu Excel con IA para detectar productos automáticamente</p>
              </div>
              <button 
                onClick={() => setIsExcelModalOpen(false)} 
                style={{ background: "#f1f5f9", border: "none", color: "#64748b", width: "40px", height: "40px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={20} />
              </button>
            </div>
            
            {!aiPreviewItems ? (
              <div 
                onClick={() => excelFileInputRef.current.click()} 
                style={{ 
                  border: "3px dashed #e2e8f0", padding: "5rem 2rem", textAlign: "center", 
                  cursor: "pointer", borderRadius: "24px", transition: "all 0.3s",
                  background: "#f8fafc"
                }}
                onMouseOver={e => { e.currentTarget.style.borderColor = "var(--color-primary)"; e.currentTarget.style.background = "#f0fdf4"; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#f8fafc"; }}
              >
                {isProcessingExcel ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
                    <div style={{ 
                      width: "80px", height: "80px", background: "white", borderRadius: "24px",
                      display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 15px rgba(0,0,0,0.05)"
                    }}>
                      <RefreshCw className="spin" size={40} color="var(--color-primary)" />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, color: "#0f172a", fontSize: "1.25rem", fontWeight: "800" }}>Procesando archivo...</h4>
                      <p style={{ margin: "0.5rem 0 0 0", color: "#64748b" }}>Nuestra IA está identificando categorías y precios.</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
                    <div style={{ 
                      width: "80px", height: "80px", background: "white", borderRadius: "24px",
                      display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 15px rgba(0,0,0,0.05)"
                    }}>
                      <Download size={40} color="#64748b" />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, color: "#0f172a", fontSize: "1.25rem", fontWeight: "800" }}>Sube tu planilla Excel</h4>
                      <p style={{ margin: "0.5rem 0 0 0", color: "#64748b" }}>Arrastra el archivo o haz clic para buscarlo.</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ flex: 1, overflowY: "auto", borderRadius: "18px", border: "1px solid #e2e8f0", background: "#f8fafc" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ position: "sticky", top: 0, background: "white", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", zIndex: 10 }}>
                      <tr style={{ color: "#94a3b8", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "800", letterSpacing: "0.05em" }}>
                        <th style={{ padding: "1rem 1.5rem" }}>Nombre Detectado</th>
                        <th style={{ padding: "1rem 1rem" }}>Categoría IA</th>
                        <th style={{ padding: "1rem 1rem" }}>Precio</th>
                        <th style={{ padding: "1rem 1rem" }}>Stock</th>
                        <th style={{ padding: "1rem 1.5rem", textAlign: "right" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiPreviewItems.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0", background: "white" }}>
                          <td style={{ padding: "1rem 1.5rem", fontWeight: "700", color: "#0f172a" }}>{item.name}</td>
                          <td style={{ padding: "1rem 1rem" }}>
                            <span style={{ background: "#f1f5f9", padding: "0.4rem 0.8rem", borderRadius: "8px", fontSize: "0.8rem", fontWeight: "700", color: "#475569" }}>
                              {item.category_name}
                            </span>
                          </td>
                          <td style={{ padding: "1rem 1rem", fontWeight: "800", color: "var(--color-primary)" }}>${item.price.toLocaleString("es-CL")}</td>
                          <td style={{ padding: "1rem 1rem", fontWeight: "700" }}>{item.stock} un.</td>
                          <td style={{ padding: "1rem 1.5rem", textAlign: "right" }}>
                            <button 
                              onClick={() => removePreviewItem(idx)} 
                              style={{ background: "none", border: "none", color: "#f43f5e", cursor: "pointer", padding: "0.5rem" }}
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem" }}>
                   <button 
                    onClick={() => setAiPreviewItems(null)} 
                    style={{ padding: "0.8rem 1.5rem", background: "#f1f5f9", border: "none", borderRadius: "14px", color: "#64748b", fontWeight: "700", cursor: "pointer" }}
                   >Subir otro archivo</button>
                   <button 
                    onClick={confirmAIExcelImport} 
                    disabled={isProcessingExcel}
                    style={{ 
                      padding: "0.8rem 2rem", background: "var(--color-primary)", border: "none", borderRadius: "14px", color: "white", 
                      fontWeight: "800", cursor: "pointer", boxShadow: "0 4px 12px rgba(46, 204, 113, 0.25)" 
                    }}
                   >
                     {isProcessingExcel ? "Guardando..." : "Confirmar e Importar"}
                   </button>
                </div>
              </div>
            )}
            
            {excelError && (
              <div style={{ marginTop: "1rem", padding: "1rem", background: "#fef2f2", color: "#b91c1c", borderRadius: "12px", fontSize: "0.9rem", fontWeight: "600", border: "1px solid #fee2e2" }}>
                {excelError}
              </div>
            )}
          </div>
        </div>
      )}

      {enlargedImage && (
        <div onClick={() => setEnlargedImage(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={enlargedImage} style={{ maxWidth: "90%", maxHeight: "90%", borderRadius: "12px" }} />
        </div>
      )}
    </div>
  );
};
