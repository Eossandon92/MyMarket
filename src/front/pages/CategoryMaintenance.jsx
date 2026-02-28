import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PlusCircle, Search, Edit2, Trash2, X, Tag, ArrowLeft } from "lucide-react";

export const CategoryMaintenance = () => {
    const [categories, setCategories] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formData, setFormData] = useState({ name: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await fetch("http://localhost:3001/api/categories");
            if (response.ok) {
                const data = await response.json();
                setCategories(data);
            } else {
                console.error("Failed to fetch categories");
                setError("Error al cargar las categorías.");
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
            setError("Error de conexión al servidor.");
        }
    };

    const handleOpenModal = (category = null) => {
        setError(null);
        if (category) {
            setEditingCategory(category);
            setFormData({ name: category.name });
        } else {
            setEditingCategory(null);
            setFormData({ name: "" });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
        setFormData({ name: "" });
        setError(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Basic Validation
        if (!formData.name.trim()) {
            setError("El nombre es requerido");
            return;
        }

        setIsSubmitting(true);

        try {
            const url = editingCategory
                ? `http://localhost:3001/api/categories/${editingCategory.id}`
                : "http://localhost:3001/api/categories";

            const method = editingCategory ? "PUT" : "POST";

            const response = await fetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name: formData.name.trim() }),
            });

            if (response.ok) {
                await fetchCategories();
                handleCloseModal();
            } else {
                const data = await response.json();
                setError(data.msg || "Error al guardar la categoría");
            }
        } catch (error) {
            console.error("Error saving category:", error);
            setError("Error de conexión al servidor");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("¿Estás seguro de que deseas eliminar esta categoría?")) {
            try {
                const response = await fetch(`http://localhost:3001/api/categories/${id}`, {
                    method: "DELETE",
                });

                if (response.ok) {
                    fetchCategories();
                } else {
                    console.error("Failed to delete category");
                }
            } catch (error) {
                console.error("Error deleting category:", error);
            }
        }
    };

    const filteredCategories = categories.filter((cat) =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="maintenance-container" style={{ height: "100vh", overflowY: "auto", padding: "2rem", paddingBottom: "5rem", maxWidth: "800px", margin: "0 auto", fontFamily: "var(--font-family-base)" }}>

            {/* Back Button */}
            <div style={{ marginBottom: "1.5rem" }}>
                <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "var(--color-primary)", textDecoration: "none", fontWeight: "600", fontSize: "1.1rem" }}>
                    <ArrowLeft size={20} />
                    Volver al POS
                </Link>
            </div>

            <div className="maintenance-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                <div>
                    <h2 style={{ fontSize: "2rem", color: "var(--color-text-main)", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                        <Tag size={28} color="var(--color-primary)" />
                        Mantención de Categorías
                    </h2>
                    <p style={{ color: "var(--color-text-muted)", marginTop: "0.5rem", fontSize: "1rem" }}>
                        Administra las categorías de tus productos
                    </p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
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
                    Nueva Categoría
                </button>
            </div>

            <div className="search-bar" style={{ position: "relative", marginBottom: "2rem", maxWidth: "400px" }}>
                <Search
                    size={20}
                    style={{ position: "absolute", left: "1.25rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }}
                />
                <input
                    type="text"
                    placeholder="Buscar categorías..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: "100%", padding: "1rem 1rem 1rem 3.5rem", borderRadius: "100px",
                        border: "1px solid transparent", fontSize: "1rem", backgroundColor: "white",
                        boxShadow: "var(--shadow-sm)", outline: "none", transition: "all 0.2s"
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "var(--color-primary)"; e.target.style.boxShadow = "0 0 0 4px var(--color-primary-light)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "transparent"; e.target.style.boxShadow = "var(--shadow-sm)"; }}
                />
            </div>

            <div className="table-container" style={{ backgroundColor: "white", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #dee2e6" }}>
                            <th style={{ padding: "1rem", textAlign: "left", color: "#495057" }}>ID</th>
                            <th style={{ padding: "1rem", textAlign: "left", color: "#495057" }}>Nombre de Categoría</th>
                            <th style={{ padding: "1rem", textAlign: "right", color: "#495057" }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCategories.length > 0 ? (
                            filteredCategories.map((cat) => (
                                <tr key={cat.id} style={{ borderBottom: "1px solid #dee2e6" }}>
                                    <td style={{ padding: "1rem", color: "#6c757d" }}>#{cat.id}</td>
                                    <td style={{ padding: "1rem", fontWeight: "500" }}>{cat.name}</td>
                                    <td style={{ padding: "1rem", textAlign: "right" }}>
                                        <button
                                            onClick={() => handleOpenModal(cat)}
                                            style={{ background: "none", border: "none", color: "#0d6efd", cursor: "pointer", padding: "0.5rem", marginRight: "0.5rem" }}
                                            title="Editar"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(cat.id)}
                                            style={{ background: "none", border: "none", color: "#dc3545", cursor: "pointer", padding: "0.5rem" }}
                                            title="Eliminar"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="3" style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)", fontSize: "1.1rem" }}>
                                    No se encontraron categorías.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "1rem", animation: "fadeIn 0.2s ease-out" }}>
                    <div className="modal-content" style={{ backgroundColor: "var(--color-bg-card)", borderRadius: "var(--border-radius-lg)", width: "100%", maxWidth: "500px", boxShadow: "var(--shadow-lg)", overflow: "hidden", animation: "slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}>
                        <div className="modal-header" style={{ padding: "2rem", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h2 style={{ margin: 0, fontSize: "1.5rem", color: "var(--color-text-main)", fontWeight: "700" }}>
                                {editingCategory ? "Editar Categoría" : "Nueva Categoría"}
                            </h2>
                            <button onClick={handleCloseModal} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: "0.5rem", transition: "color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.color = "var(--color-text-main)"} onMouseOut={(e) => e.currentTarget.style.color = "var(--color-text-muted)"}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="modal-body" style={{ padding: "2rem" }}>
                            {error && (
                                <div style={{ padding: "1rem", backgroundColor: "#FEF2F2", color: "var(--color-danger)", borderRadius: "12px", marginBottom: "1.5rem", border: "1px solid #FECACA", fontSize: "0.95rem" }}>
                                    {error}
                                </div>
                            )}
                            <form onSubmit={handleSubmit}>
                                <div style={{ marginBottom: "1.5rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "var(--color-text-main)", fontSize: "0.95rem" }}>
                                        Nombre de Categoría <span style={{ color: "var(--color-danger)" }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="Ej. Bebidas, Abarrotes, Lácteos"
                                        style={{ width: "100%", padding: "1rem", borderRadius: "12px", border: "1px solid var(--border-color)", fontSize: "1rem", boxSizing: "border-box", transition: "all 0.2s", outline: "none" }}
                                        onFocus={(e) => { e.target.style.borderColor = "var(--color-primary)"; e.target.style.boxShadow = "0 0 0 4px var(--color-primary-light)"; }}
                                        onBlur={(e) => { e.target.style.borderColor = "var(--border-color)"; e.target.style.boxShadow = "none"; }}
                                        autoFocus
                                    />
                                </div>

                                <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem" }}>
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        style={{ padding: "0.875rem 1.5rem", borderRadius: "12px", border: "1px solid var(--border-color)", backgroundColor: "transparent", color: "var(--color-text-main)", fontSize: "1rem", fontWeight: "600", cursor: "pointer", transition: "background 0.2s" }}
                                        onMouseOver={(e) => e.target.style.backgroundColor = "#F8FAFC"}
                                        onMouseOut={(e) => e.target.style.backgroundColor = "transparent"}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        style={{ padding: "0.875rem 1.75rem", borderRadius: "12px", border: "none", backgroundColor: "var(--color-primary)", color: "white", fontSize: "1rem", fontWeight: "600", cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1, boxShadow: "0 4px 12px rgba(46, 204, 113, 0.3)", transition: "all 0.2s" }}
                                        onMouseOver={(e) => !isSubmitting && (e.target.style.backgroundColor = "var(--color-primary-hover)")}
                                        onMouseOut={(e) => !isSubmitting && (e.target.style.backgroundColor = "var(--color-primary)")}
                                    >
                                        {isSubmitting ? "Guardando..." : "Guardar Categoría"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
