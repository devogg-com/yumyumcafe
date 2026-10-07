import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import api from '../lib/api';
import ReceiptPreviewModal from '../components/ReceiptPreviewModal';
import {
  Search,
  Filter,
  Eye,
  Printer,
  FileDown,
  Ban,
  Calendar,
  CreditCard,
  RefreshCw,
  Receipt
} from 'lucide-react';

export default function BillHistoryPage() {
  const { user, settings, showToast } = useApp();

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedBill, setSelectedBill] = useState(null);

  const fetchBills = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const filters = {};
      if (search.trim()) filters.search = search.trim();
      if (dateFilter) filters.date = dateFilter;
      if (paymentFilter !== 'all') filters.payment_method = paymentFilter;
      if (statusFilter !== 'all') filters.status = statusFilter;

      const data = await api.getBills(user.id, filters);
      setBills(data || []);
    } catch (err) {
      showToast('Error loading bills: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [user, search, dateFilter, paymentFilter, statusFilter, showToast]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handleCancelBill = async (bill) => {
    if (bill.status === 'cancelled') {
      showToast('This bill is already cancelled.', 'info');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to cancel bill #${bill.bill_number} for ₹${Number(bill.grand_total).toFixed(2)}?\n\nThis will preserve the audit record but mark the bill as cancelled.`
    );
    if (!confirmed) return;

    try {
      await api.cancelBill(user.id, bill.id);
      showToast(`Bill #${bill.bill_number} has been cancelled.`, 'success');
      fetchBills();
    } catch (err) {
      showToast('Failed to cancel bill: ' + err.message, 'error');
    }
  };

  const handleDirectPrint = async (bill) => {
    try {
      const fullBill = await api.getBillById(user.id, bill.id);
      await api.printBill(fullBill || bill, settings);
      showToast('Print request sent.', 'success');
    } catch (err) {
      showToast('Print error: ' + err.message, 'error');
    }
  };

  const handleDirectPdf = async (bill) => {
    try {
      const fullBill = await api.getBillById(user.id, bill.id);
      await api.exportPdf(fullBill || bill, settings);
      showToast('Receipt saved to PDF.', 'success');
    } catch (err) {
      showToast('PDF error: ' + err.message, 'error');
    }
  };

  return (
    <div className="page-container">
      {/* Header & Filter Controls */}
      <div className="card" style={{ marginBottom: '18px', padding: '18px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt size={20} color="#1e3a8a" />
            <span>Bill History & Invoices</span>
            <span style={{ fontSize: '12px', background: '#eff6ff', color: '#1e3a8a', padding: '2px 8px', borderRadius: '9999px', fontWeight: 800 }}>
              {bills.length} bills
            </span>
          </h2>
          <button onClick={fetchBills} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '11px' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search bill number or staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '34px', height: '38px', fontSize: '13px' }}
            />
          </div>

          <div>
            <input
              type="date"
              className="form-input"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{ height: '38px', fontSize: '13px' }}
            />
          </div>

          <div>
            <select
              className="form-select"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              style={{ height: '38px', fontSize: '13px' }}
            >
              <option value="all">All Payment Methods</option>
              <option value="Cash">Cash Bills</option>
              <option value="UPI">UPI Digital Bills</option>
            </select>
          </div>

          <div>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ height: '38px', fontSize: '13px' }}
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed Only</option>
              <option value="cancelled">Cancelled Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bills Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {bills.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
            <Receipt size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
            <p style={{ fontSize: '15px', fontWeight: 700 }}>No bills match the current filters.</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Clear date or search query to view all invoices.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: '#1e3a8a' }}>BILL NUMBER</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: '#1e3a8a' }}>DATE & TIME</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: '#1e3a8a' }}>STAFF</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: '#1e3a8a' }}>ITEMS</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: '#1e3a8a', textAlign: 'right' }}>SUBTOTAL</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: '#1e3a8a', textAlign: 'right' }}>DISCOUNT</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: '#1e3a8a', textAlign: 'right' }}>GRAND TOTAL</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: '#1e3a8a', textAlign: 'center' }}>PAYMENT</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: '#1e3a8a', textAlign: 'center' }}>STATUS</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: '#1e3a8a', textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => {
                  const itemsCount = (b.items || []).reduce((acc, it) => acc + it.quantity, 0);
                  const isCancelled = b.status === 'cancelled';

                  return (
                    <tr
                      key={b.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isCancelled ? '#fff1f2' : 'transparent',
                        transition: 'background 0.15s'
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0f172a' }}>
                        {b.bill_number}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>
                        {b.bill_date} <span style={{ fontSize: '11.5px' }}>{b.bill_time}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#334155' }}>
                        {b.staff_name}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                        {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>
                        ₹{Number(b.subtotal).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: Number(b.discount_amount) > 0 ? '#d97706' : '#94a3b8', fontWeight: 600 }}>
                        {Number(b.discount_amount) > 0 ? `- ₹${Number(b.discount_amount).toFixed(2)}` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 900, color: isCancelled ? '#e11d48' : '#0f172a', fontSize: '14px' }}>
                        ₹{Number(b.grand_total).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '11px',
                          background: b.payment_method === 'UPI' ? '#ede9fe' : '#d1fae5',
                          color: b.payment_method === 'UPI' ? '#6d28d9' : '#047857'
                        }}>
                          {b.payment_method}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '11px',
                          background: isCancelled ? '#ffe4e6' : '#ecfdf5',
                          color: isCancelled ? '#b91c1c' : '#059669'
                        }}>
                          {b.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={async () => {
                              const fullBill = await api.getBillById(user.id, b.id);
                              setSelectedBill(fullBill || b);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '5px 8px' }}
                            title="Preview Thermal Receipt"
                          >
                            <Eye size={13} />
                            <span>Preview</span>
                          </button>
                          <button
                            onClick={() => handleDirectPrint(b)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '5px 8px' }}
                            title="Print Thermal Receipt"
                          >
                            <Printer size={13} />
                          </button>
                          <button
                            onClick={() => handleDirectPdf(b)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '5px 8px' }}
                            title="Export PDF Receipt"
                          >
                            <FileDown size={13} />
                          </button>
                          {!isCancelled && (
                            <button
                              onClick={() => handleCancelBill(b)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '5px 8px', color: '#ef4444' }}
                              title="Cancel Bill"
                            >
                              <Ban size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Thermal Receipt Preview Modal */}
      {selectedBill && (
        <ReceiptPreviewModal
          bill={selectedBill}
          onClose={() => setSelectedBill(null)}
        />
      )}
    </div>
  );
}
