import Link from "next/link";
import { Brand } from "./brand";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="shell flex flex-col justify-between gap-7 py-10 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <Brand />
          <p className="text-sm text-muted-foreground">A toolkit for everyday digital work.</p>
        </div>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground [&_a:hover]:text-foreground">
          <Link href="/tools">Explore tools</Link>
          <Link href="/login">Sign in</Link>
          <Link href="/register">Create account</Link>
        </nav>
      </div>
    </footer>
  );
}
