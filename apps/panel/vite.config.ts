import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "uxp-classic-script-tag",
      enforce: "post",
      transformIndexHtml(html) {
        // UXP executes plain bundled scripts, not browser module scripts.
        return html.replace(/ type="module"/g, "").replace(/ crossorigin/g, "");
      },
    },
  ],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    rollupOptions: {
      input: "index.html",
      output: {
        // UXP loads plugin HTML with its CommonJS-style runtime. An ES-module
        // script leaves the root empty in Premiere even though CSS loads.
        format: "iife",
        inlineDynamicImports: true,
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
