import React from "react";
import { Plus } from "lucide-react";

export const ProductCard = ({ product, onAdd }) => {
    return (
        <article className="product-card">
            <div className="product-image-container">
                {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="product-image" />
                ) : (
                    <img src={`https://ui-avatars.com/api/?name=${product.name}&background=E8F8F5&color=2ECC71&size=150&font-size=0.33`} alt={product.name} className="product-image" />
                )}
            </div>
            <div className="product-info">
                <h3 className="product-name">{product.name}</h3>
                <p className="product-subtitle">{product.category || "General"}</p>

                <div className="product-footer">
                    <span className="product-price">${product.price.toLocaleString("es-CL")}</span>
                    <button
                        className="touch-btn add-btn"
                        onClick={() => onAdd(product)}
                        aria-label="Add to cart"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </div>
        </article>
    );
};
