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

  // Each item: name full-width, then qty × price on left + total on right
  const itemsHtml = sale.items.map((item: any) => `
    <tr><td colspan="2" class="item-name">${item.product_name}${item.discount > 0 ? `  <span style="font-weight:normal;font-size:10px;">(Disc: ${fmt(item.discount, currency)})</span>` : ""}</td></tr>
    <tr>
      <td class="item-detail">${item.quantity} x ${fmt(item.unit_price, currency)}</td>
      <td class="item-amt">${fmt(item.total, currency)}</td>
    </tr>`).join("");

  const subtotal   = Number(sale.subtotal)        || 0;
  const discAmt    = Number(sale.discount_amount) || 0;
  const discPct    = Number(sale.discount_percent)|| 0;
  const taxAmt     = Number(sale.tax_amount)      || 0;
  const taxPct     = Number(sale.tax_percent)     || 0;
  const grandTotal = Number(sale.grand_total)     || 0;
  const paidAmount = Number(sale.paid_amount)     || 0;
  const changeAmt  = Number(sale.return_amount)   || 0;
  const payMethod  = (sale.payment_method || "cash").toUpperCase();

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Receipt</title>
<style>
  @page {
    size: 58mm auto;
    margin: 3mm 2mm;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    font-weight: 700;
    line-height: 1.5;
    color: #000;
    background: #fff;
    width: 54mm;
  }

  /* ---- header ---- */
  .center   { text-align: center; }
  .bold     { font-weight: bold; }
  .dash     { border-top: 1px dashed #000; margin: 4px 0; }
  .solid    { border-top: 2px solid #000;  margin: 4px 0; }

  .logo { height: 200px; max-width: 200px; object-fit: contain; display: block; margin: 0 auto 2px; }
  .umg-tag    { font-family: Georgia, 'Times New Roman', serif; font-size: 18px; font-weight: bold; letter-spacing: 3px; }
  .store-name { font-family: Georgia, 'Times New Roman', serif; font-size: 17px; font-weight: bold; letter-spacing: 1px; }
  .store-info { font-size: 11px; font-weight: 700; }

  /* ---- meta (Date / Invoice / Cashier) ---- */
  .meta { width: 100%; border-collapse: collapse; }
  .meta td { font-size: 12px; font-weight: 700; padding: 1px 0; vertical-align: top; }
  .meta .lbl { width: 38%; }
  .meta .val { text-align: right; }

  /* ---- items ---- */
  .items { width: 100%; border-collapse: collapse; }
  .items td { padding: 1px 0; vertical-align: top; }
  .item-name   { font-weight: 900; font-size: 12px; padding-top: 4px; border-top: 1px dotted #000; }
  .item-detail { font-size: 11px; font-weight: 700; padding-left: 2px; width: 65%; }
  .item-amt    { text-align: right; font-weight: 900; font-size: 12px; white-space: nowrap; width: 35%; }

  /* ---- subtotals ---- */
  .totals { width: 100%; border-collapse: collapse; }
  .totals td { font-size: 12px; font-weight: 700; padding: 1px 0; }
  .tlbl { width: 55%; }
  .tval { text-align: right; white-space: nowrap; }

  /* ---- grand total box (table for reliable print) ---- */
  .grand-tbl { width: 100%; border-collapse: collapse; border: 2.5px solid #000; margin: 4px 0; }
  .grand-tbl td { padding: 3px 5px; font-size: 14px; font-weight: 900; }
  .grand-tbl .g-val { text-align: right; white-space: nowrap; }

  /* ---- paid box ---- */
  .paid-tbl { width: 100%; border-collapse: collapse; border: 1.5px solid #000; margin: 3px 0; }
  .paid-tbl td { padding: 2px 5px; font-size: 12px; font-weight: 700; }
  .paid-tbl .p-val { text-align: right; font-weight: 900; white-space: nowrap; }

  .footer { font-size: 11px; font-weight: 700; text-align: center; margin-top: 6px; line-height: 1.5; }
  .powered{ font-size: 11px; font-weight: 700; text-align: center; margin-top: 2px; }
</style>
</head>
<body>

<!-- HEADER -->
<div class="center">
  <img src="${logoSrc}" class="logo" alt="logo" />
  <div class="umg-tag">UMG</div>
  <div class="store-name">${storeName}</div>
  ${address  ? `<div class="store-info">${address}</div>` : ""}
  ${phone    ? `<div class="store-info">Tel: ${phone}${whatsapp ? " | WA: " + whatsapp : ""}</div>` : ""}
</div>

<div class="dash"></div>

<!-- META -->
<table class="meta">
  <tr><td class="lbl">Date:</td>    <td class="val">${new Date(sale.created_at || Date.now()).toLocaleDateString("en-PK")} ${new Date(sale.created_at || Date.now()).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}</td></tr>
  <tr><td class="lbl">Invoice:</td> <td class="val bold">${sale.invoice_no}</td></tr>
  <tr><td class="lbl">Cashier:</td> <td class="val">${sale.cashier_name || ""}</td></tr>
  ${sale.customer_name ? `<tr><td class="lbl">Customer:</td><td class="val">${sale.customer_name}</td></tr>` : ""}
  <tr><td class="lbl">Payment:</td> <td class="val">${payMethod}</td></tr>
</table>

<div class="dash"></div>

<!-- ITEMS -->
<table class="items">${itemsHtml}</table>

<div class="dash"></div>

<!-- SUBTOTALS -->
<table class="totals">
  <tr><td class="tlbl">Subtotal:</td><td class="tval">${fmt(subtotal, currency)}</td></tr>
  ${discAmt > 0 ? `<tr><td class="tlbl">Discount${discPct > 0 ? " (" + discPct + "%)" : ""}:</td><td class="tval">- ${fmt(discAmt, currency)}</td></tr>` : ""}
  ${taxAmt  > 0 ? `<tr><td class="tlbl">Tax (${taxPct}%):</td><td class="tval">${fmt(taxAmt, currency)}</td></tr>` : ""}
</table>

<div class="solid"></div>

<!-- GRAND TOTAL -->
<table class="grand-tbl">
  <tr><td>TOTAL:</td><td class="g-val">${fmt(grandTotal, currency)}</td></tr>
</table>

<!-- PAID / CHANGE -->
<table class="paid-tbl">
  <tr><td>Cash Paid (${payMethod}):</td><td class="p-val">${fmt(paidAmount, currency)}</td></tr>
  ${changeAmt > 0 ? `<tr><td>Change:</td><td class="p-val">${fmt(changeAmt, currency)}</td></tr>` : ""}
</table>

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
  const w = window.open("", "_blank", "width=320,height=600,scrollbars=yes");
  if (w) { w.document.write(html); w.document.close(); }
}

export function ThermalReceipt(_props: ThermalReceiptProps) {
  return null;
}
