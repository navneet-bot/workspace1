"use client";

import { useState } from "react";
import { useUIStore } from "@/hooks/useUIStore";

interface WorkLog {
  id: number;
  email: string | null;
  name: string;
  loginTime: string;
  logoutTime: string;
  workAssigned: string;
  workDid: string;
  hoursWorked: string;
  issues: string;
  resolved: string;
  startedAt: string;
  completedAt: string;
  date: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export function WorkLogsView({ initialLogs, users }: { initialLogs: WorkLog[]; users: User[] }) {
  const { addToast } = useUIStore();
  const interns = users.filter((u) => u.role === "intern");
  const [activeEmail, setActiveEmail] = useState<string | null>(interns.length > 0 ? interns[0].email : null);

  const filteredLogs = activeEmail ? initialLogs.filter((l) => l.email === activeEmail) : initialLogs;
  const activeName = interns.find((u) => u.email === activeEmail)?.name || "All";

  const exportCSV = (email: string | null, name: string) => {
    const rows = email ? initialLogs.filter((l) => l.email === email) : initialLogs;
    if (!rows.length) {
      addToast("No logs to export", "info");
      return;
    }
    
    const header = "Date,Name,Email,Login Time,Logout Time,Work Assigned,Work Did,Hours Worked,Issues,Resolved,Started At,Completed At";
    const csvContent = [
      header,
      ...rows.map(l => [
        l.date || "",
        (l.name || "").replace(/,/g, " "),
        l.email || "",
        l.loginTime || "",
        l.logoutTime || "",
        (l.workAssigned || "").replace(/,/g, " "),
        (l.workDid || "").replace(/,/g, " "),
        l.hoursWorked || "",
        (l.issues || "").replace(/,/g, " "),
        (l.resolved || "").replace(/,/g, " "),
        l.startedAt || "",
        l.completedAt || ""
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", `worklogs_${name.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    addToast("Worklogs exported successfully", "success");
  };

  return (
    <div className="page-stack">
      {interns.length > 0 && (
        <div style={{ marginBottom: "16px", display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
          {interns.map((u) => (
            <button
              key={u.email}
              onClick={() => setActiveEmail(u.email)}
              style={{
                padding: "6px 16px",
                borderRadius: "20px",
                border: `2px solid ${activeEmail === u.email ? "var(--accent)" : "var(--border)"}`,
                background: activeEmail === u.email ? "var(--accent)" : "transparent",
                color: activeEmail === u.email ? "#000" : "var(--text-soft)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all .15s",
              }}
            >
              {u.name}
            </button>
          ))}
        </div>
      )}

      <div className="table-card">
        <div className="table-card-header">
          <h3>{activeName} — Work Logs</h3>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              {filteredLogs.length} entr{filteredLogs.length === 1 ? "y" : "ies"}
            </span>
            {activeEmail && (
              <button
                onClick={() => exportCSV(activeEmail, activeName)}
                className="btn-sm btn-outline"
              >
                ↓ Export {activeName}
              </button>
            )}
            <button
              onClick={() => exportCSV(null, "All")}
              className="btn-sm btn-outline"
            >
              ↓ Export All
            </button>
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Work Assigned</th>
                <th>Work Did</th>
                <th>Hours</th>
                <th>Issues</th>
                <th>Resolved</th>
                <th>Started At</th>
                <th>Completed At</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "28px", color: "var(--text-muted)" }}>
                    No logs for this intern yet
                  </td>
                </tr>
              ) : (
                filteredLogs.map((l) => (
                  <tr key={l.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{l.date || "—"}</td>
                    <td style={{ maxWidth: "200px" }}>{l.workAssigned || "—"}</td>
                    <td style={{ maxWidth: "200px" }}>{l.workDid || "—"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{l.hoursWorked || "—"}</td>
                    <td style={{ maxWidth: "160px" }}>{l.issues || "—"}</td>
                    <td style={{ maxWidth: "160px" }}>{l.resolved || "—"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{l.startedAt || "—"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{l.completedAt || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
