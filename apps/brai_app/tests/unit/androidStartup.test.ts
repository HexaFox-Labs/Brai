import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Android startup", () => {
  it("does not override the persisted Brai CMD mode on app launch", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "android/app/src/main/java/world/brightos/brai/MainActivity.java"),
      "utf8",
    );

    expect(source).not.toContain("setOnboardingVoiceOnly(");
  });

  it("clears stale WebView chunks before Capacitor loads an OTA bundle", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "android/app/src/main/java/world/brightos/brai/MainActivity.java"),
      "utf8",
    );
    const capacitorConfig = fs.readFileSync(path.join(process.cwd(), "capacitor.config.ts"), "utf8");
    const clearCache = source.indexOf("startupWebView.clearCache(true)");
    const loadBridge = source.indexOf("super.load()");

    expect(clearCache).toBeGreaterThan(0);
    expect(loadBridge).toBeGreaterThan(clearCache);
    expect(capacitorConfig).toContain('appendUserAgent: " BraiNative/1"');
  });

  it("does not expose the internal Brai CMD credential as user access", () => {
    const runtimeSource = [
      path.join(process.cwd(), "src"),
      path.join(process.cwd(), "android/app/src/main"),
    ].map(readSourceTree).join("\n");

    expect(runtimeSource).not.toContain("Получите доступ Brai CMD");
    expect(runtimeSource).not.toContain("Обновите доступ");
    expect(runtimeSource).not.toContain("подготовить доступ Brai CMD");
  });
});

function readSourceTree(root: string): string {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.name !== "node_modules" && entry.name !== "assets")
    .map((entry) => {
      const target = path.join(root, entry.name);
      if (entry.isDirectory()) return readSourceTree(target);
      return /\.(?:java|kt|ts|tsx|xml)$/.test(entry.name) ? fs.readFileSync(target, "utf8") : "";
    })
    .join("\n");
}
