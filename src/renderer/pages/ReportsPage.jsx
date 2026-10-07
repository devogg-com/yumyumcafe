import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import api from '../lib/api';
import {
  BarChart3,
  Calendar,
  IndianRupee,
  Coins,
  QrCode,
  Tag,
  Ban,
  ShoppingBag,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';

export default function ReportsPage() {
  const { user, showToast } = useApp();

  const [reportType, setReportType] = useState('daily'); // 'daily' | 'monthly'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().split('T')[0].substring(0, 7));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (reportType === 'daily') {
        const res = await api.getDailyReport(user.id, selectedDate);
        setData(res);
      } else {
        const res = await api.getMonthlyReport(user.id, selectedMonth);
        setData(res);
      }
    } catch (err) {
      showToast('Error generating report: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [user, reportType, selectedDate, selectedMonth, showToast]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const summary = data ? data.summary : {
    total_bills: 0,
    completed_bills: 0,
    cancelled_bills: 0,
    gross_sales: 0,
    total_discounts: 0,
    net_sales: 0,
    cash_sales: 0,
    upi_sales: 0
  };

  return (
    <div className="page-container">
      {/* Header & Report Filters */}
      <div className="card" style={{ marginBottom: '20px', padding: '18px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={20} color="#1e3a8a" />
            <span>Sales & Financial Reports</span>
          </h2>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setReportType('daily')}
              className={`btn btn-sm ${reportType === 'daily' ? 'btn-royal' : 'btn-secondary'}`}
            >
              Daily Report
            </button>
            <button
              onClick={() => setReportType('monthly')}
              className={`btn btn-sm ${reportType === 'monthly' ? 'btn-royal' : 'btn-secondary'}`}
            >
              Monthly Report
            </button>
            <button onClick={fetchReport} className="btn btn-secondary btn-sm" title="Refresh">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Date Filter Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
            {reportType === 'daily' ? 'Select Date:' : 'Select Month:'}
          </span>
          {reportType === 'daily' ? (
            <input
              type="date"
              className="form-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ width: '180px', height: '38px', fontSize: '13px' }}
            />
          ) : (
            <input
              type="month"
              className="form-input"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ width: '180px', height: '38px', fontSize: '13px' }}
            />
          )}
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Showing performance for {reportType === 'daily' ? selectedDate : selectedMonth}
          </span>
        </div>
      </div>

      {/* KPI Financial Overview Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px',
        marginBottom: '22px'
      }}>
        {/* Net Sales */}
        <div className="card" style={{ borderLeft: '4px solid #1e3a8a', background: 'linear-gradient(180deg, #ffffff 0%, #eff6ff 100%)' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase' }}>Net Sales</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '10px' }}>
            ₹{summary.net_sales.toFixed(2)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Actual revenue realized</div>
        </div>

        {/* Cash Sales */}
        <div className="card" style={{ borderLeft: '4px solid #10b981', background: 'linear-gradient(180deg, #ffffff 0%, #ecfdf5 100%)' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>Cash Sales</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '10px' }}>
            ₹{summary.cash_sales.toFixed(2)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Physical cash intake</div>
        </div>

        {/* UPI Sales */}
        <div className="card" style={{ borderLeft: '4px solid #8b5cf6', background: 'linear-gradient(180deg, #ffffff 0%, #f5f3ff 100%)' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase' }}>UPI Sales</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '10px' }}>
            ₹{summary.upi_sales.toFixed(2)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Digital payments</div>
        </div>

        {/* Total Discounts */}
        <div className="card" style={{ borderLeft: '4px solid #f59e0b', background: 'linear-gradient(180deg, #ffffff 0%, #fffbeb 100%)' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#d97706', textTransform: 'uppercase' }}>Discounts</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '10px' }}>
            ₹{summary.total_discounts.toFixed(2)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Customer reductions</div>
        </div>

        {/* Bills Count & Cancellations */}
        <div className="card" style={{ borderLeft: '4px solid #64748b' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Bills Status</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '10px' }}>
            {summary.completed_bills} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>/ {summary.total_bills}</span>
          </div>
          <div style={{ fontSize: '11px', color: summary.cancelled_bills > 0 ? '#e11d48' : '#64748b', marginTop: '4px', fontWeight: 700 }}>
            {summary.cancelled_bills} cancelled bills
          </div>
        </div>
      </div>

      {/* Breakdown Details */}
      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
          {reportType === 'daily' ? `Transactions on ${selectedDate}` : `Daily Breakdown for ${selectedMonth}`}
        </h3>

        {reportType === 'daily' ? (
          /* Daily: Bills Table */
          (!data || !data.bills || data.bills.length === 0) ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
              No bills recorded on {selectedDate}.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 800, color: '#1e3a8a' }}>BILL NUMBER</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800, color: '#1e3a8a' }}>TIME</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800, color: '#1e3a8a' }}>STAFF</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800, color: '#1e3a8a' }}>PAYMENT</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800, color: '#1e3a8a', textAlign: 'right' }}>SUBTOTAL</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800, color: '#1e3a8a', textAlign: 'right' }}>DISCOUNT</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800, color: '#1e3a8a', textAlign: 'right' }}>NET TOTAL</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800, color: '#1e3a8a', textAlign: 'center' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bills.map((b) => (
                    <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>{b.bill_number}</td>
                      <td style={{ padding: '10px 14px', color: '#64748b' }}>{b.bill_time}</td>
                      <td style={{ padding: '10px 14px', color: '#334155' }}>{b.staff_name}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          padding: '2px 7px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          fontSize: '11px',
                          background: b.payment_method === 'UPI' ? '#ede9fe' : '#d1fae5',
                          color: b.payment_method === 'UPI' ? '#6d28d9' : '#047857'
                        }}>
                          {b.payment_method}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#64748b' }}>₹{Number(b.subtotal).toFixed(2)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#d97706' }}>₹{Number(b.discount_amount).toFixed(2)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>₹{Number(b.grand_total).toFixed(2)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 7px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          fontSize: '11px',
                          background: b.status === 'completed' ? '#ecfdf5' : '#fff1f2',
                          color: b.status === 'completed' ? '#059669' : '#e11d48'
                        }}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Monthly: Daily Breakdown Table */
          (!data || !data.daily_breakdown || data.daily_breakdown.length === 0) ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
              No bills recorded in {selectedMonth}.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 800, color: '#1e3a8a' }}>DATE</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800, color: '#1e3a8a', textAlign: 'center' }}>TOTAL BILLS</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800, color: '#1e3a8a', textAlign: 'right' }}>CASH SALES</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800, color: '#1e3a8a', textAlign: 'right' }}>UPI SALES</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800, color: '#1e3a8a', textAlign: 'right' }}>DISCOUNTS</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800, color: '#1e3a8a', textAlign: 'right' }}>NET SALES</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800, color: '#1e3a8a', textAlign: 'center' }}>CANCELLED</th>
                  </tr>
                </thead>
                <tbody>
                  {data.daily_breakdown.map((row) => (
                    <tr key={row.date} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>{row.date}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>{row.total_bills}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>₹{row.cash_sales.toFixed(2)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#7c3aed', fontWeight: 600 }}>₹{row.upi_sales.toFixed(2)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#d97706' }}>₹{row.discounts.toFixed(2)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 900, color: '#0f172a' }}>₹{row.net_sales.toFixed(2)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', color: row.cancelled_bills > 0 ? '#e11d48' : '#94a3b8', fontWeight: 700 }}>
                        {row.cancelled_bills}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
