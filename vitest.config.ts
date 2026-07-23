import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    css: false,
    // Node 22+ ships a built-in `localStorage` global (Web Storage API) that
    // is present without a valid backing file unless `--localstorage-file`
    // is set. Vitest's jsdom environment only overrides globals that are
    // *not* already defined on `globalThis`, so that broken built-in stub
    // (`localStorage.getItem` throws) silently wins over jsdom's working
    // implementation. Disabling it lets jsdom provide `window.localStorage`
    // as expected. See ThemeProvider.tsx, which reads localStorage on mount.
    poolOptions: {
      forks: { execArgv: ["--no-experimental-webstorage"] },
      threads: { execArgv: ["--no-experimental-webstorage"] },
    },
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
