// vite.config.ts
import { defineConfig } from "file:///D:/projects/updated-zemen/frontend/node_modules/vitest/dist/config.js";
import react from "file:///D:/projects/updated-zemen/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///D:/projects/updated-zemen/frontend/node_modules/@tailwindcss/vite/dist/index.mjs";
import path from "path";
import checker from "file:///D:/projects/updated-zemen/frontend/node_modules/vite-plugin-checker/dist/main.js";
import dns from "node:dns";
var __vite_injected_original_dirname = "D:\\projects\\updated-zemen\\frontend";
dns.setDefaultResultOrder("verbatim");
var vite_config_default = defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Correctly calling the default export
    checker({
      typescript: true
    })
  ],
  // FIXED: This stops the "Invalid JS syntax" error for your PNG files
  assetsInclude: ["**/*.PNG", "**/*.png", "**/*.jpg", "**/*.jpeg", "**/*.webp"],
  server: {
    port: 3e3,
    host: true,
    allowedHosts: true,
    proxy: {
      "/api": "http://localhost:5000",
      "/uploads": "http://localhost:5000"
    }
  },
  preview: {
    port: 3e3,
    host: true,
    allowedHosts: true,
    proxy: {
      "/api": "http://localhost:5000",
      "/uploads": "http://localhost:5000"
    }
  },
  resolve: {
    alias: {
      // Allows you to use "@" to refer to your "src" folder
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    globals: true,
    css: true
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxwcm9qZWN0c1xcXFx1cGRhdGVkLXplbWVuXFxcXGZyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxwcm9qZWN0c1xcXFx1cGRhdGVkLXplbWVuXFxcXGZyb250ZW5kXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9wcm9qZWN0cy91cGRhdGVkLXplbWVuL2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVzdC9jb25maWdcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiO1xyXG5pbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSBcIkB0YWlsd2luZGNzcy92aXRlXCI7IC8vIEZJWEVEOiBObyBjdXJseSBicmFjZXMgaGVyZVxyXG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5pbXBvcnQgY2hlY2tlciBmcm9tIFwidml0ZS1wbHVnaW4tY2hlY2tlclwiO1xyXG5pbXBvcnQgZG5zIGZyb20gXCJub2RlOmRuc1wiO1xyXG5cclxuZG5zLnNldERlZmF1bHRSZXN1bHRPcmRlcihcInZlcmJhdGltXCIpO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbXHJcbiAgICByZWFjdCgpLFxyXG4gICAgdGFpbHdpbmRjc3MoKSwgLy8gQ29ycmVjdGx5IGNhbGxpbmcgdGhlIGRlZmF1bHQgZXhwb3J0XHJcbiAgICBjaGVja2VyKHtcclxuICAgICAgdHlwZXNjcmlwdDogdHJ1ZSxcclxuICAgIH0pLFxyXG4gIF0sXHJcbiAgXHJcbiAgLy8gRklYRUQ6IFRoaXMgc3RvcHMgdGhlIFwiSW52YWxpZCBKUyBzeW50YXhcIiBlcnJvciBmb3IgeW91ciBQTkcgZmlsZXNcclxuICBhc3NldHNJbmNsdWRlOiBbXCIqKi8qLlBOR1wiLCBcIioqLyoucG5nXCIsIFwiKiovKi5qcGdcIiwgXCIqKi8qLmpwZWdcIiwgXCIqKi8qLndlYnBcIl0sXHJcbiAgXHJcbiAgc2VydmVyOiB7XHJcbiAgICBwb3J0OiAzMDAwLFxyXG4gICAgaG9zdDogdHJ1ZSxcclxuICAgIGFsbG93ZWRIb3N0czogdHJ1ZSxcclxuICAgIHByb3h5OiB7XHJcbiAgICAgICcvYXBpJzogJ2h0dHA6Ly9sb2NhbGhvc3Q6NTAwMCcsXHJcbiAgICAgICcvdXBsb2Fkcyc6ICdodHRwOi8vbG9jYWxob3N0OjUwMDAnXHJcbiAgICB9XHJcbiAgfSxcclxuICBwcmV2aWV3OiB7XHJcbiAgICBwb3J0OiAzMDAwLFxyXG4gICAgaG9zdDogdHJ1ZSxcclxuICAgIGFsbG93ZWRIb3N0czogdHJ1ZSxcclxuICAgIHByb3h5OiB7XHJcbiAgICAgICcvYXBpJzogJ2h0dHA6Ly9sb2NhbGhvc3Q6NTAwMCcsXHJcbiAgICAgICcvdXBsb2Fkcyc6ICdodHRwOi8vbG9jYWxob3N0OjUwMDAnXHJcbiAgICB9XHJcbiAgfSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICAvLyBBbGxvd3MgeW91IHRvIHVzZSBcIkBcIiB0byByZWZlciB0byB5b3VyIFwic3JjXCIgZm9sZGVyXHJcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIHRlc3Q6IHtcclxuICAgIGVudmlyb25tZW50OiAnanNkb20nLFxyXG4gICAgc2V0dXBGaWxlczogJy4vc3JjL3Rlc3Qvc2V0dXAudHMnLFxyXG4gICAgZ2xvYmFsczogdHJ1ZSxcclxuICAgIGNzczogdHJ1ZSxcclxuICB9LFxyXG59KTsiXSwKICAibWFwcGluZ3MiOiAiO0FBQWdTLFNBQVMsb0JBQW9CO0FBQzdULE9BQU8sV0FBVztBQUNsQixPQUFPLGlCQUFpQjtBQUN4QixPQUFPLFVBQVU7QUFDakIsT0FBTyxhQUFhO0FBQ3BCLE9BQU8sU0FBUztBQUxoQixJQUFNLG1DQUFtQztBQU96QyxJQUFJLHNCQUFzQixVQUFVO0FBRXBDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQTtBQUFBLElBQ1osUUFBUTtBQUFBLE1BQ04sWUFBWTtBQUFBLElBQ2QsQ0FBQztBQUFBLEVBQ0g7QUFBQTtBQUFBLEVBR0EsZUFBZSxDQUFDLFlBQVksWUFBWSxZQUFZLGFBQWEsV0FBVztBQUFBLEVBRTVFLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLGNBQWM7QUFBQSxJQUNkLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxNQUNSLFlBQVk7QUFBQSxJQUNkO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sY0FBYztBQUFBLElBQ2QsT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLE1BQ1IsWUFBWTtBQUFBLElBQ2Q7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUE7QUFBQSxNQUVMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFBQSxFQUNBLE1BQU07QUFBQSxJQUNKLGFBQWE7QUFBQSxJQUNiLFlBQVk7QUFBQSxJQUNaLFNBQVM7QUFBQSxJQUNULEtBQUs7QUFBQSxFQUNQO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
