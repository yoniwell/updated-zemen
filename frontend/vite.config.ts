import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite"; // FIXED: No curly braces here
import path from "path";
import checker from "vite-plugin-checker";
import dns from "node:dns";

dns.setDefaultResultOrder("verbatim");

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Correctly calling the default export
    checker({
      typescript: true,
    }),
  ],
  
  // FIXED: This stops the "Invalid JS syntax" error for your PNG files
  assetsInclude: ["**/*.PNG", "**/*.png", "**/*.jpg", "**/*.jpeg", "**/*.webp"],
  
  server: {
    port: 3000,
    host: true,
    allowedHosts: true,
  },
  preview: {
    port: 3000,
    host: true,
    allowedHosts: true,
  },
  resolve: {
    alias: {
      // Allows you to use "@" to refer to your "src" folder
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    css: true,
  },
});