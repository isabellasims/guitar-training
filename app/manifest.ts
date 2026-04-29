import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tonic — Guitar practice",
    short_name: "Tonic",
    description:
      "Personal guitar theory practice with drones, fretboard work, and pitch detection.",
    start_url: "/",
    display: "standalone",
    background_color: "#ede2cd",
    theme_color: "#ede2cd",
    orientation: "portrait",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
    ],
  };
}
