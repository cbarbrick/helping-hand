import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Helping Hand",
    short_name: "Helping Hand",
    description: "Housing, food, ID, jobs and healthcare help in North Miami, in your language.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f7f3",
    theme_color: "#2F6B4F",
    lang: "en",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
