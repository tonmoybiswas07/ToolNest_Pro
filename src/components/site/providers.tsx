"use client";

import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { CommandPalette } from "./command-palette";
import { FeedbackModal } from "./feedback-modal";
import { PwaRegister } from "./pwa-register";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <MotionConfig reducedMotion="user">
        <ConfirmProvider>
          {children}
          <CommandPalette />
          <FeedbackModal />
          <PwaRegister />
        </ConfirmProvider>
      </MotionConfig>
      <Toaster position="bottom-center" toastOptions={{ style: {
        background: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)",
      } }} />
    </ThemeProvider>
  );
}
