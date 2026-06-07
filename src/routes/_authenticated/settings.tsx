import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Building2, CreditCard, Globe2, LogOut, Receipt, Shield, Sparkles, User2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Studio" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <AppShell title="Settings" subtitle="Your business profile">
      <div className="card-soft p-5 mb-5 flex items-center gap-4">
        <div className="size-14 rounded-full bg-primary text-primary-foreground grid place-items-center font-display text-xl">
          S
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-lg">Sam Rivera</p>
          <p className="text-xs text-muted-foreground">Rivera Studio · Brand & UI</p>
        </div>
        <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-accent text-accent-foreground font-semibold">
          Pro
        </span>
      </div>

      <Group title="Business">
        <Row icon={Building2} label="Business profile" value="Rivera Studio LLC" />
        <Row icon={Receipt} label="Default currency" value="USD" />
        <Row icon={Globe2} label="Language" value="English (US)" />
      </Group>

      <Group title="Plan & usage">
        <Row icon={Sparkles} label="Plan" value="Pro · 50 / 50 AI runs" />
        <Row icon={CreditCard} label="Billing" value="Manage" />
      </Group>

      <Group title="Account">
        <Row icon={User2} label="Profile" />
        <Row icon={Shield} label="Privacy & security" />
        <Row icon={LogOut} label="Sign out" danger />
      </Group>

      <p className="text-[11px] text-muted-foreground/70 text-center mt-8">Studio v1.0 · Made for creatives</p>
    </AppShell>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold px-1 mb-2">
        {title}
      </p>
      <div className="card-soft divide-y divide-border overflow-hidden">{children}</div>
    </div>
  );
}

function Row({ icon: Icon, label, value, danger }: { icon: LucideIcon; label: string; value?: string; danger?: boolean }) {
  return (
    <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-muted transition">
      <Icon className={`size-[18px] ${danger ? "text-destructive" : "text-muted-foreground"}`} />
      <span className={`flex-1 text-sm ${danger ? "text-destructive font-medium" : ""}`}>{label}</span>
      {value && <span className="text-xs text-muted-foreground">{value}</span>}
    </button>
  );
}
