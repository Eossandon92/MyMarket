import React from "react";
import { LayoutDashboard, ShoppingBag, Coffee, Apple, Settings, User, Tag, BarChart2, Calculator } from "lucide-react";
import { Link } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";
import { PlusCircle } from "lucide-react";

export const Sidebar = ({ categories, selectedCategory, onSelectCategory }) => {
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
                <div style={{ marginBottom: '0.75rem' }}>
                    <NotificationBell />
                </div>
                <div className="user-profile">
                    <div className="avatar">
                        <User size={24} color="#95A5A6" />
                    </div>
                    <div className="user-info">
                        <span className="user-name">Alex Johnson</span>
                        <span className="user-role">Cajero Tarde</span>
                    </div>
                </div>
            </div>
        </aside>
    );
};
