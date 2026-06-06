"use client";

import { useUIStore } from "@/hooks/useUIStore";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import { submitWorkLog } from "@/app/actions/worklogs";

export function WorkLogLogoutModal() {
  const { isWorkLogModalOpen, setWorkLogModalOpen, addToast } = useUIStore();
  const { data: session } = useSession();

  const [workAssigned, setWorkAssigned] = useState("");
  const [workDid, setWorkDid] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [completedAt, setCompletedAt] = useState("");
  const [hoursWorked, setHoursWorked] = useState("");
  const [issues, setIssues] = useState("");
  const [resolved, setResolved] = useState("");
  const [loading, setLoading] = useState(false);

  // Set default times on mount/open
  useEffect(() => {
    if (isWorkLogModalOpen) {
      const loginTime = localStorage.getItem("jj_login_time");
      let loginStr = "";
      if (loginTime) {
        try {
          loginStr = new Date(loginTime).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
          });
        } catch {}
      }
      
      const nowStr = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });

      setStartedAt(loginStr || "09:00");
      setCompletedAt(nowStr);
    }
  }, [isWorkLogModalOpen]);

  useEffect(() => {
    if (startedAt && completedAt) {
      const [startHour, startMin] = startedAt.split(':').map(Number);
      const [endHour, endMin] = completedAt.split(':').map(Number);
      
      let startInMinutes = startHour * 60 + (startMin || 0);
      let endInMinutes = endHour * 60 + (endMin || 0);
      
      if (endInMinutes < startInMinutes) {
        endInMinutes += 24 * 60;
      }
      
      const diffInHours = Math.max(0, (endInMinutes - startInMinutes) / 60);
      setHoursWorked(diffInHours.toFixed(1).replace(/\.0$/, ''));
    }
  }, [startedAt, completedAt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!workAssigned.trim()) return addToast("Work Assigned is required", "error");
    if (!workDid.trim()) return addToast("Work Did is required", "error");
    if (!startedAt) return addToast("Work Started At is required", "error");
    if (!completedAt) return addToast("Completed At is required", "error");
    if (!hoursWorked.trim()) return addToast("Hours Worked is required", "error");
    if (!issues.trim()) return addToast("Issues Faced is required", "error");
    if (!resolved.trim()) return addToast("Resolved Issues is required", "error");

    setLoading(true);
    const result = await submitWorkLog({
      email: session?.user?.email || "",
      name: session?.user?.name || "Intern",
      loginTime: localStorage.getItem("jj_login_time") || new Date().toISOString(),
      logoutTime: new Date().toISOString(),
      workAssigned,
      workDid,
      hoursWorked,
      issues,
      resolved,
      startedAt,
      completedAt
    });

    setLoading(false);
    if (result.success) {
      // Mark as done for today and log out
      localStorage.setItem("jj_worklog_done", "1");
      setWorkLogModalOpen(false);
      
      // Clear local storage values
      localStorage.removeItem("jj_login_time");
      signOut({ callbackUrl: "/login" });
    } else {
      addToast(result.error || "Failed to submit work log", "error");
    }
  };

  return (
    <AnimatePresence>
      {isWorkLogModalOpen && (
        <div className="modal-shell">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="modal modal-scrollable w-full max-w-[500px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div style={{ fontSize: "16px", fontWeight: 700, fontFamily: "var(--font-syne), sans-serif" }}>
                📋 Work Log — End of Day
              </div>
              <button
                type="button"
                onClick={() => setWorkLogModalOpen(false)}
                className="modal-close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-body">
                <div className="field !m-0">
                  <label>Work Assigned</label>
                  <textarea
                    value={workAssigned}
                    onChange={(e) => setWorkAssigned(e.target.value)}
                    placeholder="What work was assigned to you today?"
                    rows={2}
                    style={{ resize: "vertical", borderRadius: "9px" }}
                  />
                </div>

                <div className="field !m-0">
                  <label>Work Did</label>
                  <textarea
                    value={workDid}
                    onChange={(e) => setWorkDid(e.target.value)}
                    placeholder="What did you actually complete?"
                    rows={2}
                    style={{ resize: "vertical", borderRadius: "9px" }}
                  />
                </div>

                <div className="form-row">
                  <div className="field !m-0">
                    <label>Work Started At</label>
                    <input
                      type="time"
                      value={startedAt}
                      onChange={(e) => setStartedAt(e.target.value)}
                      style={{ borderRadius: "9px" }}
                    />
                  </div>
                  <div className="field !m-0">
                    <label>Completed At</label>
                    <input
                      type="time"
                      value={completedAt}
                      onChange={(e) => setCompletedAt(e.target.value)}
                      style={{ borderRadius: "9px" }}
                    />
                  </div>
                </div>

                <div className="field !m-0">
                  <label>No. of Hours Worked</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={hoursWorked}
                    onChange={(e) => setHoursWorked(e.target.value)}
                    placeholder="e.g. 8"
                    style={{ borderRadius: "9px" }}
                  />
                </div>

                <div className="field !m-0">
                  <label>Issues Faced</label>
                  <textarea
                    value={issues}
                    onChange={(e) => setIssues(e.target.value)}
                    placeholder="Any blockers or problems?"
                    rows={2}
                    style={{ resize: "vertical", borderRadius: "9px" }}
                  />
                </div>

                <div className="field !m-0">
                  <label>Resolved Issues</label>
                  <textarea
                    value={resolved}
                    onChange={(e) => setResolved(e.target.value)}
                    placeholder="Issues you managed to resolve?"
                    rows={2}
                    style={{ resize: "vertical", borderRadius: "9px" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "16px", marginTop: "16px" }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    background: "#ef4444",
                    color: "#fff",
                    border: "none",
                    borderRadius: "10px",
                    padding: "11px",
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                  className="transition-all hover:bg-[#df3c3c] active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {loading ? "Submitting..." : "Submit & Logout"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
