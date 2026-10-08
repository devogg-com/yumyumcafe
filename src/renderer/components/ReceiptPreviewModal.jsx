import React, { useRef } from 'react';
import { useApp } from '../context/AppContext';
import api from '../lib/api';
import { Printer, FileDown, X, CheckCircle2 } from 'lucide-react';

export default function ReceiptPreviewModal({ bill, onClose }) {
  const { settings, logoUrl, showToast } = useApp();
  const receiptRef = useRef(null);

  if (!bill) return null;

  const paperWidth = (settings && settings.receipt_paper_width) || '80mm';
  const is58mm = paperWidth === '58mm';
  const isUPI = bill.payment_method === 'UPI';
  const isCancelled = bill.status === 'cancelled';

  const cafeName = (settings && settings.cafe_name) || 'Yum Yum Cafe';
  const ownerName = settings && settings.owner_name ? `Prop: ${settings.owner_name}` : '';
  const address = settings && settings.address;
  const phone = settings && settings.phone ? `Ph: ${settings.phone}` : '';
  const upiId = settings && settings.upi_id;
  const upiQr = settings && settings.upi_qr_data;

  const handlePrint = async () => {
    try {
      const res = await api.printBill(bill, settings);
      if (res && res.success) {
        showToast('Receipt printed successfully!', 'success');
      } else {
        showToast(res && res.message ? res.message : 'Printed', 'info');
      }
    } catch (err) {
      showToast('Printing failed: ' + err.message, 'error');
    }
  };

  const handleExportPdf = async () => {
    try {
      const res = await api.exportPdf(bill, settings);
      if (res && res.success) {
        showToast('Receipt exported to PDF!', 'success');
      }
    } catch (err) {
      showToast('PDF export failed: ' + err.message, 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: is58mm ? '360px' : '420px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        {/* Header Actions */}
        <div style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Receipt Preview</span>
            <span style={{ fontSize: '11px', background: '#eff6ff', color: '#1e3a8a', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
              {paperWidth}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Thermal Receipt Visual Paper */}
        <div
          ref={receiptRef}
          style={{
            width: is58mm ? '240px' : '300px',
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            padding: '16px 12px',
            fontFamily: "'Courier New', Courier, monospace, 'Segoe UI', sans-serif",
            fontSize: is58mm ? '11px' : '12px',
            color: '#000000',
            lineHeight: 1.25,
            marginBottom: '18px'
          }}
        >
          {/* Logo & Header */}
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Yum Yum Cafe Logo"
                style={{
                  maxWidth: '85px',
                  maxHeight: '85px',
                  objectFit: 'contain',
                  display: 'block',
                  margin: '0 auto 6px auto'
                }}
              />
            )}
            <div style={{ fontSize: '15px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {cafeName}
            </div>
            {ownerName && <div style={{ fontSize: '10px', color: '#333' }}>{ownerName}</div>}
            {address && <div style={{ fontSize: '10.5px', color: '#333' }}>{address}</div>}
            {phone && <div style={{ fontSize: '10.5px', color: '#333' }}>{phone}</div>}
          </div>

          <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

          {/* Cancelled Banner */}
          {isCancelled && (
            <div style={{
              color: '#dc2626',
              border: '2px solid #dc2626',
              textAlign: 'center',
              padding: '4px',
              fontWeight: 900,
              fontSize: '13px',
              margin: '6px 0',
              letterSpacing: '1px'
            }}>
              *** CANCELLED BILL ***
            </div>
          )}

          {/* Bill Meta */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', margin: '2px 0' }}>
            <span><strong>Bill:</strong> {bill.bill_number}</span>
            <span><strong>Date:</strong> {bill.bill_date}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', margin: '2px 0' }}>
            <span><strong>Staff:</strong> {bill.staff_name || 'Staff'}</span>
            <span><strong>Time:</strong> {bill.bill_time}</span>
          </div>

          <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

          {/* Items Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 34px 44px 50px', fontWeight: 800, fontSize: '10.5px', paddingBottom: '4px', borderBottom: '1px dashed #000' }}>
            <span>ITEM</span>
            <span style={{ textAlign: 'center' }}>QTY</span>
            <span style={{ textAlign: 'right' }}>PRICE</span>
            <span style={{ textAlign: 'right' }}>TOTAL</span>
          </div>

          {/* Items List */}
          <div style={{ margin: '4px 0' }}>
            {(bill.items || []).map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 34px 44px 50px',
                  padding: '3px 0',
                  fontSize: '11px',
                  alignItems: 'start'
                }}
              >
                <span style={{ wordBreak: 'break-word', paddingRight: '4px' }}>{item.product_name}</span>
                <span style={{ textAlign: 'center' }}>{item.quantity}</span>
                <span style={{ textAlign: 'right' }}>{Number(item.unit_price).toFixed(2)}</span>
                <span style={{ textAlign: 'right', fontWeight: 800 }}>{Number(item.total_price).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span>Subtotal:</span>
            <span>₹{Number(bill.subtotal || 0).toFixed(2)}</span>
          </div>

          {bill.discount_amount && Number(bill.discount_amount) > 0 ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span>Discount {bill.discount_type === 'percent' ? `(${bill.discount_value}%)` : ''}:</span>
              <span>- ₹{Number(bill.discount_amount).toFixed(2)}</span>
            </div>
          ) : null}

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '14px',
            fontWeight: 900,
            padding: '5px 0',
            borderTop: '1px dashed #000',
            borderBottom: '1px dashed #000',
            margin: '6px 0'
          }}>
            <span>GRAND TOTAL:</span>
            <span>₹{Number(bill.grand_total || 0).toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '11px' }}>
            <span>Payment Mode:</span>
            <span style={{ fontWeight: 800 }}>{bill.payment_method}</span>
          </div>

          {/* UPI Section ONLY IF PAYMENT METHOD IS UPI */}
          {isUPI && (
            <div style={{
              textAlign: 'center',
              margin: '10px 0',
              padding: '6px',
              border: '1px solid #000',
              borderRadius: '4px'
            }}>
              <div style={{ fontSize: '10px', fontWeight: 800, marginBottom: '4px' }}>SCAN TO PAY (UPI)</div>
              {upiQr ? (
                <img
                  src={upiQr}
                  alt="UPI QR Code"
                  style={{
                    maxWidth: '100px',
                    maxHeight: '100px',
                    display: 'block',
                    margin: '0 auto 4px auto'
                  }}
                />
              ) : null}
              {upiId && (
                <div style={{ fontSize: '9.5px', wordBreak: 'break-all' }}>
                  UPI ID: <strong>{upiId}</strong>
                </div>
              )}
            </div>
          )}

          <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

          <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '11px', marginTop: '6px' }}>
            *** THANK YOU! VISIT AGAIN ***
          </div>
          <div style={{ textAlign: 'center', fontSize: '10px', color: '#444', marginTop: '2px' }}>
            Have a Delicious Day at Yum Yum Cafe!
          </div>
          
          <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '12px', marginBottom: '4px', lineHeight: 1.2 }}>
            <div>This App Made By OGStudio</div>
            <div>Contact: devogghelp@gmail.com</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <button onClick={handlePrint} className="btn btn-royal" style={{ flex: 1 }}>
            <Printer size={16} />
            <span>Print</span>
          </button>
          <button onClick={handleExportPdf} className="btn btn-secondary" style={{ flex: 1 }}>
            <FileDown size={16} />
            <span>PDF Export</span>
          </button>
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
