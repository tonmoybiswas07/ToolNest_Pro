"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Search } from "lucide-react";
import { useState } from "react";
import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/features/auth/logout-button";
import { UserAvatar } from "@/features/auth/user-avatar";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/tools", label: "Explore tools" },
  { href: "/student", label: "Student Hub" },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const [open, setOpen] = useState(false);

  function navigationLinks() {
    return links.map(({ href, label }) => {
      const active =
        href === "/" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
      return (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          aria-current={pathname === href ? "page" : undefined}
          className={cn(
            "rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground",
            active && "bg-accent text-foreground",
          )}
        >
          {label}
        </Link>
      );
    });
  }

  return (
    <header className="site-header">
      <div className="shell flex min-h-18 items-center justify-between gap-3">
        <Brand />
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-1 lg:flex"
        >
          {navigationLinks()}
        </nav>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
            className="hidden items-center gap-2 text-xs text-muted-foreground sm:inline-flex"
            aria-label="Open Command Palette"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search</span>
            <kbd className="rounded border border-border bg-accent px-1.5 py-0.5 text-[10px]">⌘K</kbd>
          </Button>
          <ThemeToggle />
          {user ? (
            <>
              <Link
                href="/profile"
                className="rounded-full"
                aria-label={`Profile for ${user.name}`}
              >
                <UserAvatar name={user.name} image={user.image} />
              </Link>
              <Button variant="ghost" className="hidden lg:inline-flex" asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button variant="ghost" className="hidden lg:inline-flex" asChild>
                <Link href="/profile">Profile</Link>
              </Button>
              {user.role === "admin" && (
                <Button
                  variant="ghost"
                  className="hidden lg:inline-flex"
                  asChild
                >
                  <Link href="/admin">Admin dashboard</Link>
                </Button>
              )}
              <LogoutButton className="hidden lg:inline-flex" />
            </>
          ) : (
            <>
              <Button variant="ghost" className="hidden lg:inline-flex" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button className="hidden lg:inline-flex" asChild>
                <Link href="/register">Create account</Link>
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-controls="mobile-navigation"
            aria-expanded={open}
            className="lg:hidden"
            onClick={() => setOpen(!open)}
          >
            {open ? (
              <X size={18} aria-hidden />
            ) : (
              <Menu size={18} aria-hidden />
            )}
          </Button>
        </div>
      </div>
      <nav
        id="mobile-navigation"
        aria-label="Mobile navigation"
        hidden={!open}
        className="border-t border-border lg:hidden"
      >
        <div className="shell grid gap-2 py-4">
          {navigationLinks()}
          {user ? (
            <>
              <Button variant="ghost" asChild>
                <Link href="/dashboard" onClick={() => setOpen(false)}>
                  Dashboard
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/profile" onClick={() => setOpen(false)}>
                  Profile
                </Link>
              </Button>
              {user.role === "admin" && (
                <Button variant="ghost" asChild>
                  <Link href="/admin" onClick={() => setOpen(false)}>
                    Admin dashboard
                  </Link>
                </Button>
              )}
              <LogoutButton />
            </>
          ) : (
            <>
              <Button variant="outline" asChild>
                <Link href="/login" onClick={() => setOpen(false)}>
                  Sign in
                </Link>
              </Button>
              <Button asChild>
                <Link href="/register" onClick={() => setOpen(false)}>
                  Create account
                </Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
