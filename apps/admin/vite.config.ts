import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/admin/",
  server: {
    host: "0.0.0.0",
    hmr: {
      clientPort: 5173,
    },
    allowedHosts: [".outfiqe.local"],
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        xfwd: true,
      },
    },
  },
  // tanstackRouter must run before react() so it can generate routeTree.gen.ts first
  plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
