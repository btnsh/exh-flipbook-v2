import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "gallery",
  base: "/gallery/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./gallery", import.meta.url)) },
  },
  build: {
    outDir: "../dist/gallery",
    emptyOutDir: true,
  },
});
