"use client";

import EvilEye from "@/shared/ui/EvilEye/EvilEye";

export function EvilEyeSection() {
  return (
    <section
      className="evil-eye-section relative h-full min-h-0 overflow-hidden rounded-lg bg-background"
      aria-label="Evil Eye"
      data-nav-swipe-exclusion
    >
      <EvilEye />
    </section>
  );
}
