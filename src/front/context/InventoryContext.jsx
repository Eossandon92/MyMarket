import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth, API } from "./AuthContext";

const InventoryContext = createContext(null);

export const InventoryProvider = ({ children }) => {
    const { businessId, token, isAuthenticated } = useAuth();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);
    const [error, setError] = useState(null);

    const fetchProducts = useCallback(async () => {
        if (!businessId || !token) return;
        setIsLoadingProducts(true);
        try {
            const [resProd, resPromo] = await Promise.all([
                fetch(`${API}/products?business_id=${businessId}`, { headers: { "Authorization": `Bearer ${token}` } }),
                fetch(`${API}/promotions?business_id=${businessId}`, { headers: { "Authorization": `Bearer ${token}` } })
            ]);

            if (resProd.ok && resPromo.ok) {
                const productsData = await resProd.json();
                const promosData = await resPromo.json();
                setProducts([...promosData, ...productsData]);
            }
        } catch (err) {
            console.error("Error fetching products:", err);
            setError("Error al cargar productos");
        } finally {
            setIsLoadingProducts(false);
        }
    }, [businessId, token]);

    const fetchCategories = useCallback(async () => {
        if (!businessId || !token) return;
        setIsLoadingCategories(true);
        try {
            const res = await fetch(`${API}/categories?business_id=${businessId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
            }
        } catch (err) {
            console.error("Error fetching categories:", err);
            setError("Error al cargar categorías");
        } finally {
            setIsLoadingCategories(false);
        }
    }, [businessId, token]);

    // Fetch initial data when authenticated
    useEffect(() => {
        if (isAuthenticated && businessId) {
            fetchProducts();
            fetchCategories();
        } else {
            setProducts([]);
            setCategories([]);
        }
    }, [isAuthenticated, businessId, fetchProducts, fetchCategories]);

    const value = {
        products,
        categories,
        isLoading: isLoadingProducts || isLoadingCategories,
        isLoadingProducts,
        isLoadingCategories,
        error,
        fetchProducts,
        fetchCategories,
        refreshAll: () => { fetchProducts(); fetchCategories(); }
    };

    return (
        <InventoryContext.Provider value={value}>
            {children}
        </InventoryContext.Provider>
    );
};

export const useInventory = () => {
    const context = useContext(InventoryContext);
    if (!context) {
        throw new Error("useInventory must be used within an InventoryProvider");
    }
    return context;
};
