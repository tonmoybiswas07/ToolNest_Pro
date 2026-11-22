import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ToolNest Pro",
    short_name: "ToolNest",
    description: "An all-in-one suite of everyday digital utilities, developer studios, and student productivity tools.",
    start_url: "/",
    display: "standalone",
    background_color: "#121f1e",
    theme_color: "#17655e",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
