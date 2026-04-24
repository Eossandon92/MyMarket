import React, { useState, useEffect, useRef } from "react";
import { LayoutDashboard, ShoppingBag, Coffee, Apple, Settings, User, Tag, BarChart2, Calculator, Users, DollarSign } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { PlusCircle, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { BusinessProfileModal } from "./BusinessProfileModal";

export const Sidebar = ({ categories, selectedCategory, onSelectCategory }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [profileModalOpen, setProfileModalOpen] = useState(false);
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
            <div className="sidebar-logo" style={{ padding: '0.5rem 1.25rem', paddingBottom: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {user?.business?.logo_url ? (
                    <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        <img src={user.business.logo_url} alt={user.business.name} style={{ maxHeight: "200px", maxWidth: "100%", width: "auto", height: "auto", objectFit: "contain" }} />
                    </div>
                ) : (
                    <>
                        <div className="sidebar-logo-icon" style={{ width: '40px', height: '40px' }}>
                            <ShoppingBag size={24} />
                        </div>
                        <h2 style={{ fontSize: "1.9rem", fontWeight: 950, margin: 0, letterSpacing: "-1.2px" }}>
                            <span style={{ color: "#fbc531" }}>Z</span>
                            <span style={{ color: "#eb4d4b" }}>o</span>
                            <span style={{ color: "#27ae60" }}>k</span>
                            <span style={{ color: "#00a8ff" }}>o</span>
                        </h2>
                    </>
                )}
            </div>



            <div className="nav-section-title" style={{ marginTop: 0, paddingTop: "0.25rem" }}>{user?.role === 'admin' ? 'Administración' : 'Operaciones'}</div>
            <nav className="sidebar-nav" style={{ flex: 1, paddingBottom: '1rem' }}>
                {user?.role === 'admin' && (
                    <>
                        <Link to="/admin/products" style={{ textDecoration: 'none' }}>
                            <button className="touch-btn category-btn">
                                <ShoppingBag size={20} />
                                <span>Productos</span>
                            </button>
                        </Link>
                        <Link to="/admin/categories" style={{ textDecoration: 'none', marginTop: '0.5rem' }}>
                            <button className="touch-btn category-btn">
                                <Tag size={20} />
                                <span>Categorías</span>
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
                        <Link to="/admin/reports" style={{ textDecoration: 'none', marginTop: '0.5rem' }}>
                            <button className="touch-btn category-btn">
                                <BarChart2 size={20} />
                                <span>Reportes</span>
                            </button>
                        </Link>
                        <Link to="/admin/users" style={{ textDecoration: 'none', marginTop: '0.5rem' }}>
                            <button className="touch-btn category-btn">
                                <Users size={20} />
                                <span>Personal</span>
                            </button>
                        </Link>
                        <Link to="/admin/balance" style={{ textDecoration: 'none', marginTop: '0.5rem' }}>
                            <button className="touch-btn category-btn">
                                <DollarSign size={20} />
                                <span>Balance</span>
                            </button>
                        </Link>
                    </>
                )}
                <Link to="/admin/cash-register" style={{ textDecoration: 'none', marginTop: '0.5rem' }}>
                    <button className="touch-btn category-btn">
                        <Calculator size={20} />
                        <span>Cierre de Caja</span>
                    </button>
                </Link>
            </nav>

            <div className="sidebar-footer" style={{ padding: "0.75rem 1.5rem 1.5rem 1.5rem" }}>
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
                                    setProfileModalOpen(true);
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

            {profileModalOpen && (
                <BusinessProfileModal onClose={() => setProfileModalOpen(false)} />
            )}
        </aside>
    );
};
