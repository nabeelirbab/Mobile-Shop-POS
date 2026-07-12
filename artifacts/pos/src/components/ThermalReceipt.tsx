import React from "react";

interface ThermalReceiptProps {
  sale: any;
  settings: any;
  onClose: () => void;
}

function fmtCurrency(val: number | string, currency = "Rs") {
  const n = Number(val) || 0;
  return `${currency} ${n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function printReceiptHtml(sale: any, settings: any) {
  const storeName = settings?.store_name || "Umair Mobile Gallery UMG";
  const address = settings?.address || "Street no 1 Mor Sambrial";
  const phone = settings?.phone || "03349999602";
  const whatsapp = settings?.whatsapp || "";
  const footerMessage = settings?.footer_message || "Thank You For Shopping! Visit Again.";
  const currency = settings?.currency || "Rs";
  const is80mm = settings?.receipt_size === "80mm";
  const paperWidth = is80mm ? "302px" : "216px";

  // Logo: base64 from settings, or fallback to static file
  let logoHtml = "";
  if (settings?.logo) {
    const src = settings.logo.startsWith("data:") || settings.logo.startsWith("http")
      ? settings.logo
      : `${window.location.origin}${settings.logo}`;
    logoHtml = `<img src="${src}" alt="logo" style="height:64px;max-width:100%;object-fit:contain;margin-bottom:6px;" />`;
  } else {
    logoHtml = `<img src="${window.location.origin}/umg-logo.jpg" alt="UMG" style="height:64px;max-width:100%;object-fit:contain;margin-bottom:6px;" />`;
  }

  const itemsHtml = sale.items
    .map(
      (item: any) => `
      <tr>
        <td colspan="4" style="text-align:left;padding-top:6px;font-weight:bold;border-top:1px dotted #aaa;">${item.product_name}</td>
      </tr>
      <tr>
        <td style="text-align:left;color:#555;">${item.quantity} x ${fmtCurrency(item.unit_price, currency)}</td>
        <td></td>
        <td style="text-align:right;color:#c00;">${item.discount > 0 ? "-" + fmtCurrency(item.discount, currency) : ""}</td>
        <td style="text-align:right;font-weight:bold;">${fmtCurrency(item.total, currency)}</td>
      </tr>`
    )
    .join("");

  const subtotal = Number(sale.subtotal) || 0;
  const discountAmt = Number(sale.discount_amount) || 0;
  const discountPct = Number(sale.discount_percent) || 0;
  const taxAmt = Number(sale.tax_amount) || 0;
  const taxPct = Number(sale.tax_percent) || 0;
  const grandTotal = Number(sale.grand_total) || 0;
  const paidAmount = Number(sale.paid_amount) || 0;
  const returnAmount = Number(sale.return_amount) || 0;
  const payMethod = (sale.payment_method || "cash").toUpperCase();

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${sale.invoice_no}</title>
  <style>
    @page { margin: 4mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      margin: 0; padding: 6px;
      width: ${paperWidth};
      font-size: 12px;
      line-height: 1.35;
      color: #000;
      background: #fff;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .left { text-align: left; }
    .bold { font-weight: bold; }
    .divider { border: none; border-top: 1px dashed #555; margin: 6px 0; }
    .divider-solid { border: none; border-top: 2px solid #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    td, th { padding: 1px 2px; vertical-align: top; }
    .store-name { font-size: ${is80mm ? "18px" : "15px"}; font-weight: bold; letter-spacing: 1px; }
    .store-sub { font-size: 11px; color: #333; margin: 2px 0; }
    .total-row td { font-size: ${is80mm ? "16px" : "14px"}; font-weight: bold; padding: 3px 2px; }
    .summary-label { color: #444; }
    .highlight-box {
      background: #000; color: #fff;
      padding: 4px 6px; margin: 4px 0;
      font-size: ${is80mm ? "16px" : "14px"};
      font-weight: bold; text-align: center;
      letter-spacing: 1px;
    }
    .paid-section { background: #f0f0f0; padding: 4px 6px; margin: 2px 0; }
  </style>
</head>
<body>
  <div class="center">
    ${logoHtml}
    <div class="store-name">${storeName}</div>
    ${address ? `<div class="store-sub">${address}</div>` : ""}
    ${phone ? `<div class="store-sub">Tel: ${phone}${whatsapp ? " | WA: " + whatsapp : ""}</div>` : ""}
  </div>

  <hr class="divider" />

  <table>
    <tr><td class="left summary-label">Date:</td><td class="right">${new Date(sale.created_at || Date.now()).toLocaleString("en-PK")}</td></tr>
    <tr><td class="left summary-label">Invoice#:</td><td class="right bold">${sale.invoice_no}</td></tr>
    <tr><td class="left summary-label">Cashier:</td><td class="right">${sale.cashier_name || ""}</td></tr>
    ${sale.customer_name ? `<tr><td class="left summary-label">Customer:</td><td class="right">${sale.customer_name}</td></tr>` : ""}
    <tr><td class="left summary-label">Payment:</td><td class="right">${payMethod}</td></tr>
  </table>

  <hr class="divider" />

  <table>
    <thead>
      <tr>
        <th class="left" style="border-bottom:1px solid #000;">Item</th>
        <th></th>
        <th class="right" style="border-bottom:1px solid #000;">Disc</th>
        <th class="right" style="border-bottom:1px solid #000;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <hr class="divider" />

  <table>
    <tr>
      <td class="left summary-label">Subtotal:</td>
      <td class="right">${fmtCurrency(subtotal, currency)}</td>
    </tr>
    ${discountAmt > 0 ? `<tr><td class="left summary-label">Discount${discountPct > 0 ? " (" + discountPct + "%)" : ""}:</td><td class="right" style="color:#c00;">- ${fmtCurrency(discountAmt, currency)}</td></tr>` : ""}
    ${taxAmt > 0 ? `<tr><td class="left summary-label">Tax (${taxPct}%):</td><td class="right">${fmtCurrency(taxAmt, currency)}</td></tr>` : ""}
  </table>

  <div class="highlight-box">
    TOTAL: ${fmtCurrency(grandTotal, currency)}
  </div>

  <div class="paid-section">
    <table>
      <tr>
        <td class="left bold">Cash Paid (${payMethod}):</td>
        <td class="right bold">${fmtCurrency(paidAmount, currency)}</td>
      </tr>
      ${returnAmount > 0 ? `<tr><td class="left summary-label">Change:</td><td class="right bold" style="color:#080;">${fmtCurrency(returnAmount, currency)}</td></tr>` : ""}
    </table>
  </div>

  <hr class="divider" />

  <div class="center" style="font-size:11px;margin-top:8px;line-height:1.6;">
    ${footerMessage.replace(/\n/g, "<br>")}
  </div>
  <div class="center" style="font-size:10px;color:#666;margin-top:4px;">
    *** Powered by UMG POS ***
  </div>

  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>`;
  return html;
}

export function printReceipt(sale: any, settings: any) {
  const html = printReceiptHtml(sale, settings);
  const w = window.open("", "_blank", "width=420,height=700,scrollbars=yes");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

export function ThermalReceipt({ sale, settings, onClose }: ThermalReceiptProps) {
  return null; // purely programmatic via printReceipt()
}
