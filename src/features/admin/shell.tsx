"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ChartNoAxesCombined,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  Users,
  Wrench,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Brand } from "@/components/site/brand";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/features/auth/logout-button";
import { UserAvatar } from "@/features/auth/user-avatar";
import { cn } from "@/lib/utils";

const links = [
  ["", "Overview", LayoutDashboard],
  ["users", "Users", Users],
  ["activity", "Activity", Activity],
  ["searches", "Search analytics", Search],
  ["tools", "Tool analytics", Wrench],
  ["audit-logs", "Audit logs", ClipboardList],
  ["settings", "Settings", Settings],
] as const;

export function AdminSidebar({
  pathname,
  close,
}: {
  pathname: string;
  close: () => void;
}) {
  return (
    <nav aria-label="Administration" className="grid gap-1">
      {links.map(([segment, label, Icon]) => {
        const href = segment ? `/admin/${segment}` : "/admin";
        const active =
          pathname === href ||
          Boolean(segment && pathname.startsWith(href + "/"));
        return (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            onClick={close}
            className={cn(
              "workspace-link",
              active && "bg-accent text-foreground",
            )}
          >
            <Icon size={17} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminNavbar({
  user,
  open,
  toggle,
}: {
  user: { name: string; image?: string | null };
  open: boolean;
  toggle: () => void;
}) {
  return (
    <header className="workspace-header flex items-center justify-between gap-3 border-b border-border px-4 sm:px-6">
      <Brand />
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <details className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-1 font-medium [&::-webkit-details-marker]:hidden">
            <UserAvatar name={user.name} image={user.image} />
            <span className="sr-only sm:not-sr-only">Account</span>
          </summary>
          <div className="surface absolute right-0 z-20 mt-2 grid min-w-44 gap-2 p-3 shadow-xl">
            <Link href="/dashboard" className="workspace-link">
              User dashboard
            </Link>
            <LogoutButton />
          </div>
        </details>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="md:hidden"
          aria-expanded={open}
          aria-controls="admin-sidebar"
          aria-label="Toggle admin navigation"
          onClick={toggle}
        >
          <Menu size={18} aria-hidden />
        </Button>
      </div>
    </header>
  );
}

export function AdminShell({
  children,
  user,
}: {
  children: ReactNode;
  user: { name: string; image?: string | null };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const section = links.find(
    ([segment]) => segment && pathname.startsWith(`/admin/${segment}`),
  );
  return (
    <div className="workspace">
      <AdminNavbar user={user} open={open} toggle={() => setOpen(!open)} />
      <aside
        id="admin-sidebar"
        className={cn(
          "workspace-sidebar hidden border-border bg-card px-4 py-5 md:block",
          open && "block",
        )}
      >
        <div className="mb-4 flex items-center gap-2 px-3 text-sm font-semibold text-highlight">
          <ChartNoAxesCombined size={17} aria-hidden /> Administration
        </div>
        <AdminSidebar pathname={pathname} close={() => setOpen(false)} />
      </aside>
      <main
        id="main"
        className="workspace-main min-w-0 space-y-7 p-5 sm:p-8 lg:p-10"
      >
        <nav
          aria-label="Breadcrumb"
          className="flex gap-2 text-sm text-muted-foreground"
        >
          <Link href="/admin">Admin</Link>
          {section && (
            <>
              <span aria-hidden>/</span>
              <Link href={`/admin/${section[0]}`}>{section[1]}</Link>
            </>
          )}
        </nav>
        {children}
      </main>
    </div>
  );
}
