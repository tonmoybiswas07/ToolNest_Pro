"use client";

import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
      <Toaster position="bottom-center" toastOptions={{ style: {
        background: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)",
      } }} />
    </ThemeProvider>
  );
}
