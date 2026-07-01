import { describe, expect, it } from "vitest";
import { resolveBraiIconAssets } from "@/shared/config/appIcons";

describe("Brai app icons", () => {
  it("uses production icons for production and unknown environments", () => {
    expect(resolveBraiIconAssets("prod")).toMatchObject({
      favicon: "/favicon.png",
      icon192: "/icons/Icon-192.png",
    });
    expect(resolveBraiIconAssets("unknown").favicon).toBe("/favicon.png");
  });

  it("uses environment-specific icons for dev and preview builds", () => {
    expect(resolveBraiIconAssets("dev").favicon).toBe("/icons/dev/favicon.png");
    expect(resolveBraiIconAssets("preview-b").icon512).toBe("/icons/preview-b/Icon-512.png");
  });
});
