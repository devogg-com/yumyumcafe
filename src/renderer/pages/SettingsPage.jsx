import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../lib/api';
import {
  Store,
  QrCode,
  Users,
  Printer,
  Save,
  Plus,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function SettingsPage() {
  const {
    user,
    settings,
    setSettings,
    staffList,
    setStaffList,
    logoUrl,
    showToast,
    serverUrl,
    setActiveTab
  } = useApp();

  const [form, setForm] = useState({
    cafe_name: 'Yum Yum Cafe',
    owner_name: '',
    address: '',
    phone: '',
    upi_id: '',
    upi_qr_data: '',
    receipt_paper_width: '80mm'
  });

  const [newStaffName, setNewStaffName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        cafe_name: settings.cafe_name || 'Yum Yum Cafe',
        owner_name: settings.owner_name || (user ? user.owner_name : ''),
        address: settings.address || '',
        phone: settings.phone || '',
        upi_id: settings.upi_id || '',
        upi_qr_data: settings.upi_qr_data || '',
        receipt_paper_width: settings.receipt_paper_width || '80mm'
      });
    }
  }, [settings, user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const updated = await api.updateSettings(user.id, form);
      setSettings(updated);
      showToast('Cafe settings updated successfully!', 'success');
    } catch (err) {
      showToast('Error saving settings: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // QR Code Image Upload handler
  const handleQrUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please upload a valid image file (PNG, JPG).', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file too large. Max size is 5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64Data = uploadEvent.target.result;
      setForm((prev) => ({ ...prev, upi_qr_data: base64Data }));
      showToast('UPI QR code uploaded. Click "Save Settings" to persist.', 'info');
    };
    reader.readAsDataURL(file);
  };

  // Staff Handlers
  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;
    try {
      const added = await api.addStaff(user.id, newStaffName.trim());
      setStaffList((prev) => [...prev, added]);
      setNewStaffName('');
      showToast(`Staff member "${added.name}" added.`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteStaff = async (id, name) => {
    if (!window.confirm(`Remove staff member "${name}"?`)) return;
    try {
      await api.deleteStaff(user.id, id);
      setStaffList((prev) => prev.filter((s) => s.id !== id));
      showToast('Staff member removed.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="page-container">
      <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {/* Section 1: Cafe Profile */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Store size={18} color="#1e3a8a" />
              <span>Cafe Profile & Receipt Details</span>
            </h3>
            <button type="submit" disabled={saving} className="btn btn-primary">
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '24px' }}>
            {/* Logo Display */}
            <div style={{ textAlign: 'center', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>
                Official Cafe Logo
              </div>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Yum Yum Cafe Logo"
                  style={{
                    maxWidth: '120px',
                    maxHeight: '120px',
                    objectFit: 'contain',
                    margin: '0 auto',
                    display: 'block',
                    borderRadius: '8px',
                    border: '2px solid #fbbf24',
                    background: '#fff',
                    padding: '4px'
                  }}
                />
              ) : (
                <div style={{
                  padding: '16px 10px',
                  background: '#fff1f2',
                  border: '1px solid #fecdd3',
                  borderRadius: '8px',
                  color: '#9f1239',
                  fontSize: '11px',
                  fontWeight: 600
                }}>
                  <AlertCircle size={20} style={{ margin: '0 auto 6px auto', display: 'block' }} />
                  Setup Notice: 'Yum Yum Cafe Logo.jpg' not found in assets directory.
                </div>
              )}
              <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '8px' }}>
                Used on login, receipt prints, and PDF exports with aspect ratio preserved.
              </div>
            </div>

            {/* Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Cafe Name *</label>
                  <input
                    type="text"
                    name="cafe_name"
                    className="form-input"
                    value={form.cafe_name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Owner Name</label>
                  <input
                    type="text"
                    name="owner_name"
                    className="form-input"
                    value={form.owner_name}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Cafe Address (Printed on Receipt)</label>
                  <input
                    type="text"
                    name="address"
                    className="form-input"
                    placeholder="e.g. 123 Main Road, City"
                    value={form.address}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    name="phone"
                    className="form-input"
                    placeholder="e.g. +91 9876543210"
                    value={form.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: UPI Digital Payment Settings */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <QrCode size={18} color="#1e3a8a" />
            <span>UPI Digital Payments & QR Configuration</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <div className="form-group">
                <label className="form-label">UPI ID (VPA)</label>
                <input
                  type="text"
                  name="upi_id"
                  className="form-input"
                  placeholder="e.g. yumyumcafe@okhdfcbank"
                  value={form.upi_id}
                  onChange={handleChange}
                />
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Shown to customer on billing screen and printed on UPI thermal receipts.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Upload UPI QR Image</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleQrUpload}
                  className="form-input"
                  style={{ padding: '8px' }}
                />
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Upload your merchant UPI QR code. Never shown on Cash receipts!
                </span>
              </div>
            </div>

            {/* QR Preview Box */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f8fafc',
              border: '1.5px dashed #cbd5e1',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                UPI QR Code Preview
              </div>
              {form.upi_qr_data ? (
                <div style={{ textAlign: 'center' }}>
                  <img
                    src={form.upi_qr_data}
                    alt="UPI QR Preview"
                    style={{
                      maxWidth: '130px',
                      maxHeight: '130px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      background: '#fff',
                      padding: '4px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, upi_qr_data: '' }))}
                    style={{
                      display: 'block',
                      margin: '8px auto 0 auto',
                      background: 'none',
                      border: 'none',
                      color: '#e11d48',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Remove QR
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                  <QrCode size={32} style={{ margin: '0 auto 6px auto', opacity: 0.5 }} />
                  No UPI QR uploaded yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Thermal Receipt Hardware Settings */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Printer size={18} color="#1e3a8a" />
            <span>Thermal Receipt Hardware Format</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div
              onClick={() => setForm((p) => ({ ...p, receipt_paper_width: '80mm' }))}
              style={{
                border: form.receipt_paper_width === '80mm' ? '2.5px solid #1e3a8a' : '1.5px solid #e2e8f0',
                background: form.receipt_paper_width === '80mm' ? '#eff6ff' : '#fff',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.16s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '15px', fontWeight: 900, color: '#1e3a8a' }}>80mm Thermal Receipt (Standard)</span>
                {form.receipt_paper_width === '80mm' && <CheckCircle2 size={18} color="#1e3a8a" />}
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                Full-width 3-inch roll used by standard POS thermal printers. Supports large logo and spacious columns.
              </p>
            </div>

            <div
              onClick={() => setForm((p) => ({ ...p, receipt_paper_width: '58mm' }))}
              style={{
                border: form.receipt_paper_width === '58mm' ? '2.5px solid #1e3a8a' : '1.5px solid #e2e8f0',
                background: form.receipt_paper_width === '58mm' ? '#eff6ff' : '#fff',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.16s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '15px', fontWeight: 900, color: '#1e3a8a' }}>58mm Compact Receipt</span>
                {form.receipt_paper_width === '58mm' && <CheckCircle2 size={18} color="#1e3a8a" />}
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                Compact 2-inch roll used by portable handheld and mini thermal printers.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Staff Members Management */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Users size={18} color="#1e3a8a" />
            <span>Staff Members (Attribution on Bills)</span>
          </h3>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Enter new staff member name..."
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              style={{ maxWidth: '320px' }}
            />
            <button type="button" onClick={handleAddStaff} className="btn btn-royal">
              <Plus size={16} />
              <span>Add Staff</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {staffList.length === 0 ? (
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>No custom staff names yet. The owner name is used by default.</span>
            ) : (
              staffList.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 700
                  }}
                >
                  <span>{s.name}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteStaff(s.id, s.name)}
                    style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
