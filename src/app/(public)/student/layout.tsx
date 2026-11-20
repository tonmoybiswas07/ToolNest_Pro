"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  ["/student", "Student Hub"],
  ["/student/dashboard", "Dashboard"],
  ["/student/tools", "Student tools"],
  ["/student/settings", "Student settings"],
] as const;

export default function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="shell student-shell pb-12 sm:pb-16">
      <nav aria-label="Student navigation" className="student-nav my-4 flex flex-wrap gap-x-5 sm:my-7 sm:gap-x-8">
        {navigation.map(([href, title]) => {
          const active = pathname === href || (href !== "/student" && pathname.startsWith(href + "/"));
          return <Link key={href} href={href} data-active={active} aria-current={pathname === href ? "page" : undefined}>{title}</Link>;
        })}
      </nav>
      {children}
    </div>
  );
}
