export function formatCurrency(amount: number | null | undefined, currency = "NGN"): string {
  const n = Number(amount ?? 0);
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₦${n.toLocaleString()}`;
  }
}

const PALETTE = [
  "oklch(0.78 0.12 35)",
  "oklch(0.78 0.1 150)",
  "oklch(0.75 0.1 250)",
  "oklch(0.78 0.12 80)",
  "oklch(0.74 0.13 320)",
  "oklch(0.78 0.11 200)",
];

export function clientColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function initialOf(name: string | null | undefined): string {
  return (name ?? "?").trim().charAt(0).toUpperCase() || "?";
}

export function timeAgo(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  const w = Math.floor(days / 7);
  if (w < 5) return `${w}w ago`;
  return d.toLocaleDateString();
}
