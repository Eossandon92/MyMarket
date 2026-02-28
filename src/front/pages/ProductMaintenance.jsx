import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Edit2, Trash2, PlusCircle } from "lucide-react";

export const ProductMaintenance = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Default empty form state
  const initialFormState = {
    name: "",
    price: "",
    category: "",
    stock: "",
    image_url: ""
  };
  const [formData, setFormData] = useState(initialFormState);

  // Fetch all products and categories when component mounts
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/categories");
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
      // Assuming your Vite proxy or backend is running at localhost:3001
      const response = await fetch("http://localhost:3001/api/products");
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
      image_url: product.image_url || ""
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormState);
    setEditingId(null);
  };

  const handleGenerateImage = async () => {
    if (!formData.name) {
      alert("Por favor ingresa un nombre de producto primero.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("http://localhost:3001/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ product_name: formData.name })
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, image_url: data.image_url }));
      } else {
        alert("Error al intentar generar la imagen con IA.");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      alert("Error de red al conectar con el servidor para la imagen.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Convert price and stock to numbers before sending
    const payload = {
      ...formData,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock, 10)
    };

    const url = editingId
      ? `http://localhost:3001/api/products/${editingId}`
      : `http://localhost:3001/api/products`;

    const method = editingId ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json"
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
    if (window.confirm("¿Estás seguro de que deseas eliminar este producto?")) {
      try {
        const response = await fetch(`http://localhost:3001/api/products/${id}`, {
          method: "DELETE"
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

  return (
    <div className="maintenance-container" style={{ height: "100vh", overflowY: "auto", padding: "2rem", paddingBottom: "5rem", maxWidth: "1200px", margin: "0 auto", fontFamily: "var(--font-family-base)" }}>

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

      <div className="table-container" style={{ backgroundColor: "var(--color-bg-card)", borderRadius: "var(--border-radius-lg)", boxShadow: "var(--shadow-md)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "2px solid var(--border-color)" }}>
              <th style={{ padding: "1.25rem 1.5rem", color: "var(--color-text-muted)", fontWeight: "600", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>ID</th>
              <th style={{ padding: "1.25rem 1.5rem", color: "var(--color-text-muted)", fontWeight: "600", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Imagen</th>
              <th style={{ padding: "1.25rem 1.5rem", color: "var(--color-text-muted)", fontWeight: "600", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Nombre</th>
              <th style={{ padding: "1.25rem 1.5rem", color: "var(--color-text-muted)", fontWeight: "600", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Categoría</th>
              <th style={{ padding: "1.25rem 1.5rem", color: "var(--color-text-muted)", fontWeight: "600", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Precio</th>
              <th style={{ padding: "1.25rem 1.5rem", color: "var(--color-text-muted)", fontWeight: "600", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Stock</th>
              <th style={{ padding: "1.25rem 1.5rem", color: "var(--color-text-muted)", fontWeight: "600", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.length > 0 ? (
              products.map((product) => (
                <tr key={product.id} style={{ borderBottom: "1px solid var(--border-color)", transition: "background-color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#F8FAFC"} onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                  <td style={{ padding: "1rem 1.5rem", color: "var(--color-text-muted)", fontWeight: "500" }}>#{product.id}</td>
                  <td style={{ padding: "1rem 1.5rem" }}>
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--border-color)" }} />
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
                  <td style={{ padding: "1rem 1.5rem", fontWeight: "700", fontSize: "1.1rem", color: "var(--color-text-main)" }}>${product.price}</td>
                  <td style={{ padding: "1rem 1.5rem", fontWeight: "500", color: product.stock > 10 ? "var(--color-text-main)" : "var(--color-warning)" }}>
                    {product.stock} {product.stock <= 10 && " (Bajo)"}
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
                <td colSpan="7" style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)", fontSize: "1.1rem" }}>
                  No hay productos registrados en el catálogo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Basic Bootstrap Modal Structure */}
      {isModalOpen && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal d-block" tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {editingId ? "Editar Producto" : "Nuevo Producto"}
                  </h5>
                  <button type="button" className="btn-close" onClick={closeModal}></button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="modal-body">
                    <div className="mb-3">
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
                    <div className="mb-3">
                      <label className="form-label">Categoría</label>
                      <select
                        className="form-select"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Selecciona una categoría</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Precio</label>
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
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Stock Inicial</label>
                        <input
                          type="number"
                          className="form-control"
                          name="stock"
                          value={formData.stock}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
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
                          onClick={handleGenerateImage}
                          disabled={isGenerating || !formData.name}
                        >
                          {isGenerating ? "Generando..." : "✨ IA"}
                        </button>
                      </div>
                      <small className="form-text text-muted">
                        Escribe el nombre del producto primero y presiona el botón ✨ IA para autocompletar la foto.
                      </small>
                    </div>
                  </div>
                  <div className="modal-footer">
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
          </div>
        </>
      )}
    </div>
  );
};
