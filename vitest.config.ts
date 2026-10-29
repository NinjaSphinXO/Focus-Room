import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Standalone on purpose: it does not depend on your vite.config.ts plugins.
export default defineConfig({
    resolve: {
        alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    test: {
        environment: "jsdom",
        setupFiles: ["./src/test/setup.ts"],
        include: ["src/**/*.test.{ts,tsx}"],
        exclude: ["e2e/**", "node_modules/**"],
        css: false,
        env: {
            // lib/supabaseClient throws without these. Tests mock the api layer anyway.
            VITE_SUPABASE_URL: "http://localhost:54321",
            VITE_SUPABASE_PUBLISHABLE_KEY: "test-key",
        },
    },
});
