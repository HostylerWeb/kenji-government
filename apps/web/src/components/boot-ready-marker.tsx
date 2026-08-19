"use client";

import { useEffect } from "react";

/** Marks the document as hydrated so the boot recovery script stands down. */
export function BootReadyMarker() {
  useEffect(() => {
    document.documentElement.setAttribute("data-gra-booted", "1");
    try {
      sessionStorage.removeItem("gra_boot_reload");
    } catch {
      // ignore
    }
  }, []);

  return null;
}
