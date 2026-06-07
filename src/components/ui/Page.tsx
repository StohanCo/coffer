import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** Page title block — used at the top of every section for consistent rhythm. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Small section heading with an optional "View all" affordance. */
export function SectionHeading({
  title,
  onViewAll,
  className,
}: {
  title: string;
  onViewAll?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between", className)}>
      <h2 className="stat-label">{title}</h2>
      {onViewAll && (
        <button
          onClick={onViewAll}
          className="text-xs font-medium text-emerald-400 transition-colors hover:text-emerald-300 cursor-pointer"
        >
          View all
        </button>
      )}
    </div>
  );
}

/** Composed empty state — an icon, a line, and an optional primary action. */
export function EmptyState({
  icon: Icon,
  label,
  hint,
  action,
  onAction,
}: {
  icon?: React.ElementType;
  label: string;
  hint?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-brand-surface/30 px-6 py-10 text-center">
      {Icon && (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800/70 text-slate-500">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <p className="text-sm font-medium text-slate-300">{label}</p>
      {hint && <p className="mt-1 max-w-xs text-xs text-slate-500">{hint}</p>}
      {action && onAction && (
        <button onClick={onAction} className="btn-secondary mt-4 px-3 py-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          {action}
        </button>
      )}
    </div>
  );
}
