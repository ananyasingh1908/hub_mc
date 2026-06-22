import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: true,
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    server: {
      port: 8080,
      strictPort: true,
    },
  },
});