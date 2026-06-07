"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  PieChart,
  BarChart3,
  TrendingUp,
  Receipt,
  FileText,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { signOut } from "@/lib/auth/client";
import { cn, formatCurrency, getInitials } from "@/lib/utils";
import type { DashboardData } from "@/server/services/dashboard";
import OverviewSection from "@/components/sections/OverviewSection";
import AccountsSection from "@/components/sections/AccountsSection";
import TransactionsSection from "@/components/sections/TransactionsSection";
import BudgetsSection from "@/components/sections/BudgetsSection";
import AnalyticsSection from "@/components/sections/AnalyticsSection";
import StatsSection from "@/components/sections/StatsSection";
import ReceiptsSection from "@/components/sections/ReceiptsSection";
import TaxSection from "@/components/sections/TaxSection";
import SettingsSection from "@/components/sections/SettingsSection";

type Section =
  | "overview"
  | "accounts"
  | "transactions"
  | "budgets"
  | "analytics"
  | "stats"
  | "receipts"
  | "tax"
  | "settings";

const NAV_ITEMS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "accounts", label: "Accounts", icon: Wallet },
  { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
  { id: "budgets", label: "Budgets", icon: PieChart },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "stats", label: "Statistics", icon: TrendingUp },
  { id: "receipts", label: "Receipts", icon: Receipt },
  { id: "tax", label: "Tax & GST", icon: FileText },
];

type Props = {
  user: { email: string; name?: string | null };
  data: DashboardData;
};

export default function AppShell({ user, data }: Props) {
  const [section, setSection] = useState<Section>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
    router.refresh();
  }

  const displayName = user.name ?? user.email.split("@")[0];

  function NavItem({ item }: { item: (typeof NAV_ITEMS)[number] }) {
    const active = section === item.id;
    const Icon = item.icon;
    return (
      <button
        onClick={() => {
          setSection(item.id);
          setSidebarOpen(false);
        }}
        className={cn(
          "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all cursor-pointer",
          active
            ? "bg-emerald-500/10 text-emerald-400"
            : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-emerald-400" aria-hidden="true" />
        )}
        <Icon className={cn("h-4 w-4 flex-shrink-0 transition-transform", !active && "group-hover:scale-110")} />
        {item.label}
        {active && <ChevronRight className="ml-auto h-3.5 w-3.5 text-emerald-500/60" />}
      </button>
    );
  }

  function Sidebar() {
    return (
      <aside className="flex h-full w-60 flex-col border-r border-slate-800/60 bg-brand-sidebar">
        {/* Logo */}
        <div className="flex h-14 items-center gap-3 border-b border-slate-800/60 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/25">
            <span className="text-sm font-bold text-white">C</span>
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-white">Coffer</p>
            <p className="text-[10px] text-slate-500">Self-hosted</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
          <div className="mt-2 border-t border-slate-800/60 pt-2">
            <NavItem item={{ id: "settings", label: "Settings", icon: Settings }} />
          </div>
        </nav>

        {/* User footer */}
        <div className="border-t border-slate-800/60 px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-medium text-slate-200">
              {getInitials(displayName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-slate-200">{displayName}</p>
              <p className="truncate text-[10px] text-slate-500">{user.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              aria-label="Sign out"
              className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500/60 rounded p-1"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    );
  }

  function renderSection() {
    switch (section) {
      case "overview":
        return <OverviewSection data={data} onNavigate={setSection} />;
      case "accounts":
        return <AccountsSection data={data} />;
      case "transactions":
        return <TransactionsSection data={data} />;
      case "budgets":
        return <BudgetsSection data={data} />;
      case "analytics":
        return <AnalyticsSection data={data} />;
      case "stats":
        return <StatsSection data={data} />;
      case "receipts":
        return <ReceiptsSection data={data} />;
      case "tax":
        return <TaxSection data={data} />;
      case "settings":
        return <SettingsSection data={data} user={user} />;
      default:
        return null;
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-brand-bg">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-60 z-50">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 items-center justify-between border-b border-slate-800/60 bg-brand-sidebar/80 px-4 backdrop-blur md:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600">
              <span className="text-xs font-bold text-white">C</span>
            </div>
            <span className="text-sm font-semibold tracking-tight text-white">Coffer</span>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
            className="rounded-lg p-1 text-slate-400 transition-colors cursor-pointer hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <div key={section} className="mx-auto max-w-7xl px-4 py-6 animate-fade-up md:px-6 lg:px-8">
            {renderSection()}
          </div>
        </main>
      </div>
    </div>
  );
}
