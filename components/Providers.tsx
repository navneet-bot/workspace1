"use client";

import { SessionProvider } from "next-auth/react";
import { TaskModal } from "@/components/modals/TaskModal";
import { WorkLogLogoutModal } from "@/components/modals/WorkLogLogoutModal";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <TaskModal />
      <WorkLogLogoutModal />
    </SessionProvider>
  );
}

