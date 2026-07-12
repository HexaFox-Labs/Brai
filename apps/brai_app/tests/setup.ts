import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { configure } from "@testing-library/dom";
import { vi } from "vitest";

configure({ asyncUtilTimeout: 3_000 });

globalThis.ResizeObserver ??= class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock("geist/font/sans", () => ({
  GeistSans: {
    variable: "__geistSans_mock",
  },
}));

vi.mock("geist/font/mono", () => ({
  GeistMono: {
    variable: "__geistMono_mock",
  },
}));
