import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3201",
    url: "http://127.0.0.1:3201",
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
  },
  use: {
    baseURL: "http://127.0.0.1:3201",
    browserName: "chromium",
    launchOptions: {
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
      env: {
        ...process.env,
        HOME: "/srv/projects/bright-os",
        XDG_CACHE_HOME: "/srv/projects/bright-os/.cache",
        XDG_CONFIG_HOME: "/srv/projects/bright-os/.config",
      },
    },
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "desktop",
      use: { viewport: { width: 1280, height: 820 } },
    },
  ],
});
