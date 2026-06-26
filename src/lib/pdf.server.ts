import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatCurrency } from "./format";
import { getSignedBrandAssetUrl } from "./profile.functions";

function formatPdfCurrency(amount: number | null | undefined, currency = "NGN"): string {
  const formatted = formatCurrency(amount, currency);
  // Replace Naira symbol ₦ (U+20A6) with "NGN " because standard WinAnsi PDF fonts cannot encode it.
  return formatted.replace(/\u20A6/g, "NGN ");
}

type LineItem = {
  label: string;
  quantity: number;
  unit: string;
  unit_rate: number;
  amount: number;
};
type DocContent = {
  title?: string;
  intro?: string;
  sections?: { heading: string; body: string }[];
  line_items?: LineItem[];
  terms?: string;
  payment_instructions?: string;
  project_total?: number;
  previous_payments?: number;
};

export interface PdfInput {
  type: string;
  number: string | null;
  title: string | null;
  content: DocContent;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  issued_date: string | null;
  due_date: string | null;
  profile: {
    business_name?: string | null;
    owner_name?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    bank_details?: string | null;
    logo_url?: string | null;
    signature_url?: string | null;
    brand_color?: string | null;
    brand_font?: string | null;
  } | null;
  client: {
    name?: string | null;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
}

export async function renderDocumentPdf(input: PdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  // Dynamic standard font loading
  const fontChoice = input.profile?.brand_font || "Helvetica";
  let standardFont = StandardFonts.Helvetica;
  let boldFont = StandardFonts.HelveticaBold;
  if (fontChoice === "TimesRoman") {
    standardFont = StandardFonts.TimesRoman;
    boldFont = StandardFonts.TimesRomanBold;
  } else if (fontChoice === "Courier") {
    standardFont = StandardFonts.Courier;
    boldFont = StandardFonts.CourierBold;
  }

  const font = await doc.embedFont(standardFont);
  const bold = await doc.embedFont(boldFont);
  
  const ink = rgb(0.13, 0.13, 0.15);
  const muted = rgb(0.45, 0.45, 0.48);
  const white = rgb(1, 1, 1);
  const lightGray = rgb(0.95, 0.95, 0.95);
  const altGray = rgb(0.97, 0.97, 0.97);

  // Dynamic brand color parser
  const parseColor = (hex?: string | null, fallback = rgb(0.55, 0.36, 0.96)) => {
    if (!hex) return fallback;
    const clean = hex.replace("#", "");
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return rgb(
      isNaN(r) ? fallback.red : r,
      isNaN(g) ? fallback.green : g,
      isNaN(b) ? fallback.blue : b,
    );
  };

  const primary = parseColor(
    (input.profile as any)?.brand_color_primary || input.profile?.brand_color,
    rgb(0.08, 0.16, 0.27), // Dark blue default
  );
  const secondary = parseColor((input.profile as any)?.brand_color_secondary, primary);
  const accent = parseColor((input.profile as any)?.brand_color_accent, rgb(0.85, 0.28, 0.23)); // Red default

  let page = doc.addPage([595, 842]); // A4
  const margin = 48;
  let y = 842;

  const wrap = (text: string, max: number, f = font, size = 10): string[] => {
    const lines: string[] = [];
    const paragraphs = text.split(/\r?\n/);
    for (const p of paragraphs) {
      if (!p) {
        lines.push("");
        continue;
      }
      const words = p.split(/\s+/);
      let line = "";
      for (const w of words) {
        if (!w) continue;
        const test = line ? line + " " + w : w;
        if (f.widthOfTextAtSize(test, size) > max) {
          if (line) lines.push(line);
          line = w;
        } else line = test;
      }
      if (line) lines.push(line);
    }
    return lines;
  };

  const ensure = (h: number) => {
    // Add space for footer (60) + margin
    if (y - h < 80) {
      page = doc.addPage([595, 842]);
      y = 842 - margin;
    }
  };

  // Header Banner (Top Edge)
  y -= 18;
  page.drawRectangle({ x: 0, y, width: 595, height: 18, color: primary });
  y -= 6;
  page.drawRectangle({ x: 0, y, width: 595, height: 6, color: accent });
  
  y -= 40; // start actual content below banner

  // Top Left: Logo / Business Name
  let hasLogo = false;
  let logoDims = { width: 0, height: 0 };
  if (input.profile?.logo_url) {
    try {
      const logoUrl = await getSignedBrandAssetUrl(input.profile.logo_url);
      const response = await fetch(logoUrl || input.profile.logo_url);
      const imageBytes = await response.arrayBuffer();
      let img;
      try { img = await doc.embedPng(imageBytes); } 
      catch { img = await doc.embedJpg(imageBytes); }
      logoDims = img.scaleToFit(140, 45);
      page.drawImage(img, {
        x: margin,
        y: y - logoDims.height + 8,
        width: logoDims.width,
        height: logoDims.height,
      });
      hasLogo = true;
    } catch (err) {
      console.error("Failed to embed logo image:", err);
    }
  }

  // Top Right: INVOICE Text
  const typeText = input.type.toUpperCase();
  page.drawText(typeText, {
    x: 595 - margin - font.widthOfTextAtSize(typeText, 28),
    y: y - 18,
    size: 28,
    font: font, 
    color: ink,
  });

  if (hasLogo) {
    y -= logoDims.height;
    page.drawText((input.profile?.business_name || "Studio").toUpperCase(), {
      x: margin,
      y,
      size: 10,
      font: bold,
      color: primary,
    });
    y -= 16;
  } else {
    page.drawText((input.profile?.business_name || "Studio").toUpperCase(), {
      x: margin,
      y: y - 8,
      size: 16,
      font: bold,
      color: primary,
    });
    y -= 26;
  }
  
  if (input.profile?.email) {
    page.drawText(input.profile.email, { x: margin, y, size: 9, font, color: muted });
    y -= 12;
  }
  if (input.profile?.phone) {
    page.drawText(input.profile.phone, { x: margin, y, size: 9, font, color: muted });
    y -= 12;
  }

  y -= 30;

  // Meta Information Box
  const metaBoxHeight = 45;
  y -= metaBoxHeight;
  page.drawRectangle({
    x: margin,
    y,
    width: 595 - margin * 2,
    height: metaBoxHeight,
    color: lightGray
  });

  const cw = (595 - margin * 2) / 4;
  const colX = (i: number) => margin + cw * i;
  
  // Vertical dividers
  for(let i = 1; i < 4; i++) {
    page.drawLine({
      start: { x: colX(i), y: y + 10 },
      end: { x: colX(i), y: y + metaBoxHeight - 10 },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.85)
    });
  }

  const drawMetaCol = (i: number, title: string, value: string, vSize = 10, vFont = font) => {
    page.drawText(title, { x: colX(i) + 12, y: y + 26, size: 8, font, color: muted });
    
    // Truncate long client names if they don't fit
    let finalValue = value;
    if (vFont.widthOfTextAtSize(finalValue, vSize) > cw - 20) {
      finalValue = finalValue.substring(0, 15) + "...";
    }
    page.drawText(finalValue, { x: colX(i) + 12, y: y + 12, size: vSize, font: vFont, color: ink });
  };

  const typeLabels: Record<string, [string, string, string, string]> = {
    invoice: ["Invoice To", "Invoice No", "Invoice Date", "Total Due"],
    proposal: ["Prepared For", "Proposal No", "Date", "Project Value"],
    receipt: ["Billed To", "Receipt No", "Payment Date", "Amount Paid"],
    contract: ["Client", "Contract No", "Date", "Total Value"],
    quotation: ["Prepared For", "Quote No", "Date", "Total Estimate"],
  };

  const labels = typeLabels[input.type.toLowerCase()] || typeLabels.invoice;
  const clientName = input.client?.name || input.client?.company || "—";
  drawMetaCol(0, labels[0], clientName, 10, bold);
  drawMetaCol(1, labels[1], input.number ? `#${input.number}` : "—");
  drawMetaCol(2, labels[2], input.issued_date || new Date().toISOString().slice(0, 10));
  drawMetaCol(3, labels[3], formatPdfCurrency(input.total, input.currency), 12, bold);

  y -= 40;

  // Title / Intro
  if (input.title || input.content.title) {
    ensure(28);
    page.drawText(input.title || input.content.title || "", {
      x: margin,
      y,
      size: 14,
      font: bold,
      color: ink,
    });
    y -= 22;
  }

  if (input.content.intro) {
    for (const ln of wrap(input.content.intro, 500, font, 10)) {
      ensure(14);
      page.drawText(ln, { x: margin, y, size: 10, font, color: ink });
      y -= 13;
    }
    y -= 8;
  }

  // Sections
  for (const s of input.content.sections ?? []) {
    ensure(20);
    page.drawText(s.heading, { x: margin, y, size: 10, font: bold, color: primary });
    y -= 14;
    for (const ln of wrap(s.body, 500, font, 9)) {
      ensure(13);
      page.drawText(ln, { x: margin, y, size: 9, font, color: ink });
      y -= 12;
    }
    y -= 8;
  }

  // Table Headers
  const rowHeight = 22;
  const items = input.content.line_items ?? [];
  
  if (items.length > 0) {
    ensure(rowHeight + 20);
    y -= rowHeight;
    const cols = { no: margin, desc: margin + 30, qty: margin + 270, rate: margin + 320, amt: margin + 400 };
    const w = { no: 30, desc: 240, qty: 50, rate: 80, amt: 99 };

    page.drawRectangle({ x: cols.no, y, width: w.no, height: rowHeight, color: accent });
    page.drawRectangle({ x: cols.desc, y, width: w.desc, height: rowHeight, color: primary });
    page.drawRectangle({ x: cols.qty, y, width: w.qty, height: rowHeight, color: accent });
    page.drawRectangle({ x: cols.rate, y, width: w.rate, height: rowHeight, color: accent });
    page.drawRectangle({ x: cols.amt, y, width: w.amt, height: rowHeight, color: primary });

    const thY = y + 7;
    page.drawText("NO", { x: cols.no + 8, y: thY, size: 8, font: bold, color: white });
    page.drawText("ITEM DESCRIPTIONS", { x: cols.desc + 12, y: thY, size: 8, font: bold, color: white });
    page.drawText("QTY", { x: cols.qty + 12, y: thY, size: 8, font: bold, color: white });
    page.drawText("PRICE", { x: cols.rate + 12, y: thY, size: 8, font: bold, color: white });
    page.drawText("AMOUNT", { x: cols.amt + 12, y: thY, size: 8, font: bold, color: white });

    // Table Rows
    let rowIndex = 0;
    for (const li of items) {
      const lines = wrap(li.label, w.desc - 24, font, 9);
      const itemH = Math.max(lines.length * 12 + 10, rowHeight);
      ensure(itemH);
      y -= itemH;

      if (rowIndex % 2 === 0) {
        page.drawRectangle({ x: margin, y, width: 595 - margin * 2, height: itemH, color: altGray });
      }

      const ty = y + itemH - 14;
      page.drawText(String(rowIndex + 1), { x: cols.no + 8, y: ty, size: 9, font, color: muted });
      
      let ly = ty;
      for (const ln of lines) {
        page.drawText(ln, { x: cols.desc + 12, y: ly, size: 9, font, color: ink });
        ly -= 12;
      }

      page.drawText(String(li.quantity), { x: cols.qty + 12, y: ty, size: 9, font, color: muted });
      page.drawText(formatPdfCurrency(li.unit_rate, input.currency), { x: cols.rate + 12, y: ty, size: 9, font, color: muted });
      page.drawText(formatPdfCurrency(li.amount, input.currency), { x: cols.amt + 12, y: ty, size: 9, font, color: ink });

      rowIndex++;
    }
    y -= 30;
  }

  ensure(100);

  // Payment & Totals Block
  const isReceipt = input.type.toLowerCase() === "receipt";
  const paymentText = isReceipt 
    ? (input.content.payment_instructions || "") 
    : (input.content.payment_instructions || input.profile?.bank_details || "");
  
  // Right: Totals (Solid color blocks)
  let totals = [
    { label: "Sub-Total :", val: formatPdfCurrency(input.subtotal, input.currency), isTotal: false },
    { label: "Tax :", val: formatPdfCurrency(input.tax, input.currency), isTotal: false },
    { label: "TOTAL :", val: formatPdfCurrency(input.total, input.currency), isTotal: true },
  ];

  let isFinalPayment = false;
  if (isReceipt && input.content.project_total !== undefined) {
    const pTotal = input.content.project_total;
    const pPrev = input.content.previous_payments || 0;
    const balance = Math.max(0, pTotal - pPrev - input.total);
    isFinalPayment = balance === 0;

    totals = [
      { label: "Project Total :", val: formatPdfCurrency(pTotal, input.currency), isTotal: false },
      { label: "Amount Paid :", val: formatPdfCurrency(input.total, input.currency), isTotal: true },
      { label: "Balance Due :", val: formatPdfCurrency(balance, input.currency), isTotal: false },
    ];
  }

  let ty = y;
  for (const t of totals) {
    const boxH = 20;
    ty -= boxH;
    
    page.drawRectangle({ x: 330, y: ty, width: 110, height: boxH, color: accent });
    page.drawText(t.label, { 
      x: 330 + 110 - font.widthOfTextAtSize(t.label, 9) - 12, 
      y: ty + 6, 
      size: 9, font: bold, color: white 
    });

    const valBoxW = 595 - margin - 440;
    page.drawRectangle({ x: 440, y: ty, width: valBoxW, height: boxH, color: primary });
    page.drawText(t.val, { 
      x: 440 + valBoxW / 2 - font.widthOfTextAtSize(t.val, 9) / 2, 
      y: ty + 6, 
      size: 9, font: bold, color: white 
    });
    
    ty -= 2; // thin gap
  }

  if (isFinalPayment) {
    const badgeW = 100;
    const badgeH = 18;
    const badgeX = 595 - margin - badgeW;
    const badgeY = ty - 6 - badgeH;
    page.drawRectangle({ x: badgeX, y: badgeY, width: badgeW, height: badgeH, color: rgb(0.1, 0.7, 0.4), opacity: 0.15 });
    page.drawText("FINAL PAYMENT", { 
      x: badgeX + badgeW / 2 - font.widthOfTextAtSize("FINAL PAYMENT", 8) / 2, 
      y: badgeY + 5.5, 
      size: 8, font: bold, color: rgb(0.1, 0.7, 0.4) 
    });
    // Ensure we account for this extra height
    ty = badgeY; 
  }

  // Left: Payment Method / Information
  let py = y;
  if (paymentText) {
    page.drawText(isReceipt ? "PAYMENT INFORMATION :" : "Payment Method :", { x: margin, y: py - 18, size: 9, font: bold, color: ink });
    py -= 32;
    for (const ln of wrap(paymentText, 260, font, 8)) {
      page.drawText(ln, { x: margin, y: py, size: 8, font, color: muted });
      py -= 12;
    }
  }
  
  // The actual bottom of the row is the lowest of ty or py
  let bottomY = Math.min(ty, py);

  // Terms
  let tyBottom = bottomY - 20;
  if (input.content.terms) {
    ensure(40);
    page.drawText(isReceipt ? "NOTES :" : "TERMS & CONDITIONS", { x: margin, y: tyBottom, size: 8, font: bold, color: ink });
    tyBottom -= 12;
    for (const ln of wrap(input.content.terms, 500, font, 8)) {
      ensure(12);
      page.drawText(ln, { x: margin, y: tyBottom, size: 8, font, color: muted });
      tyBottom -= 11;
    }
  }

  // Signature
  let sigY = tyBottom;
  if (input.profile?.signature_url) {
    try {
      const sigUrl = await getSignedBrandAssetUrl(input.profile.signature_url);
      const response = await fetch(sigUrl || input.profile.signature_url);
      const imageBytes = await response.arrayBuffer();
      let img;
      try { img = await doc.embedPng(imageBytes); } 
      catch { img = await doc.embedJpg(imageBytes); }
      const dims = img.scaleToFit(120, 35);
      
      sigY = tyBottom - 20 - dims.height;
      ensure(120);
      
      page.drawImage(img, {
        x: 595 - margin - dims.width,
        y: sigY,
        width: dims.width,
        height: dims.height,
      });
      const ownerName = input.profile.owner_name || "Signature";
      page.drawText(ownerName, { 
        x: 595 - margin - (dims.width/2) - (font.widthOfTextAtSize(ownerName, 9)/2), 
        y: sigY - 14, 
        size: 9, font, color: primary 
      });
      page.drawText("Account Manager", {
        x: 595 - margin - (dims.width/2) - (font.widthOfTextAtSize("Account Manager", 7)/2), 
        y: sigY - 24, 
        size: 7, font, color: muted
      });
    } catch (err) {}
  } else {
    sigY = tyBottom - 60;
    ensure(120);
    const owner = input.profile?.owner_name || "Authorized Signatory";
    page.drawText(owner, { 
      x: 595 - margin - font.widthOfTextAtSize(owner, 9) / 2 - 40, 
      y: sigY, 
      size: 9, font, color: primary 
    });
    page.drawLine({
      start: { x: 595 - margin - 120, y: sigY + 14 },
      end: { x: 595 - margin, y: sigY + 14 },
      thickness: 0.5,
      color: muted
    });
  }

  // Footer block on all pages
  const footerH = 45;
  const pages = doc.getPages();
  for (const p of pages) {
    p.drawRectangle({ x: 0, y: 0, width: 595, height: footerH, color: primary });
    
    const footerY = 20;
    const addr = input.profile?.address || "Thank you for your business!";
    const phone = input.profile?.phone || "";
    const email = input.profile?.email || "";
    const website = (input.profile as any)?.website || "";
    
    let fStr = addr.replace(/\n/g, ", ");
    if (fStr.length > 55) fStr = fStr.substring(0, 55) + "...";
    p.drawText(fStr, { x: margin, y: footerY, size: 8, font, color: white });
    
    if (phone) p.drawText(`Tel: ${phone}`, { x: 260, y: footerY, size: 8, font, color: white });
    if (email) p.drawText(`Email: ${email}`, { x: 420, y: footerY, size: 8, font, color: white });
  }

  return await doc.save();
}
