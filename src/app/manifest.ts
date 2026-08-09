import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Khushi",
    short_name: "Khushi",
    description: "A private little space for Ammu and Aadi.",
    start_url: "/",
    display: "standalone",
    background_color: "#fff8f8",
    theme_color: "#ffb7c5",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}