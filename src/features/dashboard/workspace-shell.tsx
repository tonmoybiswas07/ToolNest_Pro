"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, Menu, PanelLeft, Settings, UserRound, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/site/brand";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const workspaceLinks = [
  { href: "/dashboard", label: "Overview", icon: PanelLeft },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/tools", label: "Tools directory", icon: LayoutGrid },
];

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="workspace">
      <header className="workspace-header flex items-center justify-between gap-3 border-b border-border px-4 sm:px-6">
        <Brand />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button type="button" variant="outline" size="icon" className="md:hidden" aria-label={open ? "Close sidebar" : "Open sidebar"} aria-controls="workspace-sidebar" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
          </Button>
        </div>
      </header>
      <aside id="workspace-sidebar" className={cn("workspace-sidebar hidden border-border bg-card px-4 py-5 md:block", open && "block")}>
        <p className="mb-4 px-3 text-sm font-semibold text-muted-foreground">Workspace</p>
        <nav aria-label="Workspace navigation" className="grid gap-1">
          {workspaceLinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={cn("workspace-link", pathname === href && "bg-accent text-foreground")} onClick={() => setOpen(false)}>
              <Icon size={17} aria-hidden /> {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main id="main" className="workspace-main min-w-0 p-5 sm:p-8 lg:p-12">{children}</main>
    </div>
  );
}
