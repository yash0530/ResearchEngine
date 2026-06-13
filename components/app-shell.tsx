import Link from "next/link";
import {
  Activity,
  Bell,
  BookOpen,
  Calendar,
  FileText,
  LayoutGrid,
  Newspaper,
  Radar,
  Scale,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const nav = [
  { href: "/", label: "Board", icon: LayoutGrid },
  { href: "/tickers", label: "Tickers", icon: TrendingUp },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/briefs", label: "Briefs", icon: FileText },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/series", label: "Series", icon: Activity },
  { href: "/rerate", label: "Re-rate", icon: Scale },
  { href: "/ops", label: "Ops", icon: Wrench },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Sidebar for Desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[var(--border)] bg-[var(--panel)] px-4 py-5 lg:block">
        <div className="mb-8 flex items-start justify-between gap-2 px-2">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--text)] text-[var(--bg)]">
              <Radar size={20} />
            </div>
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em]">Engine</div>
              <div className="text-[10px] text-[var(--muted)]">AI infra research</div>
              <div className="mt-1.5 text-[9px] font-mono tracking-wide text-[var(--muted)]">
                research · not advice
              </div>
            </div>
          </Link>
          <ThemeToggle />
        </div>
        <nav className="space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--soft)] hover:text-[var(--text)]"
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main layout container */}
      <div className="lg:pl-64">
        {/* Header for Mobile */}
        <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_86%,transparent)] px-4 py-3 backdrop-blur lg:hidden">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radar size={18} />
              <span className="text-sm font-semibold">Engine</span>
            </div>
            <ThemeToggle />
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="shrink-0 rounded-md border border-[var(--border)] px-3 py-1.5 text-xs">
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
