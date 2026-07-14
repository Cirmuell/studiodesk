import { Link, useRouterState, useRouter } from "@tanstack/react-router";
import { OnboardingTour } from "@/components/OnboardingTour";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile } from "@/lib/profile.functions";
import {
  Home,
  Users,
  Briefcase,
  Calculator,
  FileText,
  Settings as SettingsIcon,
  Plus,
  LogOut,
  User,
  CreditCard,
  HelpCircle,
  ShieldCheck,
  Scale,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type Tab = {
  to: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
  accent?: boolean;
};

const tabs: Tab[] = [
  { to: "/dashboard", label: "Home", icon: Home, exact: true },
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
  const router = useRouter();
  
  const fetchProfile = useServerFn(getProfile);
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
  });

  const currencySymbol = profile?.currency
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: profile.currency, currencyDisplay: "narrowSymbol" })
        .formatToParts(0)
        .find((x) => x.type === "currency")?.value || "$"
    : "$";

  async function signOut() {
    await supabase.auth.signOut();
    // Use router.navigate for consistent client-side routing in Capacitor WebView.
    // window.location.href would cause a full page reload, bypassing route guards.
    await router.navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col mx-auto max-w-md sm:max-w-lg w-full">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Settings menu"
                  className="size-10 grid place-items-center rounded-full bg-surface border border-border text-muted-foreground hover:text-foreground transition"
                >
                  <SettingsIcon className="size-[18px]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 shadow-[var(--shadow-pop)] border-border/80">
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5">
                  <Link to="/settings" className="flex items-center gap-2.5 w-full">
                    <User className="size-[15px]" />
                    <span className="font-medium text-[13px]">Business Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5">
                  <Link to="/subscription" className="flex items-center gap-2.5 w-full">
                    <CreditCard className="size-[15px]" />
                    <span className="font-medium text-[13px]">Subscription</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1.5" />
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5">
                  <Link to="/faq" className="flex items-center gap-2.5 w-full">
                    <HelpCircle className="size-[15px]" />
                    <span className="font-medium text-[13px]">FAQ</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5">
                  <Link to="/privacy" className="flex items-center gap-2.5 w-full">
                    <ShieldCheck className="size-[15px]" />
                    <span className="font-medium text-[13px]">Privacy Policy</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5">
                  <Link to="/tos" className="flex items-center gap-2.5 w-full">
                    <Scale className="size-[15px]" />
                    <span className="font-medium text-[13px]">Terms of Service</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1.5" />
                <DropdownMenuItem 
                  onClick={signOut} 
                  className="rounded-xl cursor-pointer py-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <div className="flex items-center gap-2.5 w-full">
                    <LogOut className="size-[15px]" />
                    <span className="font-medium text-[13px]">Sign out</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 px-5 pt-4 pb-28">{children}</main>

      {/* Floating Action Area */}
      {action && (
        <div className="fixed bottom-[90px] inset-x-0 mx-auto max-w-md sm:max-w-lg px-5 z-50 pointer-events-none flex justify-end">
          <div className="pointer-events-auto shadow-2xl rounded-full">
            {action}
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 inset-x-0 z-40 mx-auto max-w-md sm:max-w-lg px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
        <div className="bg-surface/95 backdrop-blur-md border border-border rounded-2xl shadow-[var(--shadow-pop)] px-2 py-2 grid grid-cols-5">
          {tabs.map((t) => {
            const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
            const Icon = t.icon;
            if (t.accent) {
              return (
                <Link
                  key={t.to}
                  id={`tour-${t.label.toLowerCase()}`}
                  to={t.to as never}
                  className="flex flex-col items-center justify-center -mt-6"
                  aria-label={t.label}
                >
                  <span
                    className={cn(
                      "size-14 rounded-full grid place-items-center text-primary-foreground shadow-[var(--shadow-pop)] border-4 border-background transition",
                      "bg-primary",
                    )}
                  >
                    {profile ? <span className="text-2xl font-medium">{currencySymbol}</span> : <Plus className="size-6" />}
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
                id={`tour-${t.label.toLowerCase()}`}
                to={t.to as never}
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
      <OnboardingTour />
    </div>
  );
}
