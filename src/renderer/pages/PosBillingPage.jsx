import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import api from '../lib/api';
import ReceiptPreviewModal from '../components/ReceiptPreviewModal';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Percent,
  Coins,
  QrCode,
  Printer,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';

export default function PosBillingPage() {
  const { user, settings, activeStaff, showToast } = useApp();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Cart state
  const [cart, setCart] = useState([]);
  const [discountType, setDiscountType] = useState('none'); // 'none' | 'percent' | 'fixed'
  const [discountValue, setDiscountValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash'); // 'Cash' | 'UPI' ONLY!
  const [submitting, setSubmitting] = useState(false);
  const [createdBill, setCreatedBill] = useState(null);

  // Load menu items
  const loadMenuData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [cats, prods] = await Promise.all([
        api.getCategories(user.id),
        api.getProducts(user.id, { available_only: true })
      ]);
      setCategories(cats || []);
      setProducts(prods || []);
    } catch (err) {
      showToast('Error loading menu: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    loadMenuData();
  }, [loadMenuData]);

  // Cart Actions
  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1, total_price: Number(((item.quantity + 1) * item.unit_price).toFixed(2)) }
            : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          unit_price: Number(product.price),
          quantity: 1,
          total_price: Number(product.price)
        }
      ];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product_id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              total_price: Number((newQty * item.unit_price).toFixed(2))
            };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountType('none');
    setDiscountValue('');
    setPaymentMethod('Cash');
  };

  // Computations
  const subtotal = useMemo(() => {
    const sum = cart.reduce((acc, item) => acc + item.total_price, 0);
    return Number(sum.toFixed(2));
  }, [cart]);

  const discountAmount = useMemo(() => {
    const val = parseFloat(discountValue) || 0;
    if (discountType === 'percent') {
      const p = Math.min(Math.max(val, 0), 100);
      return Number(((subtotal * p) / 100).toFixed(2));
    }
    if (discountType === 'fixed') {
      return Number(Math.min(Math.max(val, 0), subtotal).toFixed(2));
    }
    return 0;
  }, [subtotal, discountType, discountValue]);

  const grandTotal = useMemo(() => {
    return Number(Math.max(0, subtotal - discountAmount).toFixed(2));
  }, [subtotal, discountAmount]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
      const matchSearch = !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Handle Bill Generation
  const handleGenerateBill = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty. Please add items to bill.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const billData = {
        items: cart,
        staff_name: activeStaff || 'Staff',
        discount_type: discountType,
        discount_value: parseFloat(discountValue) || 0,
        payment_method: paymentMethod
      };

      const created = await api.createBill(user.id, billData);
      setCreatedBill(created);
      clearCart();
      showToast(`Bill #${created.bill_number} generated successfully!`, 'success');
    } catch (err) {
      showToast('Error generating bill: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const upiId = settings && settings.upi_id;
  const upiQr = settings && settings.upi_qr_data;

  return (
    <div className="pos-layout">
      {/* LEFT: Menu Catalog & Categories */}
      <div className="pos-catalog">
        {/* Search & Stats Bar */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search dishes, snacks, beverages (or press /)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '38px', height: '42px' }}
            />
          </div>
          <button onClick={loadMenuData} className="btn btn-secondary" title="Refresh menu">
            Refresh
          </button>
        </div>

        {/* Category Pills */}
        <div className="category-tabs">
          <button
            className={`category-tab ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            All Items ({products.length})
          </button>
          {categories.map((c) => {
            const count = products.filter((p) => p.category_id === c.id).length;
            return (
              <button
                key={c.id}
                className={`category-tab ${selectedCategory === c.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(c.id)}
              >
                {c.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Product Cards Grid */}
        <div className="product-grid">
          {filteredProducts.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <p style={{ fontSize: '16px', fontWeight: 700 }}>No items found.</p>
              <p style={{ fontSize: '13px', marginTop: '6px' }}>
                {products.length === 0 ? 'Create menu categories and items in the Menu tab.' : 'Try a different search query or category filter.'}
              </p>
            </div>
          ) : (
            filteredProducts.map((p) => (
              <div
                key={p.id}
                className="product-card"
                onClick={() => addToCart(p)}
              >
                <div>
                  <div className="product-name">{p.name}</div>
                  <div className="product-category-tag">{p.category_name || 'Item'}</div>
                </div>
                <div className="product-footer">
                  <div className="product-price">₹{Number(p.price).toFixed(2)}</div>
                  <div className="product-add-badge">
                    <Plus size={16} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT: Order Cart & Bill Checkout */}
      <div className="pos-cart-panel">
        {/* Cart Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1.5px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>Current Order</div>
            <div style={{ fontSize: '11.5px', color: '#64748b' }}>
              Staff: <strong>{activeStaff || 'Staff'}</strong>
            </div>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="btn btn-secondary btn-sm"
              style={{ color: '#e11d48', borderColor: '#fecdd3' }}
            >
              <Trash2 size={13} />
              <span>Clear Cart</span>
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
          {cart.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e3a8a', marginBottom: '10px' }}>
                <Coins size={22} />
              </div>
              <p style={{ fontWeight: 700, fontSize: '14px', color: '#475569' }}>Order is empty</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>Click any menu item to add it to this bill</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {cart.map((item) => (
                <div
                  key={item.product_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <div style={{ flex: 1, paddingRight: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{item.product_name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      ₹{item.unit_price.toFixed(2)} × {item.quantity} = <strong>₹{item.total_price.toFixed(2)}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => updateQuantity(item.product_id, -1)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#0f172a'
                      }}
                    >
                      <Minus size={12} />
                    </button>
                    <span style={{ fontSize: '13px', fontWeight: 800, width: '22px', textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product_id, 1)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#0f172a'
                      }}
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.product_id)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        marginLeft: '4px',
                        padding: '4px'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Discount & Calculations Section */}
        <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0', background: '#ffffff' }}>
          {/* Discount Controls */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                Apply Discount
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setDiscountType('none')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: '1px solid #e2e8f0',
                    background: discountType === 'none' ? '#1e3a8a' : '#fff',
                    color: discountType === 'none' ? '#fff' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  None
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('percent')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: '1px solid #e2e8f0',
                    background: discountType === 'percent' ? '#1e3a8a' : '#fff',
                    color: discountType === 'percent' ? '#fff' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  % Percent
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('fixed')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: '1px solid #e2e8f0',
                    background: discountType === 'fixed' ? '#1e3a8a' : '#fff',
                    color: discountType === 'fixed' ? '#fff' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  ₹ Flat
                </button>
              </div>
            </div>

            {discountType !== 'none' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  min="0"
                  max={discountType === 'percent' ? 100 : subtotal}
                  className="form-input"
                  placeholder={discountType === 'percent' ? 'Discount % (e.g. 10)' : 'Discount Amount (₹)'}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '13px' }}
                />
              </div>
            )}
          </div>

          {/* Payment Method Selector (CASH vs UPI ONLY) */}
          <div style={{ marginBottom: '14px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              Payment Method (Cash or UPI Only)
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setPaymentMethod('Cash')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px',
                  borderRadius: '8px',
                  border: paymentMethod === 'Cash' ? '2px solid #10b981' : '1.5px solid #e2e8f0',
                  background: paymentMethod === 'Cash' ? '#ecfdf5' : '#fff',
                  color: paymentMethod === 'Cash' ? '#065f46' : '#64748b',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <Coins size={16} />
                <span>CASH</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px',
                  borderRadius: '8px',
                  border: paymentMethod === 'UPI' ? '2px solid #8b5cf6' : '1.5px solid #e2e8f0',
                  background: paymentMethod === 'UPI' ? '#f5f3ff' : '#fff',
                  color: paymentMethod === 'UPI' ? '#6d28d9' : '#64748b',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <QrCode size={16} />
                <span>UPI DIGITAL</span>
              </button>
            </div>

            {/* UPI QR & ID Box: ONLY SHOWN IF UPI PAYMENT SELECTED */}
            {paymentMethod === 'UPI' && (
              <div style={{
                marginTop: '10px',
                padding: '10px',
                borderRadius: '8px',
                background: '#faf5ff',
                border: '1px dashed #c084fc',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#7e22ce' }}>
                  CUSTOMER WILL SCAN QR TO PAY
                </div>
                {upiQr ? (
                  <img
                    src={upiQr}
                    alt="UPI QR Code"
                    style={{
                      maxWidth: '90px',
                      maxHeight: '90px',
                      margin: '6px auto',
                      display: 'block',
                      borderRadius: '4px'
                    }}
                  />
                ) : (
                  <div style={{ fontSize: '11px', color: '#9333ea', padding: '6px' }}>
                    [Upload your UPI QR in Settings to show QR here]
                  </div>
                )}
                {upiId && (
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#581c87' }}>
                    UPI ID: {upiId}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Subtotal, Discount & Grand Total Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px', fontSize: '12.5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d97706', fontWeight: 700 }}>
                <span>Discount:</span>
                <span>- ₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '18px',
              fontWeight: 900,
              color: '#0f1f4b',
              paddingTop: '6px',
              borderTop: '1.5px dashed #e2e8f0',
              marginTop: '4px'
            }}>
              <span>Grand Total:</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Checkout & Print Button */}
          <button
            onClick={handleGenerateBill}
            disabled={cart.length === 0 || submitting}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', height: '48px', fontSize: '16px' }}
          >
            <Printer size={18} />
            <span>{submitting ? 'Generating Bill...' : `Complete & Print Bill (₹${grandTotal.toFixed(2)})`}</span>
          </button>
        </div>
      </div>

      {/* Instant Bill Preview Modal after checkout */}
      {createdBill && (
        <ReceiptPreviewModal
          bill={createdBill}
          onClose={() => setCreatedBill(null)}
        />
      )}
    </div>
  );
}
