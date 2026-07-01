import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { vi } from "vitest";

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
