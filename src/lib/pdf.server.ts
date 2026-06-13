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
    rgb(0.55, 0.36, 0.96),
  );
  const secondary = parseColor((input.profile as any)?.brand_color_secondary, rgb(0.1, 0.73, 0.51));
  const accent = parseColor((input.profile as any)?.brand_color_accent, rgb(0.96, 0.62, 0.04));

  let page = doc.addPage([595, 842]); // A4
  const margin = 48;
  let y = 800;

  const wrap = (text: string, max: number, f = font, size = 10): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (f.widthOfTextAtSize(test, size) > max) {
        if (line) lines.push(line);
        line = w;
      } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  };

  const ensure = (h: number) => {
    if (y - h < 60) {
      page = doc.addPage([595, 842]);
      y = 800;
    }
  };

  // Header
  let hasLogo = false;
  let logoHeightOffset = 0;
  if (input.profile?.logo_url) {
    try {
      const logoUrl = await getSignedBrandAssetUrl(input.profile.logo_url);
      const response = await fetch(logoUrl || input.profile.logo_url);
      const imageBytes = await response.arrayBuffer();
      let img;
      try {
        img = await doc.embedPng(imageBytes);
      } catch {
        img = await doc.embedJpg(imageBytes);
      }
      const dims = img.scaleToFit(120, 35);
      page.drawImage(img, {
        x: margin,
        y: y - dims.height + 6,
        width: dims.width,
        height: dims.height,
      });
      logoHeightOffset = dims.height + 6;
      hasLogo = true;
    } catch (err) {
      console.error("Failed to embed logo image:", err);
    }
  }

  page.drawText(input.type.toUpperCase(), {
    x: 595 - margin - bold.widthOfTextAtSize(input.type.toUpperCase(), 14),
    y,
    size: 14,
    font: bold,
    color: accent,
  });

  if (hasLogo) {
    y -= logoHeightOffset;
    page.drawText((input.profile?.business_name || "").toUpperCase(), {
      x: margin,
      y,
      size: 11,
      font: bold,
      color: ink,
    });
    y -= 14;
  } else {
    page.drawText((input.profile?.business_name || "Studio").toUpperCase(), {
      x: margin,
      y,
      size: 16,
      font: bold,
      color: ink,
    });
    y -= 18;
  }
  if (input.profile?.email) {
    page.drawText(input.profile.email, { x: margin, y, size: 9, font, color: muted });
  }
  if (input.number) {
    const t = `#${input.number}`;
    page.drawText(t, {
      x: 595 - margin - font.widthOfTextAtSize(t, 10),
      y,
      size: 10,
      font,
      color: muted,
    });
  }
  y -= 14;
  if (input.profile?.phone) {
    page.drawText(input.profile.phone, { x: margin, y, size: 9, font, color: muted });
    y -= 12;
  }
  if (input.profile?.address) {
    for (const ln of wrap(input.profile.address, 260, font, 9)) {
      page.drawText(ln, { x: margin, y, size: 9, font, color: muted });
      y -= 11;
    }
  }
  y -= 8;
  page.drawLine({
    start: { x: margin, y },
    end: { x: 595 - margin, y },
    thickness: 0.5,
    color: muted,
  });
  y -= 20;

  // Bill to + meta
  const colY = y;
  page.drawText("BILL TO", { x: margin, y: colY, size: 8, font: bold, color: muted });
  y = colY - 14;
  page.drawText(input.client?.name || input.client?.company || "—", {
    x: margin,
    y,
    size: 11,
    font: bold,
    color: ink,
  });
  y -= 13;
  if (input.client?.company && input.client?.name) {
    page.drawText(input.client.company, { x: margin, y, size: 9, font, color: muted });
    y -= 12;
  }
  if (input.client?.email) {
    page.drawText(input.client.email, { x: margin, y, size: 9, font, color: muted });
    y -= 12;
  }

  // Right meta
  let metaY = colY;
  const metaX = 360;
  const meta: [string, string][] = [
    ["Issued", input.issued_date ?? new Date().toISOString().slice(0, 10)],
    ...(input.due_date ? [["Due", input.due_date] as [string, string]] : []),
    ["Currency", input.currency],
  ];
  for (const [k, v] of meta) {
    page.drawText(k.toUpperCase(), { x: metaX, y: metaY, size: 8, font: bold, color: muted });
    page.drawText(v, { x: metaX + 70, y: metaY, size: 10, font, color: ink });
    metaY -= 14;
  }
  y = Math.min(y, metaY) - 16;

  // Title
  if (input.title || input.content.title) {
    ensure(28);
    page.drawText(input.title || input.content.title || "", {
      x: margin,
      y,
      size: 16,
      font: bold,
      color: ink,
    });
    y -= 22;
  }

  // Intro
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
    page.drawText(s.heading, { x: margin, y, size: 11, font: bold, color: secondary });
    y -= 14;
    for (const ln of wrap(s.body, 500, font, 10)) {
      ensure(13);
      page.drawText(ln, { x: margin, y, size: 10, font, color: ink });
      y -= 12;
    }
    y -= 6;
  }

  // Line items
  const items = input.content.line_items ?? [];
  if (items.length) {
    ensure(30);
    y -= 4;
    page.drawLine({
      start: { x: margin, y },
      end: { x: 595 - margin, y },
      thickness: 0.5,
      color: muted,
    });
    y -= 14;
    const cols = { desc: margin, qty: 360, rate: 410, amt: 500 };
    page.drawText("DESCRIPTION", { x: cols.desc, y, size: 8, font: bold, color: secondary });
    page.drawText("QTY", { x: cols.qty, y, size: 8, font: bold, color: secondary });
    page.drawText("RATE", { x: cols.rate, y, size: 8, font: bold, color: secondary });
    page.drawText("AMOUNT", { x: cols.amt, y, size: 8, font: bold, color: secondary });
    y -= 12;
    page.drawLine({
      start: { x: margin, y },
      end: { x: 595 - margin, y },
      thickness: 0.5,
      color: muted,
    });
    y -= 12;
    for (const li of items) {
      const lines = wrap(li.label, 300, font, 10);
      ensure(lines.length * 12 + 4);
      page.drawText(lines[0] ?? "", { x: cols.desc, y, size: 10, font, color: ink });
      page.drawText(String(li.quantity), { x: cols.qty, y, size: 10, font, color: ink });
      page.drawText(formatPdfCurrency(li.unit_rate, input.currency), {
        x: cols.rate,
        y,
        size: 10,
        font,
        color: ink,
      });
      const amtStr = formatPdfCurrency(li.amount, input.currency);
      page.drawText(amtStr, {
        x: 595 - margin - font.widthOfTextAtSize(amtStr, 10),
        y,
        size: 10,
        font,
        color: ink,
      });
      y -= 12;
      for (let i = 1; i < lines.length; i++) {
        page.drawText(lines[i], { x: cols.desc, y, size: 10, font, color: muted });
        y -= 12;
      }
      y -= 2;
    }
    y -= 4;
    page.drawLine({
      start: { x: margin, y },
      end: { x: 595 - margin, y },
      thickness: 0.5,
      color: muted,
    });
    y -= 16;

    // Totals
    const totals: [string, number, boolean][] = [
      ["Subtotal", input.subtotal, false],
      ["VAT (7.5%)", input.tax, false],
      ["Total", input.total, true],
    ];
    for (const [label, value, isTotal] of totals) {
      ensure(14);
      const f = isTotal ? bold : font;
      const s = isTotal ? 12 : 10;
      const txt = formatPdfCurrency(value, input.currency);
      page.drawText(label, { x: 410, y, size: s, font: f, color: ink });
      page.drawText(txt, {
        x: 595 - margin - f.widthOfTextAtSize(txt, s),
        y,
        size: s,
        font: f,
        color: isTotal ? primary : ink,
      });
      y -= 14;
    }
    y -= 8;
  }

  // Terms
  if (input.content.terms) {
    ensure(24);
    page.drawText("TERMS", { x: margin, y, size: 8, font: bold, color: muted });
    y -= 12;
    for (const ln of wrap(input.content.terms, 500, font, 9)) {
      ensure(12);
      page.drawText(ln, { x: margin, y, size: 9, font, color: muted });
      y -= 11;
    }
    y -= 8;
  }

  // Payment instructions
  if (input.content.payment_instructions || input.profile?.bank_details) {
    ensure(24);
    page.drawText("PAYMENT", { x: margin, y, size: 8, font: bold, color: muted });
    y -= 12;
    const text = input.content.payment_instructions || input.profile?.bank_details || "";
    for (const ln of wrap(text, 500, font, 9)) {
      ensure(12);
      page.drawText(ln, { x: margin, y, size: 9, font, color: ink });
      y -= 11;
    }
  }

  // Signature
  if (input.profile?.signature_url) {
    try {
      const sigUrl = await getSignedBrandAssetUrl(input.profile.signature_url);
      const response = await fetch(sigUrl || input.profile.signature_url);
      const imageBytes = await response.arrayBuffer();
      let img;
      try {
        img = await doc.embedPng(imageBytes);
      } catch {
        img = await doc.embedJpg(imageBytes);
      }
      const dims = img.scaleToFit(120, 35);
      ensure(dims.height + 30);
      y -= 18;
      page.drawText("SIGNATURE", { x: margin, y, size: 8, font: bold, color: muted });
      y -= dims.height + 6;
      page.drawImage(img, {
        x: margin,
        y,
        width: dims.width,
        height: dims.height,
      });
      y -= 12;
      page.drawText(input.profile.owner_name || "", { x: margin, y, size: 9, font, color: ink });
    } catch (err) {
      console.error("Failed to embed signature image:", err);
    }
  }

  return await doc.save();
}
