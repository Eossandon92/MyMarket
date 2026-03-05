import React, { useState, useEffect, useRef } from "react";
import { LayoutDashboard, ShoppingBag, Coffee, Apple, Settings, User, Tag, BarChart2, Calculator } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";
import { PlusCircle, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Sidebar = ({ categories, selectedCategory, onSelectCategory }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef(null);

    // Close user menu on outside click
    useEffect(() => {
        const handler = (e) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Map icons creatively based on category names
    const getIcon = (cat) => {
        const lowerCat = cat.toLowerCase();
        if (lowerCat.includes("todos") || lowerCat.includes("all")) return <LayoutDashboard size={20} />;
        if (lowerCat.includes("bebid") || lowerCat.includes("drink")) return <Coffee size={20} />;
        if (lowerCat.includes("frut") || lowerCat.includes("veget") || lowerCat.includes("verdura")) return <Apple size={20} />;
        return <ShoppingBag size={20} />;
    };

    return (
        <aside className="pos-sidebar">
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">
                    <ShoppingBag size={24} />
                </div>
                <h2>ALMARA</h2>
            </div>

            <div className="nav-section-title">Categorías</div>

            <nav className="sidebar-nav">
                {categories.map((cat, idx) => (
                    <button
                        key={idx}
                        className={`touch-btn category-btn ${selectedCategory === cat ? 'active' : ''}`}
                        onClick={() => onSelectCategory(cat)}
                    >
                        {getIcon(cat)}
                        <span>{cat}</span>
                    </button>
                ))}
            </nav>

            <div className="nav-section-title">Cuenta & Ajustes</div>
            <nav className="sidebar-nav" style={{ flex: 'none', paddingBottom: '1rem' }}>
                <Link to="/admin/products" style={{ textDecoration: 'none' }}>
                    <button className="touch-btn category-btn">
                        <ShoppingBag size={20} />
                        <span>Productos</span>
                    </button>
                </Link>
                <Link to="/admin/promotions" style={{ textDecoration: 'none', marginTop: '0.5rem' }}>
                    <button className="touch-btn category-btn">
                        <Tag size={20} />
                        <span>Promociones (Packs)</span>
                    </button>
                </Link>
                <Link to="/admin/add-stock" style={{ textDecoration: 'none', marginTop: '0.5rem' }}>
                    <button className="touch-btn category-btn">
                        <PlusCircle size={20} />
                        <span>Ingreso Mercadería</span>
                    </button>
                </Link>
                <Link to="/admin/categories" style={{ textDecoration: 'none', marginTop: '0.5rem' }}>
                    <button className="touch-btn category-btn">
                        <Tag size={20} />
                        <span>Categorías</span>
                    </button>
                </Link>
                <Link to="/admin/reports" style={{ textDecoration: 'none', marginTop: '0.5rem' }}>
                    <button className="touch-btn category-btn">
                        <BarChart2 size={20} />
                        <span>Reportes</span>
                    </button>
                </Link>
                <Link to="/admin/cash-register" style={{ textDecoration: 'none', marginTop: '0.5rem' }}>
                    <button className="touch-btn category-btn">
                        <Calculator size={20} />
                        <span>Cierre de Caja</span>
                    </button>
                </Link>
            </nav>

            <div className="sidebar-footer">
                <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <NotificationBell />
                </div>

                <div style={{ position: "relative" }} ref={userMenuRef}>
                    <div
                        className="user-profile"
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        style={{ cursor: "pointer", transition: "all 0.2s" }}
                        onMouseOver={(e) => e.currentTarget.style.background = "#e2e8f0"}
                        onMouseOut={(e) => e.currentTarget.style.background = "#f8fafc"}
                    >
                        <div className="avatar">
                            <User size={24} color="#95A5A6" />
                        </div>
                        <div className="user-info" style={{ flex: 1 }}>
                            <span className="user-name">{user?.name || 'Cajero'}</span>
                            <span className="user-role">{user?.role === 'admin' ? 'Administrador' : 'Cajero'}</span>
                        </div>
                    </div>

                    {/* Pop-up Menu */}
                    {userMenuOpen && (
                        <div style={{
                            position: "absolute",
                            bottom: "65px",
                            left: "0",
                            width: "100%",
                            background: "white",
                            borderRadius: "12px",
                            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                            border: "1px solid #e2e8f0",
                            padding: "0.5rem",
                            zIndex: 100,
                            animation: "fadeIn 0.2s ease-out"
                        }}>
                            <button
                                onClick={() => {
                                    alert("Perfil: En construcción");
                                    setUserMenuOpen(false);
                                }}
                                style={{
                                    width: "100%", textAlign: "left", background: "transparent", border: "none",
                                    padding: "0.75rem 1rem", borderRadius: "8px", cursor: "pointer",
                                    display: "flex", alignItems: "center", gap: "0.5rem",
                                    fontWeight: 600, color: "#334155", transition: "background 0.2s"
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = "#f1f5f9"}
                                onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                            >
                                <User size={18} /> Perfil
                            </button>
                            <button
                                onClick={() => {
                                    setUserMenuOpen(false);
                                    logout();
                                    navigate('/login');
                                }}
                                style={{
                                    width: "100%", textAlign: "left", background: "transparent", border: "none",
                                    padding: "0.75rem 1rem", borderRadius: "8px", cursor: "pointer",
                                    display: "flex", alignItems: "center", gap: "0.5rem",
                                    fontWeight: 600, color: "#ef4444", transition: "background 0.2s"
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = "#fef2f2"}
                                onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                            >
                                <LogOut size={18} /> Cerrar Sesión
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};
