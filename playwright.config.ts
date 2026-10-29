import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5173";

export default defineConfig({
    testDir: "./e2e",
    timeout: 60_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    reporter: [["list"], ["html", { open: "never" }]],
    use: {
        baseURL,
        locale: "en-US", // the tests read English labels
        trace: "retain-on-failure",
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
    },
});
