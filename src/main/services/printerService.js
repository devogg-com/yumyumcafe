const fs = require('fs');
const path = require('path');
const os = require('os');
const assetService = require('./assetService');

/**
 * Generate standard HTML for thermal receipt (matching preview exactly)
 */
function generateReceiptHtml(bill, settings = {}, paperWidth = '80mm') {
  const is58mm = paperWidth === '58mm';
  const widthPx = is58mm ? '204px' : '280px';
  const fontSize = is58mm ? '11px' : '12px';

  let logoSrc = '';
  try {
    logoSrc = assetService.getLogoBase64();
  } catch (e) {
    logoSrc = '';
  }

  const cafeName = settings.cafe_name || 'YUM YUM CAFE';
  const ownerName = settings.owner_name ? `Prop: ${settings.owner_name}` : '';
  const address = settings.address || '';
  const phone = settings.phone ? `Ph: ${settings.phone}` : '';
  const upiId = settings.upi_id || '';
  const upiQr = settings.upi_qr_data || '';

  const isUPI = bill.payment_method === 'UPI';

  // Format currency
  const fmt = (num) => Number(num || 0).toFixed(2);

  // Render items rows
  const itemRows = (bill.items || []).map(item => `
    <tr>
      <td class="col-item">${escapeHtml(item.product_name)}</td>
      <td class="col-qty">${item.quantity}</td>
      <td class="col-price">${fmt(item.unit_price)}</td>
      <td class="col-total">${fmt(item.total_price)}</td>
    </tr>
  `).join('');

  // Discount section
  let discountHtml = '';
  if (bill.discount_amount && Number(bill.discount_amount) > 0) {
    const discLabel = bill.discount_type === 'percent'
      ? `Discount (${bill.discount_value}%):`
      : 'Discount:';
    discountHtml = `
      <div class="summary-line">
        <span>${discLabel}</span>
        <span>- ₹${fmt(bill.discount_amount)}</span>
      </div>
    `;
  }

  // QR Code section ONLY for UPI bills!
  let upiSection = '';
  if (isUPI) {
    upiSection = `
      <div class="upi-box">
        <div class="upi-title">SCAN TO PAY (UPI)</div>
        ${upiQr ? `<img src="${upiQr}" class="upi-qr" alt="UPI QR" />` : ''}
        ${upiId ? `<div class="upi-id">UPI ID: <strong>${escapeHtml(upiId)}</strong></div>` : ''}
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Receipt - ${bill.bill_number}</title>
<style>
  @page {
    size: ${is58mm ? '58mm' : '80mm'} auto;
    margin: 0;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: 'Courier New', Courier, monospace, 'Segoe UI', Tahoma, sans-serif;
    color: #000;
  }
  body {
    width: ${widthPx};
    margin: 0 auto;
    padding: 10px 8px;
    background: #fff;
    font-size: ${fontSize};
    line-height: 1.25;
  }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .bold { font-weight: bold; }
  
  .receipt-logo-container {
    text-align: center;
    margin-bottom: 6px;
  }
  .receipt-logo {
    max-width: 90px;
    max-height: 90px;
    object-fit: contain;
    display: block;
    margin: 0 auto;
  }
  .cafe-title {
    font-size: 15px;
    font-weight: 900;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-bottom: 2px;
  }
  .cafe-meta {
    font-size: 10px;
    color: #222;
    margin-bottom: 2px;
  }
  .divider {
    border-top: 1px dashed #000;
    margin: 6px 0;
  }
  .double-divider {
    border-top: 2px solid #000;
    margin: 6px 0;
  }
  .info-table {
    width: 100%;
    font-size: 10.5px;
    margin-bottom: 4px;
  }
  .info-table td {
    padding: 1px 0;
  }
  .items-table {
    width: 100%;
    font-size: 11px;
    border-collapse: collapse;
    margin: 4px 0;
  }
  .items-table th {
    border-bottom: 1px dashed #000;
    padding: 3px 0;
    text-align: left;
    font-size: 10.5px;
    font-weight: bold;
  }
  .items-table td {
    padding: 3px 0;
    vertical-align: top;
  }
  .col-item { width: 45%; word-break: break-word; }
  .col-qty { width: 15%; text-align: center; }
  .col-price { width: 18%; text-align: right; }
  .col-total { width: 22%; text-align: right; font-weight: bold; }
  
  .summary-line {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    padding: 2px 0;
  }
  .grand-total-box {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    font-weight: 900;
    padding: 5px 0;
    border-top: 1px dashed #000;
    border-bottom: 1px dashed #000;
    margin: 4px 0;
  }
  .upi-box {
    text-align: center;
    margin: 8px 0;
    padding: 6px;
    border: 1px solid #000;
    border-radius: 4px;
  }
  .upi-title {
    font-size: 10px;
    font-weight: bold;
    margin-bottom: 4px;
  }
  .upi-qr {
    max-width: 110px;
    max-height: 110px;
    display: block;
    margin: 0 auto 4px auto;
  }
  .upi-id {
    font-size: 9.5px;
    word-break: break-all;
  }
  .footer-msg {
    text-align: center;
    font-size: 10.5px;
    font-weight: bold;
    margin-top: 8px;
    margin-bottom: 4px;
  }
  .status-cancelled {
    color: #b91c1c;
    border: 2px solid #b91c1c;
    text-align: center;
    padding: 4px;
    font-weight: 900;
    font-size: 14px;
    margin: 6px 0;
    letter-spacing: 1px;
  }
</style>
</head>
<body>
  <div class="receipt-logo-container">
    ${logoSrc ? `<img src="${logoSrc}" class="receipt-logo" alt="Yum Yum Cafe Logo" />` : ''}
    <div class="cafe-title">${escapeHtml(cafeName)}</div>
    ${ownerName ? `<div class="cafe-meta">${escapeHtml(ownerName)}</div>` : ''}
    ${address ? `<div class="cafe-meta">${escapeHtml(address)}</div>` : ''}
    ${phone ? `<div class="cafe-meta">${escapeHtml(phone)}</div>` : ''}
  </div>

  <div class="divider"></div>

  ${bill.status === 'cancelled' ? '<div class="status-cancelled">*** CANCELLED BILL ***</div>' : ''}

  <table class="info-table">
    <tr>
      <td><strong>Bill No:</strong> ${bill.bill_number}</td>
      <td class="text-right"><strong>Date:</strong> ${bill.bill_date}</td>
    </tr>
    <tr>
      <td><strong>Staff:</strong> ${escapeHtml(bill.staff_name || 'Staff')}</td>
      <td class="text-right"><strong>Time:</strong> ${bill.bill_time}</td>
    </tr>
  </table>

  <table class="items-table">
    <thead>
      <tr>
        <th class="col-item">ITEM</th>
        <th class="col-qty">QTY</th>
        <th class="col-price">PRICE</th>
        <th class="col-total">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="divider"></div>

  <div class="summary-line">
    <span>Subtotal:</span>
    <span>₹${fmt(bill.subtotal)}</span>
  </div>

  ${discountHtml}

  <div class="grand-total-box">
    <span>GRAND TOTAL:</span>
    <span>₹${fmt(bill.grand_total)}</span>
  </div>

  <div class="summary-line">
    <span>Payment Mode:</span>
    <span class="bold">${bill.payment_method}</span>
  </div>

  ${upiSection}

  <div class="divider"></div>

  <div class="footer-msg">*** THANK YOU! VISIT AGAIN ***</div>
  <div class="text-center cafe-meta">Have a Delicious Day at Yum Yum Cafe!</div>
</body>
</html>`;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

class PrinterService {
  async exportBillPdf(bill, settings, defaultPath = null) {
    const { BrowserWindow, dialog } = require('electron');
    const paperWidth = (settings && settings.receipt_paper_width) || '80mm';
    const htmlContent = generateReceiptHtml(bill, settings, paperWidth);

    let savePath = defaultPath;
    if (!savePath) {
      const { filePath, canceled } = await dialog.showSaveDialog({
        title: `Save PDF Receipt - ${bill.bill_number}`,
        defaultPath: path.join(os.homedir(), `Receipt_${bill.bill_number}.pdf`),
        filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
      });
      if (canceled || !filePath) return { success: false, message: 'PDF export cancelled.' };
      savePath = filePath;
    }

    // Render receipt in offscreen window with thermal dimensions
    const is58mm = paperWidth === '58mm';
    const widthMicrons = is58mm ? 58000 : 80000;

    const win = new BrowserWindow({
      show: false,
      webPreferences: { offscreen: true }
    });

    try {
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
      // Wait for layout and image loading
      await new Promise(r => setTimeout(r, 400));

      const pdfData = await win.webContents.printToPDF({
        pageSize: {
          width: widthMicrons,
          height: 297000 // Let electron fit dynamic content smoothly
        },
        margins: { marginType: 'none' },
        printBackground: true
      });

      fs.writeFileSync(savePath, pdfData);
      return { success: true, filePath: savePath, message: `Receipt saved to ${savePath}` };
    } finally {
      win.destroy();
    }
  }

  async printBill(bill, settings, silent = false) {
    const { BrowserWindow } = require('electron');
    const paperWidth = (settings && settings.receipt_paper_width) || '80mm';
    const htmlContent = generateReceiptHtml(bill, settings, paperWidth);

    const win = new BrowserWindow({
      show: false,
      webPreferences: { offscreen: true }
    });

    try {
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
      await new Promise(r => setTimeout(r, 400));

      return new Promise((resolve) => {
        win.webContents.print({
          silent,
          printBackground: true,
          margins: { marginType: 'none' }
        }, (success, failureReason) => {
          win.destroy();
          if (success) {
            resolve({ success: true, message: 'Receipt sent to printer.' });
          } else {
            resolve({ success: false, message: failureReason || 'Print cancelled or failed.' });
          }
        });
      });
    } catch (err) {
      win.destroy();
      return { success: false, message: err.message };
    }
  }

  getReceiptHtml(bill, settings) {
    const paperWidth = (settings && settings.receipt_paper_width) || '80mm';
    return generateReceiptHtml(bill, settings, paperWidth);
  }
}

module.exports = new PrinterService();
