"use client";

import { usePathname } from "next/navigation";

export function PageBody({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChatRoute = pathname === "/dashboard/chat";

  return <main className={`page-body ${isChatRoute ? "chat-mode" : ""}`}>{children}</main>;
}
