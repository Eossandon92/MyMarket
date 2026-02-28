import React from "react";
import { ShoppingBag, Minus, Plus, Trash2, ArrowRight } from "lucide-react";

export const Cart = ({ cart, onUpdateQuantity, onRemove, onCheckout }) => {
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    // Let's add a fixed devlivery fee or tax simulation for 'premium' feel in the mockup
    const deliveryFee = cart.length > 0 ? 0 : 0;
    const total = subtotal + deliveryFee;

    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

    return (
        <aside className="pos-cart">
            <div className="cart-header">
                <div className="cart-title-row">
                    <ShoppingBag size={24} color="#2C3E50" />
                    <h2>Your Cart</h2>
                </div>
                <span className="cart-count">{totalItems} Items</span>
            </div>

            <div className="cart-items">
                {cart.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '3rem', color: '#95A5A6' }}>
                        <ShoppingBag size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                        <p>Your cart is empty</p>
                    </div>
                ) : (
                    cart.map((item) => (
                        <div key={item.id} className="cart-item">
                            <div className="cart-item-img">
                                {item.image_url ? (
                                    <img src={item.image_url} alt={item.name} />
                                ) : (
                                    <img src={`https://ui-avatars.com/api/?name=${item.name}&background=E8F8F5&color=2ECC71&size=64`} alt={item.name} />
                                )}
                            </div>

                            <div className="cart-item-info">
                                <div>
                                    <h4>{item.name}</h4>
                                    <span className="cart-item-price">${item.price.toLocaleString("es-CL")}</span>
                                </div>
                                <div className="cart-item-controls">
                                    <button className="touch-btn control-btn" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}>
                                        <Minus size={14} />
                                    </button>
                                    <span style={{ fontWeight: 600, minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                                    <button className="touch-btn control-btn" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>
                                        <Plus size={14} />
                                    </button>
                                    <button
                                        className="touch-btn control-btn"
                                        style={{ marginLeft: 'auto', border: 'none', color: '#ef4444', background: '#FEE2E2' }}
                                        onClick={() => onRemove(item.id)}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="cart-summary">
                <div className="summary-row">
                    <span>Subtotal</span>
                    <span>${subtotal.toLocaleString("es-CL")}</span>
                </div>
                <div className="summary-row">
                    <span>Delivery Fee</span>
                    <span style={{ color: '#2ECC71', fontWeight: 600 }}>Free</span>
                </div>
                <div className="summary-row total">
                    <span>Total</span>
                    <span>${total.toLocaleString("es-CL")}</span>
                </div>

                <button
                    className="touch-btn checkout-btn"
                    disabled={cart.length === 0}
                    onClick={onCheckout}
                    style={{ opacity: cart.length === 0 ? 0.6 : 1 }}
                >
                    Checkout Now <ArrowRight size={20} />
                </button>
            </div>
        </aside>
    );
};
