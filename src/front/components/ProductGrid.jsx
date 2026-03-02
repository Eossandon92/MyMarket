import React from "react";
import { ProductCard } from "./ProductCard";

export const ProductGrid = ({ products, onAddProduct }) => {
    return (
        <div className="product-grid">
            {products.map((prod) => (
                <ProductCard key={prod.id} product={prod} onAdd={onAddProduct} />
            ))}
            {products.length === 0 && (
                <div className="empty-products">
                    <p>No se encontraron productos en esta categoría.</p>
                </div>
            )}
        </div>
    );
};
