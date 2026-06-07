import type { Client } from "@/lib/mock-data";

export function ClientAvatar({ client, size = 36 }: { client: Client; size?: number }) {
  return (
    <div
      className="grid place-items-center rounded-full font-display text-surface-foreground font-semibold shrink-0"
      style={{ width: size, height: size, backgroundColor: client.color, fontSize: size * 0.42 }}
      aria-hidden
    >
      {client.initial}
    </div>
  );
}

export function TierBadge({ tier }: { tier: Client["tier"] }) {
  const map = {
    standard: "bg-muted text-muted-foreground",
    preferred: "bg-accent text-accent-foreground",
    enterprise: "bg-secondary text-secondary-foreground",
  } as const;
  return (
    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${map[tier]}`}>
      {tier}
    </span>
  );
}
