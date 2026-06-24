"use client";

import { useEffect, useState } from "react";
import { platformName } from "@/shared/platform/platform";
import type { ThemeMode } from "../appModel";

/**
 * Persists the Bright OS light/dark theme and platform marker on the document.
 */
export function useBrightOsTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    const saved = window.localStorage.getItem("bright_os_theme_mode");
    return saved === "dark" || saved === "light" ? saved : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("bright_os_theme_mode", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.platform = platformName();
    return () => {
      delete document.documentElement.dataset.platform;
    };
  }, []);

  return { setTheme, theme };
}
