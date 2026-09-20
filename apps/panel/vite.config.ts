import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { toUxpClassicHtml } from "./uxp-html";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "uxp-classic-script-tag",
      apply: "build",
      enforce: "post",
      transformIndexHtml: toUxpClassicHtml,
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
