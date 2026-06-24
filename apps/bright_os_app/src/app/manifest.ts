import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bright OS",
    short_name: "Bright OS",
    description: "Приватное приложение Bright OS",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#e6e6e6",
    theme_color: "#e6e6e6",
    icons: [
      {
        src: "/icons/Icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/Icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/Icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/Icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
