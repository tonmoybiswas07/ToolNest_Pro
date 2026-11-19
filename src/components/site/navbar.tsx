"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [{ href: "/", label: "Home" }, { href: "/tools", label: "Explore tools" }];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function navigationLinks() {
    return links.map(({ href, label }) => {
      const active = href === "/" ? pathname === href : pathname.startsWith("/tools");
      return <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={pathname === href ? "page" : undefined} className={cn("rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground", active && "bg-accent text-foreground")}>{label}</Link>;
    });
  }

  return (
    <header className="site-header">
      <div className="shell flex min-h-18 items-center justify-between gap-3">
        <Brand />
        <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">{navigationLinks()}</nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" className="hidden md:inline-flex" asChild><Link href="/login">Sign in</Link></Button>
          <Button className="hidden md:inline-flex" asChild><Link href="/register">Create account</Link></Button>
          <Button type="button" variant="outline" size="icon" aria-label={open ? "Close navigation" : "Open navigation"} aria-controls="mobile-navigation" aria-expanded={open} className="md:hidden" onClick={() => setOpen(!open)}>
            {open ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
          </Button>
        </div>
      </div>
      <nav id="mobile-navigation" aria-label="Mobile navigation" hidden={!open} className="border-t border-border md:hidden">
        <div className="shell grid gap-2 py-4">
          {navigationLinks()}
          <Button variant="outline" asChild><Link href="/login" onClick={() => setOpen(false)}>Sign in</Link></Button>
          <Button asChild><Link href="/register" onClick={() => setOpen(false)}>Create account</Link></Button>
        </div>
      </nav>
    </header>
  );
}
