import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.test.{js,jsx}"],
    css: false,
    // Thread workers: forked workers fail to start on some Windows setups (timeout waiting for the worker).
    pool: "threads",
  },
});
