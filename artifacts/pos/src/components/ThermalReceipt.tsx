import React from "react";

interface ThermalReceiptProps {
  sale: any;
  settings: any;
  onClose: () => void;
}

function fmt(val: number | string, currency = "Rs") {
  const n = Number(val) || 0;
  return `${currency} ${n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function printReceiptHtml(sale: any, settings: any) {
  const storeName  = settings?.store_name    || "Umair Mobile Gallery UMG";
  const address    = settings?.address       || "Street no 1 Mor Sambrial";
  const phone      = settings?.phone         || "03349999602";
  const whatsapp   = settings?.whatsapp      || "";
  const footer     = settings?.footer_message || "Thank You For Shopping! Visit Again.";
  const currency   = settings?.currency      || "Rs";

  const logoSrc = settings?.logo
    ? (settings.logo.startsWith("data:") || settings.logo.startsWith("http")
        ? settings.logo
        : `${window.location.origin}${settings.logo}`)
    : `${window.location.origin}/umg-logo.jpg`;

  // Items — two rows per line item so nothing wraps off-edge
  const itemsHtml = sale.items.map((item: any) => `
    <tr><td colspan="2" class="item-name">${item.product_name}</td></tr>
    <tr>
      <td class="item-detail">${item.quantity} x ${fmt(item.unit_price, currency)}${item.discount > 0 ? `  Disc:-${fmt(item.discount, currency)}` : ""}</td>
      <td class="item-total">${fmt(item.total, currency)}</td>
    </tr>`).join("");

  const subtotal    = Number(sale.subtotal)        || 0;
  const discAmt     = Number(sale.discount_amount) || 0;
  const discPct     = Number(sale.discount_percent)|| 0;
  const taxAmt      = Number(sale.tax_amount)      || 0;
  const taxPct      = Number(sale.tax_percent)     || 0;
  const grandTotal  = Number(sale.grand_total)     || 0;
  const paidAmount  = Number(sale.paid_amount)     || 0;
  const changeAmt   = Number(sale.return_amount)   || 0;
  const payMethod   = (sale.payment_method || "cash").toUpperCase();

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Receipt</title>
<style>
  @page {
    margin-top: 4mm;
    margin-bottom: 4mm;
    margin-left: 0;
    margin-right: 0;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    line-height: 1.45;
    color: #000;
    background: #fff;
    width: 100%;
    padding: 0 2mm;
    box-sizing: border-box;
  }
  .center   { text-align: center; }
  .right    { text-align: right; }
  .bold     { font-weight: bold; }
  .dash     { border-top: 1px dashed #000; margin: 5px 0; }
  .solid    { border-top: 2px solid #000;  margin: 5px 0; }

  /* logo */
  .logo { height: 90px; max-width: 120px; object-fit: contain; display: block; margin: 0 auto 4px; }

  /* store header */
  .store-name { font-size: 14px; font-weight: bold; }
  .store-info { font-size: 11px; }

  /* meta table (date / invoice / cashier) */
  table { width: 100%; border-collapse: collapse; }
  td    { padding: 1px 0; vertical-align: top; font-size: 12px; }
  .lbl  { width: 45%; }
  .val  { text-align: right; }

  /* items */
  .item-name   { font-weight: bold; font-size: 12px; padding-top: 5px; border-top: 1px dotted #000; }
  .item-detail { font-size: 11px; padding-left: 4px; width: 70%; }
  .item-total  { text-align: right; font-weight: bold; font-size: 12px; white-space: nowrap; }

  /* totals */
  .tot-lbl { width: 55%; }
  .tot-val { text-align: right; white-space: nowrap; }

  /* grand total box */
  .grand-box {
    border: 2px solid #000;
    padding: 3px 6px;
    margin: 5px 0;
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    font-weight: bold;
  }

  /* paid box */
  .paid-box {
    border: 1px solid #000;
    padding: 3px 6px;
    margin: 3px 0;
  }
  .paid-row { display: flex; justify-content: space-between; }
  .paid-row .p-val { font-weight: bold; white-space: nowrap; }

  .footer { font-size: 11px; text-align: center; margin-top: 8px; line-height: 1.5; }
  .powered{ font-size: 10px; text-align: center; margin-top: 3px; }
</style>
</head>
<body>

<!-- HEADER -->
<div class="center">
  <img src="${logoSrc}" class="logo" alt="logo" />
  <div class="store-name">${storeName}</div>
  ${address  ? `<div class="store-info">${address}</div>` : ""}
  ${phone    ? `<div class="store-info">Tel: ${phone}${whatsapp ? " | WA: " + whatsapp : ""}</div>` : ""}
</div>

<div class="dash"></div>

<!-- META -->
<table>
  <tr><td class="lbl">Date:</td>     <td class="val">${new Date(sale.created_at || Date.now()).toLocaleString("en-PK")}</td></tr>
  <tr><td class="lbl">Invoice:</td>  <td class="val bold">${sale.invoice_no}</td></tr>
  <tr><td class="lbl">Cashier:</td>  <td class="val">${sale.cashier_name || ""}</td></tr>
  ${sale.customer_name ? `<tr><td class="lbl">Customer:</td><td class="val">${sale.customer_name}</td></tr>` : ""}
  <tr><td class="lbl">Payment:</td>  <td class="val">${payMethod}</td></tr>
</table>

<div class="dash"></div>

<!-- ITEMS -->
<table>${itemsHtml}</table>

<div class="dash"></div>

<!-- SUBTOTALS -->
<table>
  <tr><td class="tot-lbl">Subtotal:</td>              <td class="tot-val">${fmt(subtotal, currency)}</td></tr>
  ${discAmt > 0 ? `<tr><td class="tot-lbl">Discount${discPct > 0 ? " (" + discPct + "%)" : ""}:</td><td class="tot-val">- ${fmt(discAmt, currency)}</td></tr>` : ""}
  ${taxAmt  > 0 ? `<tr><td class="tot-lbl">Tax (${taxPct}%):</td><td class="tot-val">${fmt(taxAmt, currency)}</td></tr>` : ""}
</table>

<div class="solid"></div>

<!-- GRAND TOTAL -->
<div class="grand-box">
  <span>TOTAL:</span>
  <span>${fmt(grandTotal, currency)}</span>
</div>

<!-- PAID / CHANGE -->
<div class="paid-box">
  <div class="paid-row"><span>Cash Paid (${payMethod}):</span><span class="p-val">${fmt(paidAmount, currency)}</span></div>
  ${changeAmt > 0 ? `<div class="paid-row"><span>Change:</span><span class="p-val">${fmt(changeAmt, currency)}</span></div>` : ""}
</div>

<div class="dash"></div>

<div class="footer">${footer.replace(/\n/g, "<br>")}</div>
<div class="powered">*** UMG POS ***</div>

<script>
  window.onload = function() {
    window.print();
    window.onafterprint = function() { window.close(); };
  };
</script>
</body>
</html>`;
}

export function printReceipt(sale: any, settings: any) {
  const html = printReceiptHtml(sale, settings);
  const w = window.open("", "_blank", "width=380,height=650,scrollbars=yes");
  if (w) { w.document.write(html); w.document.close(); }
}

export function ThermalReceipt(_props: ThermalReceiptProps) {
  return null;
}
