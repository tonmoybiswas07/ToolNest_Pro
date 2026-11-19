import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/geist";
import { Providers } from "@/components/site/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ToolNest Pro | Everyday tools in one place", template: "%s | ToolNest Pro" },
  description: "Explore the ToolNest Pro catalog of 33 planned tools for images, documents, code, text, design, everyday utilities, and social video.",
  openGraph: {
    title: "ToolNest Pro",
    description: "Browse the planned all-in-one toolkit for everyday digital tasks.",
    type: "website",
    siteName: "ToolNest Pro",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
