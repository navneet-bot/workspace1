"use client";

import { useUIStore } from "@/hooks/useUIStore";
import { signOut } from "next-auth/react";
import { markAttendance } from "@/app/actions/attendance";

interface DashboardHeaderActionsProps {
  todayStatus: string;
  userEmail: string;
  userRole: string;
}

export function DashboardHeaderActions({
  todayStatus,
  userEmail,
  userRole,
}: DashboardHeaderActionsProps) {
  const { setWorkLogModalOpen, addToast } = useUIStore();

  const handleLogout = () => {
    if (userRole === "intern") {
      const alreadyDone = localStorage.getItem("jj_worklog_done");
      if (alreadyDone === "1") {
        localStorage.removeItem("jj_login_time");
        localStorage.removeItem("jj_worklog_done");
        signOut({ callbackUrl: "/login" });
      } else {
        setWorkLogModalOpen(true);
      }
    } else {
      signOut({ callbackUrl: "/login" });
    }
  };

  const handleMarkPresent = async () => {
    const todayISO = new Date().toISOString().split("T")[0];
    try {
      const res = await markAttendance(userEmail, "Present", todayISO);
      if (res.success) {
        addToast("Marked present successfully", "success");
      } else {
        addToast(res.error || "Failed to mark attendance", "error");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to mark attendance";
      addToast(msg, "error");
    }
  };

  return (
    <>
      {todayStatus === "Not Marked" ? (
        <button className="btn-sm btn-accent" onClick={handleMarkPresent}>
          ✓ Mark Present
        </button>
      ) : null}
      <button
        onClick={handleLogout}
        style={{
          background: "rgba(239,68,68,0.15)",
          color: "#ef4444",
          border: "1px solid rgba(239,68,68,0.35)",
          borderRadius: "9px",
          padding: "8px 16px",
          fontSize: "13px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        🚪 Logout
      </button>
    </>
  );
}
