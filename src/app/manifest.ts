import type { MetadataRoute } from "next";

// Web app manifest for "NKS Ops". Next serves this at /manifest.webmanifest and
// auto-injects the <link rel="manifest"> tag into every page's <head>.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NKS Ops",
    short_name: "NKS Ops",
    description: "Controla productos y niveles de stock de un vistazo.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfbfc",
    theme_color: "#3a4fd6",
    icons: [
      {
        src: "/logo-nakashima.png",
        sizes: "447x447",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
