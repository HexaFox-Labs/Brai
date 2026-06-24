"use client";

import * as React from "react";

export function useOnWindowResize(handler: () => void) {
  React.useEffect(() => {
    handler();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [handler]);
}
