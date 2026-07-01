import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "icon-192.png", "icon-512.png", "logo-icon.png", "logo-full.png"],
      manifest: {
        name: "Coaching Pro Boost",
        short_name: "CPB",
        description: "Bibliothèque d'exercices et séances de basket",
        theme_color: "#1B2A4A",
        background_color: "#1B2A4A",
        display: "standalone",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
    }),
  ],
});
