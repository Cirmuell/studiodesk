import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Users, Briefcase, Calculator, FileText, Bell, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tab = {
  to: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
  accent?: boolean;
};

const tabs: Tab[] = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/projects", label: "Projects", icon: Briefcase },
  { to: "/pricing", label: "Pricing", icon: Calculator, accent: true },
  { to: "/documents", label: "Docs", icon: FileText },
  { to: "/clients", label: "Clients", icon: Users },
];

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}

export function AppShell({ title, subtitle, children, action }: AppShellProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-dvh bg-background flex flex-col mx-auto max-w-md sm:max-w-lg w-full">
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border/60 px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {subtitle && (
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-medium">
                {subtitle}
              </p>
            )}
            <h1 className="font-display text-[26px] leading-tight text-foreground truncate">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {action}
            <button
              aria-label="Notifications"
              className="size-10 grid place-items-center rounded-full bg-surface border border-border text-muted-foreground hover:text-foreground transition"
            >
              <Bell className="size-[18px]" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-5 pt-4 pb-28">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 z-40 mx-auto max-w-md sm:max-w-lg px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
        <div className="bg-surface/95 backdrop-blur-md border border-border rounded-2xl shadow-[var(--shadow-pop)] px-2 py-2 grid grid-cols-5">
          {tabs.map((t) => {
            const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
            const Icon = t.icon;
            if (t.accent) {
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className="flex flex-col items-center justify-center -mt-6"
                  aria-label={t.label}
                >
                  <span
                    className={cn(
                      "size-14 rounded-full grid place-items-center text-primary-foreground shadow-[var(--shadow-pop)] border-4 border-background transition",
                      "bg-primary",
                    )}
                  >
                    <Plus className="size-6" />
                  </span>
                  <span className="text-[10px] mt-1 font-medium text-muted-foreground">
                    {t.label}
                  </span>
                </Link>
              );
            }
            return (
              <Link
                key={t.to}
                to={t.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-[20px]" strokeWidth={active ? 2.4 : 1.8} />
                <span className="text-[10px] font-medium">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
