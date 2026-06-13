import { clientColor, initialOf } from "@/lib/format";

export function ClientAvatar({
  name,
  size = 36,
}: {
  name: string | null | undefined;
  size?: number;
}) {
  const label = name ?? "?";
  return (
    <div
      className="grid place-items-center rounded-full font-display text-surface-foreground font-semibold shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: clientColor(label),
        fontSize: size * 0.42,
      }}
      aria-hidden
    >
      {initialOf(label)}
    </div>
  );
}

export function TierBadge({ tier }: { tier: string | null | undefined }) {
  const t = (tier ?? "standard") as "standard" | "preferred" | "enterprise";
  const map = {
    standard: "bg-muted text-muted-foreground",
    preferred: "bg-accent text-accent-foreground",
    enterprise: "bg-secondary text-secondary-foreground",
  } as const;
  return (
    <span
      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${map[t] ?? map.standard}`}
    >
      {t}
    </span>
  );
}
