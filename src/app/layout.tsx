import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/geist";
import { EntryLoader, EntryLoaderScript } from "@/components/site/entry-loader";
import { Providers } from "@/components/site/providers";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "ToolNest Pro | Everyday tools in one place",
    template: "%s | ToolNest Pro",
  },
  description:
    "Explore the ToolNest Pro tools for images, documents, code, text, design, everyday utilities, and student productivity.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ToolNest Pro",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "ToolNest Pro",
    description:
      "Browse the all-in-one toolkit for everyday digital tasks.",
    type: "website",
    siteName: "ToolNest Pro",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <EntryLoaderScript />
        <EntryLoader />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
