import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/AppShell";

// ─── Shared building blocks ────────────────────────────────────────────────

function SkeletonCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="card-soft p-4 flex flex-col gap-3">
      {children}
    </div>
  );
}

function SkeletonListRow({ hasAvatar = true, wide = false }: { hasAvatar?: boolean; wide?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {hasAvatar && <Skeleton className="size-10 rounded-full shrink-0" />}
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className={`h-3.5 rounded-full ${wide ? "w-[55%]" : "w-[45%]"}`} />
        <Skeleton className="h-3 rounded-full w-[70%]" />
      </div>
      <Skeleton className="h-3 rounded-full w-12 shrink-0" />
    </div>
  );
}

function SkeletonSectionHeader() {
  return (
    <div className="flex items-center justify-between px-1 mb-2 mt-5">
      <Skeleton className="h-4 rounded-full w-28" />
      <Skeleton className="h-3 rounded-full w-12" />
    </div>
  );
}

// ─── Dashboard skeleton ────────────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <AppShell title="Dashboard">
      <div className="flex flex-col gap-4 pb-6">
        {/* Welcome strip */}
        <div className="flex flex-col gap-2 mb-1">
          <Skeleton className="h-5 rounded-full w-48" />
          <Skeleton className="h-3.5 rounded-full w-64" />
        </div>

        {/* Stat cards row */}
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <SkeletonCard key={i}>
              <Skeleton className="h-3 rounded-full w-16" />
              <Skeleton className="h-7 rounded-lg w-24" />
              <Skeleton className="h-3 rounded-full w-20" />
            </SkeletonCard>
          ))}
        </div>

        {/* Chart placeholder */}
        <SkeletonCard>
          <div className="flex items-end justify-between gap-1 h-24 px-1">
            {[40, 60, 35, 80, 55, 70, 45].map((h, i) => (
              <Skeleton
                key={i}
                className="flex-1 rounded-t-sm"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <Skeleton className="h-3 rounded-full w-32 mx-auto" />
        </SkeletonCard>

        {/* Recent items */}
        <SkeletonSectionHeader />
        <div className="card-soft divide-y divide-border/50 overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonListRow key={i} hasAvatar wide={i % 2 === 0} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

// ─── List page skeleton (Clients / Projects / Documents) ──────────────────

export function ListPageSkeleton({ title }: { title: string }) {
  return (
    <AppShell title={title}>
      <div className="flex flex-col gap-4 pb-6">
        {/* Search / filter bar */}
        <Skeleton className="h-11 rounded-2xl w-full" />

        {/* Filter pills */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-8 rounded-full w-16" />
          ))}
        </div>

        {/* List rows */}
        <div className="card-soft divide-y divide-border/50 overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonListRow key={i} hasAvatar wide={i % 3 !== 1} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

// ─── Detail page skeleton (Client / Project / Document detail) ────────────

export function DetailPageSkeleton({ title }: { title: string }) {
  return (
    <AppShell title={title}>
      <div className="flex flex-col gap-5 pb-6">
        {/* Hero / header block */}
        <SkeletonCard>
          <div className="flex items-center gap-4">
            <Skeleton className="size-14 rounded-full shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <Skeleton className="h-5 rounded-full w-40" />
              <Skeleton className="h-3.5 rounded-full w-28" />
            </div>
            <Skeleton className="h-7 rounded-full w-20 shrink-0" />
          </div>
        </SkeletonCard>

        {/* Field pairs */}
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i}>
            <Skeleton className="h-3 rounded-full w-20" />
            <Skeleton className="h-4 rounded-full w-[65%]" />
          </SkeletonCard>
        ))}

        {/* Action buttons */}
        <div className="flex gap-3">
          <Skeleton className="flex-1 h-12 rounded-full" />
          <Skeleton className="flex-1 h-12 rounded-full" />
        </div>
      </div>
    </AppShell>
  );
}

// ─── Settings skeleton ────────────────────────────────────────────────────

export function SettingsSkeleton() {
  return (
    <AppShell title="Settings">
      <div className="flex flex-col gap-5 pb-6">
        {/* Profile avatar + name */}
        <SkeletonCard>
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 rounded-full shrink-0" />
            <div className="flex flex-col gap-2 flex-1">
              <Skeleton className="h-5 rounded-full w-36" />
              <Skeleton className="h-3.5 rounded-full w-48" />
            </div>
          </div>
        </SkeletonCard>

        {/* Section 1 — form fields */}
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3.5 rounded-full w-28" />
          <div className="card-soft divide-y divide-border/50 overflow-hidden">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3.5">
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-3 rounded-full w-20" />
                  <Skeleton className="h-3.5 rounded-full w-32" />
                </div>
                <Skeleton className="h-6 w-10 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Section 2 — more fields */}
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3.5 rounded-full w-36" />
          <div className="card-soft divide-y divide-border/50 overflow-hidden">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3.5">
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-3 rounded-full w-24" />
                  <Skeleton className="h-3.5 rounded-full w-40" />
                </div>
                <Skeleton className="h-6 w-10 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Save button placeholder */}
        <Skeleton className="h-12 rounded-full w-full" />
      </div>
    </AppShell>
  );
}
