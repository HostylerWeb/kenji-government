"use client";

import { useEffect } from "react";

/** Clears boot-recovery reload flag once React has hydrated. */
export function BootReadyMarker() {
  useEffect(() => {
    try {
      sessionStorage.removeItem("gra_boot_reload");
    } catch {
      // ignore
    }
  }, []);

  return null;
}
