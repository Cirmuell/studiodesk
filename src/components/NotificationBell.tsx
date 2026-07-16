import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/notifications.functions";
import { supabase } from "@/integrations/supabase/client";
import { Bell, CheckCheck, FileText, BarChart3, Eye, Shield, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

// ─── Icon map by notification type ───────────────────────────────────────────

const TYPE_META: Record<
  string,
  { icon: React.ElementType; color: string; bg: string }
> = {
  pricing_ready:      { icon: BarChart3,  color: "text-violet-400", bg: "bg-violet-500/15" },
  document_paid:      { icon: CheckCheck, color: "text-emerald-400", bg: "bg-emerald-500/15" },
  document_accepted:  { icon: FileText,   color: "text-blue-400",   bg: "bg-blue-500/15" },
  document_viewed:    { icon: Eye,        color: "text-amber-400",  bg: "bg-amber-500/15" },
  trial_expiring:     { icon: Clock,      color: "text-orange-400", bg: "bg-orange-500/15" },
  trial_expired:      { icon: Shield,     color: "text-red-400",    bg: "bg-red-500/15" },
};

const DEFAULT_META = { icon: Bell, color: "text-primary", bg: "bg-primary/15" };

// ─── Notification Item ────────────────────────────────────────────────────────

function NotificationItem({
  n,
  onRead,
}: {
  n: Notification;
  onRead: (id: string, link: string | null) => void;
}) {
  const meta = TYPE_META[n.type] ?? DEFAULT_META;
  const Icon = meta.icon;

  return (
    <button
      onClick={() => onRead(n.id, n.link)}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 text-left transition-all duration-200 hover:bg-surface/60 group",
        !n.read && "bg-primary/5",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex-shrink-0 size-8 rounded-full grid place-items-center",
          meta.bg,
        )}
      >
        <Icon className={cn("size-4", meta.color)} />
      </span>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-[13px] leading-snug truncate",
            n.read ? "text-muted-foreground" : "text-foreground font-medium",
          )}
        >
          {n.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
          {n.body}
        </p>
        <p className="text-[11px] text-muted-foreground/60 mt-1">
          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
        </p>
      </div>
      {!n.read && (
        <span className="mt-2 flex-shrink-0 size-2 rounded-full bg-primary animate-pulse" />
      )}
    </button>
  );
}

// ─── Main Bell Component ──────────────────────────────────────────────────────

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  const listFn = useServerFn(listNotifications);
  const markReadFn = useServerFn(markNotificationRead);
  const markAllFn = useServerFn(markAllNotificationsRead);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listFn(),
    refetchInterval: 60_000, // poll every 60 s as fallback
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ── Supabase Realtime subscription ────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => {
          // Refetch when a new notification arrives
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // ── Close on outside click ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        !panelRef.current?.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleRead = useCallback(
    async (id: string, link: string | null) => {
      setOpen(false);
      await markReadFn({ id });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      if (link) router.navigate({ to: link as never });
    },
    [markReadFn, queryClient, router],
  );

  const handleMarkAll = useCallback(async () => {
    await markAllFn();
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [markAllFn, queryClient]);

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative size-10 grid place-items-center rounded-full bg-surface border border-border text-muted-foreground hover:text-foreground transition"
      >
        <Bell className="size-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1 shadow-md animate-in zoom-in-50 duration-200">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications panel"
          className={cn(
            "absolute right-0 top-12 z-50",
            "w-[340px] max-h-[480px] flex flex-col",
            "bg-background border border-border/80 rounded-2xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.4)]",
            "animate-in slide-in-from-top-2 fade-in-0 duration-200",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <span className="font-display font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs text-primary hover:text-primary/80 transition flex items-center gap-1"
              >
                <CheckCheck className="size-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <Bell className="size-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">You're all caught up</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Notifications for pricing reports, document activity and more will appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem key={n.id} n={n as Notification} onRead={handleRead} />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border/60 px-4 py-2.5 text-center">
              <p className="text-[11px] text-muted-foreground/50">
                Showing last {notifications.length} notifications
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
