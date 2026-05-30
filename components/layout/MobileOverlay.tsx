"use client";

import { useUIStore } from "@/hooks/useUIStore";

export function MobileOverlay() {
  const { isMobileSidebarOpen, setMobileSidebarOpen } = useUIStore();

  return (
    <div
      className={`mobile-overlay ${isMobileSidebarOpen ? "visible" : ""}`}
      onClick={() => setMobileSidebarOpen(false)}
    />
  );
}
