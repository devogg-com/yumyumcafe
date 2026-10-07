import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import api from '../lib/api';
import {
  FolderPlus,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Search,
  CheckCircle2,
  XCircle,
  Tag,
  Utensils
} from 'lucide-react';

export default function MenuPage() {
  const { user, showToast } = useApp();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCatFilter, setSelectedCatFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Category Modal state
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catEditing, setCatEditing] = useState(null);
  const [catName, setCatName] = useState('');

  // Product Modal state
  const [prodModalOpen, setProdModalOpen] = useState(false);
  const [prodEditing, setProdEditing] = useState(null);
  const [prodForm, setProdForm] = useState({
    name: '',
    category_id: '',
    price: '',
    is_available: true
  });

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [cats, prods] = await Promise.all([
        api.getCategories(user.id),
        api.getProducts(user.id)
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
    loadData();
  }, [loadData]);

  // --- Category Handlers ---
  const handleOpenCatModal = (cat = null) => {
    setCatEditing(cat);
    setCatName(cat ? cat.name : '');
    setCatModalOpen(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!catName.trim()) {
      showToast('Category name is required.', 'error');
      return;
    }

    try {
      if (catEditing) {
        await api.updateCategory(user.id, catEditing.id, catName.trim(), catEditing.display_order);
        showToast('Category renamed.', 'success');
      } else {
        await api.createCategory(user.id, catName.trim(), categories.length + 1);
        showToast('Category created.', 'success');
      }
      setCatModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteCategory = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete category "${name}"?`)) return;
    try {
      await api.deleteCategory(user.id, id);
      showToast('Category deleted.', 'success');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleMoveCategory = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const newCats = [...categories];
    const temp = newCats[index];
    newCats[index] = newCats[targetIndex];
    newCats[targetIndex] = temp;

    const reorderPayload = newCats.map((c, i) => ({ id: c.id, display_order: i + 1 }));
    try {
      await api.reorderCategories(user.id, reorderPayload);
      setCategories(newCats);
    } catch (err) {
      showToast('Reorder failed: ' + err.message, 'error');
    }
  };

  // --- Product Handlers ---
  const handleOpenProdModal = (prod = null) => {
    setProdEditing(prod);
    setProdForm({
      name: prod ? prod.name : '',
      category_id: prod ? prod.category_id : (categories[0] ? categories[0].id : ''),
      price: prod ? String(prod.price) : '',
      is_available: prod ? (prod.is_available === 1) : true
    });
    setProdModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!prodForm.name.trim()) {
      showToast('Product name is required.', 'error');
      return;
    }
    if (!prodForm.category_id) {
      showToast('Please select a category.', 'error');
      return;
    }
    const numPrice = parseFloat(prodForm.price);
    if (isNaN(numPrice) || numPrice < 0) {
      showToast('Please enter a valid price.', 'error');
      return;
    }

    try {
      if (prodEditing) {
        await api.updateProduct(user.id, prodEditing.id, {
          name: prodForm.name.trim(),
          category_id: prodForm.category_id,
          price: numPrice,
          is_available: prodForm.is_available ? 1 : 0
        });
        showToast('Product updated.', 'success');
      } else {
        await api.createProduct(user.id, {
          name: prodForm.name.trim(),
          category_id: prodForm.category_id,
          price: numPrice,
          is_available: prodForm.is_available ? 1 : 0
        });
        showToast('Product created.', 'success');
      }
      setProdModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete product "${name}"?`)) return;
    try {
      await api.deleteProduct(user.id, id);
      showToast('Product deleted.', 'success');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleAvailability = async (prod) => {
    try {
      const newStatus = prod.is_available === 1 ? 0 : 1;
      await api.updateProduct(user.id, prod.id, { is_available: newStatus });
      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, is_available: newStatus } : p))
      );
    } catch (err) {
      showToast('Failed to toggle availability.', 'error');
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCatFilter === 'all' || p.category_id === selectedCatFilter;
    const matchSearch = !search.trim() || p.name.toLowerCase().includes(search.trim().toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="page-container">
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '22px', height: '100%' }}>
        {/* LEFT COLUMN: Categories CRUD & Reorder */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tag size={18} color="#1e3a8a" />
              <span>Categories</span>
            </h3>
            <button
              onClick={() => handleOpenCatModal(null)}
              className="btn btn-primary btn-sm"
            >
              <Plus size={14} />
              <span>Add</span>
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {categories.length === 0 ? (
              <div style={{ padding: '30px 10px', textAlign: 'center', color: '#94a3b8' }}>
                <p>No categories yet.</p>
                <p style={{ fontSize: '12px' }}>Click Add to create categories like Beverages, Snacks, Meals.</p>
              </div>
            ) : (
              categories.map((cat, idx) => (
                <div
                  key={cat.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc'
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a' }}>{cat.name}</span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {/* Reorder Buttons */}
                    <button
                      disabled={idx === 0}
                      onClick={() => handleMoveCategory(idx, -1)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: idx === 0 ? '#cbd5e1' : '#64748b' }}
                      title="Move Up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      disabled={idx === categories.length - 1}
                      onClick={() => handleMoveCategory(idx, 1)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: idx === categories.length - 1 ? '#cbd5e1' : '#64748b' }}
                      title="Move Down"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      onClick={() => handleOpenCatModal(cat)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#2563eb', marginLeft: '4px' }}
                      title="Rename"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Products Table & CRUD */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Utensils size={18} color="#1e3a8a" />
                <span>Menu Products ({filteredProducts.length})</span>
              </h3>
            </div>
            <button
              onClick={() => handleOpenProdModal(null)}
              disabled={categories.length === 0}
              className="btn btn-royal"
            >
              <Plus size={16} />
              <span>Add Product</span>
            </button>
          </div>

          {/* Filter & Search Bar */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '34px', height: '38px', fontSize: '13px' }}
              />
            </div>
            <select
              className="form-select"
              value={selectedCatFilter}
              onChange={(e) => setSelectedCatFilter(e.target.value)}
              style={{ width: '200px', height: '38px', fontSize: '13px' }}
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Products Table */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {categories.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                Please create at least one category on the left before adding products.
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                No products match the filter. Click "Add Product" to add a new item.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 800, color: '#1e3a8a' }}>PRODUCT NAME</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800, color: '#1e3a8a' }}>CATEGORY</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800, color: '#1e3a8a', textAlign: 'right' }}>PRICE</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800, color: '#1e3a8a', textAlign: 'center' }}>AVAILABILITY</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800, color: '#1e3a8a', textAlign: 'center' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>{p.name}</td>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>{p.category_name || '—'}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#1e3a8a' }}>
                        ₹{Number(p.price).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleToggleAvailability(p)}
                          style={{
                            border: 'none',
                            background: p.is_available === 1 ? '#ecfdf5' : '#fff1f2',
                            color: p.is_available === 1 ? '#059669' : '#e11d48',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontWeight: 700,
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          {p.is_available === 1 ? 'Available' : 'Unavailable'}
                        </button>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            onClick={() => handleOpenProdModal(p)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px' }}
                            title="Edit"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px', color: '#ef4444' }}
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Category Create/Edit Modal */}
      {catModalOpen && (
        <div className="modal-overlay" onClick={() => setCatModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '380px', padding: '24px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 900, marginBottom: '16px', color: '#0f172a' }}>
              {catEditing ? 'Rename Category' : 'Create New Category'}
            </h3>
            <form onSubmit={handleSaveCategory}>
              <div className="form-group">
                <label className="form-label">Category Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Hot Coffee, Shakes, Sandwiches"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setCatModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Create/Edit Modal */}
      {prodModalOpen && (
        <div className="modal-overlay" onClick={() => setProdModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '440px', padding: '24px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 900, marginBottom: '16px', color: '#0f172a' }}>
              {prodEditing ? 'Edit Product' : 'Add New Product'}
            </h3>
            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Product Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Yum Yum Cappuccino"
                  value={prodForm.name}
                  onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Category *</label>
                <select
                  className="form-select"
                  value={prodForm.category_id}
                  onChange={(e) => setProdForm({ ...prodForm, category_id: e.target.value })}
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Price (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  placeholder="e.g. 120"
                  value={prodForm.price}
                  onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <input
                  type="checkbox"
                  id="avail_check"
                  checked={prodForm.is_available}
                  onChange={(e) => setProdForm({ ...prodForm, is_available: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="avail_check" style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}>
                  Product is currently available for ordering
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setProdModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {prodEditing ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
