import React, { useState } from "react";
import { CreditCard, Banknote, X } from "lucide-react";

export const CheckoutModal = ({ total, onClose, onConfirm }) => {
    const [cashReceived, setCashReceived] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("cash");

    const handleCashChange = (e) => {
        setCashReceived(e.target.value);
    };

    const cash = parseFloat(cashReceived) || 0;
    const change = cash - total;
    const isValid = paymentMethod === "card" || cash >= total;

    // Preset buttons for fast touch interaction
    const presetAmounts = [
        total,
        Math.ceil(total / 1000) * 1000,
        Math.ceil(total / 5000) * 5000,
        Math.ceil(total / 10000) * 10000,
        Math.ceil(total / 20000) * 20000,
    ].filter((a, i, arr) => arr.indexOf(a) === i && a >= total);

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '600px', padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 className="modal-title" style={{ margin: 0, textAlign: 'left', fontSize: '1.4rem' }}>Payment</h2>
                    <button className="touch-btn" onClick={onClose} style={{ background: 'transparent', color: '#95A5A6' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', padding: '2rem' }}>
                    <div>
                        <h4 style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase' }}>Payment Method</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button
                                className={`touch-btn category-btn ${paymentMethod === 'cash' ? 'active' : ''}`}
                                onClick={() => setPaymentMethod('cash')}
                                style={{ justifyContent: 'center', textAlign: 'center' }}
                            >
                                <Banknote size={20} />
                                <span>Cash</span>
                            </button>
                            <button
                                className={`touch-btn category-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                                onClick={() => setPaymentMethod('card')}
                                style={{ justifyContent: 'center', textAlign: 'center' }}
                            >
                                <CreditCard size={20} />
                                <span>Card / Mobile</span>
                            </button>
                        </div>
                    </div>

                    <div className="payment-details" style={{ margin: 0 }}>
                        <div className="payment-row total-row" style={{ color: 'var(--color-primary)', fontSize: '1.8rem' }}>
                            <span>Total:</span>
                            <span>${total.toLocaleString("es-CL")}</span>
                        </div>

                        {paymentMethod === 'cash' && (
                            <>
                                <div className="payment-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                                    <label htmlFor="cash" style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Amount Received</label>
                                    <input
                                        type="number"
                                        id="cash"
                                        className="cash-input"
                                        style={{ width: '100%', fontSize: '1.8rem', padding: '0.75rem', borderRadius: '12px', border: '2px solid var(--border-color)' }}
                                        value={cashReceived}
                                        onChange={handleCashChange}
                                        autoFocus
                                    />
                                </div>

                                <div className="preset-buttons" style={{ justifyContent: 'flex-start' }}>
                                    {presetAmounts.map((amt) => (
                                        <button
                                            key={amt}
                                            className="touch-btn preset-btn"
                                            style={{ background: '#F8FAFC', color: 'var(--color-text-main)', border: '1px solid var(--border-color)' }}
                                            onClick={() => setCashReceived(amt.toString())}
                                        >
                                            ${amt.toLocaleString("es-CL")}
                                        </button>
                                    ))}
                                </div>

                                <div className={`payment-row change-row ${change >= 0 ? 'valid' : 'invalid'}`} style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                                    <span>Change:</span>
                                    <span>${change > 0 ? change.toLocaleString("es-CL") : "0"}</span>
                                </div>
                            </>
                        )}

                        {paymentMethod === 'card' && (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                <p>Please insert, swipe, or tap card on the terminal.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-actions" style={{ padding: '1.5rem 2rem', background: '#F8FAFC', borderTop: '1px solid var(--border-color)' }}>
                    <button className="touch-btn cancel-btn" style={{ borderRadius: '12px' }} onClick={onClose}>Cancel</button>
                    <button
                        className="touch-btn confirm-btn"
                        style={{ borderRadius: '12px', fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(46, 204, 113, 0.3)' }}
                        disabled={!isValid}
                        onClick={onConfirm}
                    >
                        Confirm Payment
                    </button>
                </div>
            </div>
        </div>
    );
};
