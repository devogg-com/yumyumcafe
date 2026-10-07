import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import api from '../lib/api';
import ReceiptPreviewModal from '../components/ReceiptPreviewModal';
import {
  IndianRupee,
  ShoppingBag,
  Coins,
  QrCode,
  Tag,
  ArrowRight,
  Receipt,
  Eye,
  RefreshCw
} from 'lucide-react';

export default function DashboardPage() {
  const { user, setActiveTab, showToast } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewBill, setPreviewBill] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.getDashboard(user.id);
      setData(res);
    } catch (err) {
      showToast('Failed to load dashboard data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const stats = data ? data.stats : {
    today_sales: 0,
    today_bills: 0,
    cash_sales: 0,
    upi_sales: 0,
    discount: 0
  };

  const recentBills = (data && data.recent_bills) || [];

  return (
    <div className="page-container">
      {/* Top Welcome / Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a' }}>
            Today's Cafe Performance
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
            Live metrics recorded directly from your local POS database
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchDashboardData} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button onClick={() => setActiveTab('pos')} className="btn btn-primary">
            <span>New Bill (POS)</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '16px',
        marginBottom: '26px'
      }}>
        {/* Today's Sales */}
        <div className="card" style={{ borderLeft: '4px solid #1e3a8a', background: 'linear-gradient(180deg, #ffffff 0%, #eff6ff 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase' }}>Today's Sales</span>
            <div style={{ padding: '8px', background: '#dbeafe', borderRadius: '8px', color: '#1e3a8a' }}>
              <IndianRupee size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', marginTop: '12px' }}>
            ₹{stats.today_sales.toFixed(2)}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>Net revenue today</div>
        </div>

        {/* Today's Bills */}
        <div className="card" style={{ borderLeft: '4px solid #f59e0b', background: 'linear-gradient(180deg, #ffffff 0%, #fffbeb 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#d97706', textTransform: 'uppercase' }}>Today's Bills</span>
            <div style={{ padding: '8px', background: '#fef3c7', borderRadius: '8px', color: '#d97706' }}>
              <ShoppingBag size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', marginTop: '12px' }}>
            {stats.today_bills}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>Completed transactions</div>
        </div>

        {/* Cash Sales */}
        <div className="card" style={{ borderLeft: '4px solid #10b981', background: 'linear-gradient(180deg, #ffffff 0%, #ecfdf5 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>Cash Sales</span>
            <div style={{ padding: '8px', background: '#d1fae5', borderRadius: '8px', color: '#059669' }}>
              <Coins size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', marginTop: '12px' }}>
            ₹{stats.cash_sales.toFixed(2)}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>Cash payments collected</div>
        </div>

        {/* UPI Sales */}
        <div className="card" style={{ borderLeft: '4px solid #8b5cf6', background: 'linear-gradient(180deg, #ffffff 0%, #f5f3ff 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase' }}>UPI Sales</span>
            <div style={{ padding: '8px', background: '#ede9fe', borderRadius: '8px', color: '#7c3aed' }}>
              <QrCode size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', marginTop: '12px' }}>
            ₹{stats.upi_sales.toFixed(2)}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>Digital UPI receipts</div>
        </div>

        {/* Total Discounts */}
        <div className="card" style={{ borderLeft: '4px solid #ec4899', background: 'linear-gradient(180deg, #ffffff 0%, #fdf2f8 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#db2777', textTransform: 'uppercase' }}>Discounts</span>
            <div style={{ padding: '8px', background: '#fce7f3', borderRadius: '8px', color: '#db2777' }}>
              <Tag size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', marginTop: '12px' }}>
            ₹{stats.discount.toFixed(2)}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>Total discounts given</div>
        </div>
      </div>

      {/* Recent Bills Table */}
      <div className="card" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt size={18} color="#1e3a8a" />
            <span>Recent Bills Generated</span>
          </h3>
          <button onClick={() => setActiveTab('history')} className="btn btn-secondary btn-sm">
            View All History
          </button>
        </div>

        {recentBills.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
            <Receipt size={36} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
            <p style={{ fontWeight: 600 }}>No bills created today yet.</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Go to POS Billing to generate your first bill!</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 800, color: '#1e3a8a' }}>BILL NUMBER</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800, color: '#1e3a8a' }}>DATE & TIME</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800, color: '#1e3a8a' }}>STAFF</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800, color: '#1e3a8a' }}>PAYMENT</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800, color: '#1e3a8a', textAlign: 'right' }}>GRAND TOTAL</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800, color: '#1e3a8a', textAlign: 'center' }}>STATUS</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800, color: '#1e3a8a', textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {recentBills.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>{b.bill_number}</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>{b.bill_date} {b.bill_time}</td>
                    <td style={{ padding: '12px 14px', color: '#334155', fontWeight: 600 }}>{b.staff_name}</td>
                    <td style={{ padding: '12px 14px' }}>
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
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                      ₹{Number(b.grand_total).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '11px',
                        background: b.status === 'completed' ? '#ecfdf5' : '#fff1f2',
                        color: b.status === 'completed' ? '#059669' : '#e11d48'
                      }}>
                        {b.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <button
                        onClick={async () => {
                          const fullBill = await api.getBillById(user.id, b.id);
                          setPreviewBill(fullBill || b);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px' }}
                      >
                        <Eye size={13} />
                        <span>Preview</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bill Preview Modal */}
      {previewBill && (
        <ReceiptPreviewModal
          bill={previewBill}
          onClose={() => setPreviewBill(null)}
        />
      )}
    </div>
  );
}
