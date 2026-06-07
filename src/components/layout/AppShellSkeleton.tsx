import { Skeleton } from "@/components/ui/Skeleton";

export default function AppShellSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-brand-bg">
      {/* Sidebar skeleton */}
      <aside className="hidden md:flex md:w-60 md:flex-col border-r border-slate-800/60 bg-brand-sidebar">
        <div className="flex h-14 items-center gap-3 border-b border-slate-800/60 px-4">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2 w-16" />
          </div>
        </div>
        <div className="flex-1 px-2 py-3 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </aside>

      {/* Main content skeleton */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-800/60 bg-brand-surface/60 p-4 space-y-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>

          {/* Two-column area */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, col) => (
              <div key={col} className="space-y-3">
                <Skeleton className="h-4 w-32" />
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
