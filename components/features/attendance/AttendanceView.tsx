"use client";

import { useUIStore } from "@/hooks/useUIStore";
import { useState } from "react";
import { markAttendance } from "@/app/actions/attendance";

interface AttendanceRecord {
  id: number;
  email: string | null;
  date: string | null;
  status: string;
}

interface User {
  name: string;
  email: string;
  role: string;
}

export function AttendanceView({
  role,
  permissions = "",
  currentUserEmail,
  users,
  attendance,
}: {
  role: string;
  permissions?: string;
  currentUserEmail: string;
  users: User[];
  attendance: AttendanceRecord[];
}) {
  const { addToast } = useUIStore();
  const [records, setRecords] = useState<AttendanceRecord[]>(attendance);
  const [internAttDate, setInternAttDate] = useState<Date>(new Date());
  const [leaveDate, setLeaveDate] = useState<string>(new Date().toISOString().split("T")[0]);

  const COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4"];

  const isUserAdmin = role === "admin";
  const isUserSuperAdmin = role === "super_admin";
  const isUserIntern = role === "intern";

  const hasPermission = (key: string) => {
    return isUserAdmin || permissions.split(",").map((p) => p.trim()).includes(key);
  };

  const canManageAttendance = isUserAdmin || hasPermission("manage_attendance");

  const todayISO = new Date().toISOString().split("T")[0];
  const todayStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const handleMark = async (email: string, status: string, date: string) => {
    const res = await markAttendance(email, status, date);
    if (res.success) {
      addToast(`${email.split("@")[0]} → ${status}`, "success");
      setRecords((prev) => {
        const existingIdx = prev.findIndex((r) => r.email === email && r.date === date);
        if (existingIdx > -1) {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], status };
          return updated;
        } else {
          return [...prev, { id: Math.random(), email, date, status }];
        }
      });
    } else {
      addToast(res.error || "Failed to update attendance", "error");
    }
  };

  const markMyAttendance = async () => {
    await handleMark(currentUserEmail, "Present", todayISO);
  };

  const markMyLeave = async () => {
    if (!leaveDate) {
      addToast("Choose a date for leave", "error");
      return;
    }
    if (leaveDate < todayISO) {
      addToast("Select today or a future date for leave", "error");
      return;
    }
    await handleMark(currentUserEmail, "Leave", leaveDate);
  };

  const exportAttendance = () => {
    try {
      const csv = ["Email,Date,Status", ...records.map((a) => `${a.email},${a.date},${a.status}`)].join("\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      a.download = "attendance.csv";
      a.click();
      addToast("Exported!", "success");
    } catch (e) {
      addToast("Export failed", "error");
    }
  };

  const roleLabel = (r: string) => {
    return ({ admin: "admin", super_admin: "super admin", intern: "intern" }[r] || r);
  };

  const roleBadge = (r: string) => {
    const cls = ({ admin: "badge-red", super_admin: "badge-purple", intern: "badge-blue" }[r] || "badge-gray");
    return <span className={`badge ${cls}`}>{roleLabel(r)}</span>;
  };

  const statusBadge = (s: string) => {
    const m: Record<string, string> = {
      Pending: "badge-amber",
      "In Progress": "badge-blue",
      Completed: "badge-green",
      Approved: "badge-green",
      Rejected: "badge-red",
      Present: "badge-green",
      Absent: "badge-red",
      Leave: "badge-purple",
    };
    return <span className={`badge ${m[s] || "badge-gray"}`}>{s}</span>;
  };

  if (!isUserIntern) {
    const members = users.filter((u) => u.role !== "admin" && u.role !== "super_admin");

    return (
      <>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px 16px", fontSize: "13px", color: "var(--text-muted)" }}>
            📅 {todayStr}
          </div>
          <button onClick={exportAttendance} className="btn-sm btn-outline">↓ Export CSV</button>
        </div>

        <div className="attend-grid">
          {members.map((u, i) => {
            const rec = records.find((a) => a.email === u.email && a.date === todayISO);
            const color = COLORS[i % COLORS.length];
            const status = rec ? rec.status : "Not Marked";

            return (
              <div key={u.email} className="attend-card">
                <div
                  className="attend-avatar"
                  style={{
                    backgroundColor: `${color}22`,
                    color: color,
                    border: `2px solid ${color}44`,
                  }}
                >
                  {u.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")}
                </div>
                <div className="attend-info flex flex-col gap-2">
                  <div className="font-bold text-[15px]">{u.name}</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {roleBadge(u.role)}
                    {statusBadge(status)}
                  </div>
                  {canManageAttendance && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <button
                        className="action-btn action-approve"
                        style={{ fontSize: "12px", padding: "5px 12px", borderRadius: "6px" }}
                        onClick={() => handleMark(u.email, "Present", todayISO)}
                      >
                        P
                      </button>
                      <button
                        className="action-btn action-reject"
                        style={{ fontSize: "12px", padding: "5px 12px", borderRadius: "6px" }}
                        onClick={() => handleMark(u.email, "Absent", todayISO)}
                      >
                        A
                      </button>
                      <button
                        className="action-btn action-edit"
                        style={{ fontSize: "12px", padding: "5px 12px", borderRadius: "6px" }}
                        onClick={() => handleMark(u.email, "Leave", todayISO)}
                      >
                        L
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {members.length === 0 && (
            <div className="text-jj-text-muted text-[13px]">No team members</div>
          )}
        </div>
      </>
    );
  }

  // Intern View - Interactive Attendance Calendar
  const todayRec = records.find((a) => a.email === currentUserEmail && a.date === todayISO);
  const todayStatus = todayRec ? todayRec.status : "Not Marked";

  const yr = internAttDate.getFullYear();
  const mo = internAttDate.getMonth();
  const firstDay = new Date(yr, mo, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  const monthName = internAttDate.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const monthPrefix = `${yr}-${String(mo + 1).padStart(2, "0")}`;
  const myRecords = records.filter((r) => r.email === currentUserEmail);
  const monthData = myRecords.filter((a) => a.date?.startsWith(monthPrefix));
  const mp = monthData.filter((a) => a.status === "Present").length;
  const ma = monthData.filter((a) => a.status === "Absent").length;
  const ml = monthData.filter((a) => a.status === "Leave").length;

  const attMap: Record<string, string> = {};
  myRecords.forEach((a) => {
    if (a.date) attMap[a.date] = a.status;
  });

  const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} className="cal-day empty"></div>);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${yr}-${String(mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isToday = iso === todayISO;
    const st = attMap[iso];

    const bgClass =
      st === "Present"
        ? { backgroundColor: "rgba(16,185,129,0.15)", borderColor: "var(--green)" }
        : st === "Absent"
        ? { backgroundColor: "rgba(239,68,68,0.12)", borderColor: "var(--red)" }
        : st === "Leave"
        ? { backgroundColor: "rgba(139,92,246,0.12)", borderColor: "var(--purple)" }
        : {};

    const dot =
      st === "Present" ? (
        <>
          <div className="mt-1 text-[18px] leading-none text-jj-green">✓</div>
          <div className="text-[10px] text-jj-green">Present</div>
        </>
      ) : st === "Absent" ? (
        <>
          <div className="mt-1 text-[18px] leading-none text-jj-red">✗</div>
          <div className="text-[10px] text-jj-red">Absent</div>
        </>
      ) : st === "Leave" ? (
        <>
          <div className="mt-1 text-[18px] leading-none text-jj-purple">🏖</div>
          <div className="text-[10px] text-jj-purple">Leave</div>
        </>
      ) : null;

    cells.push(
      <div
        key={`day-${d}`}
        className={`cal-day ${isToday ? "today" : ""}`}
        style={{
          ...bgClass,
          textAlign: "center",
          minHeight: "70px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "6px 4px",
        }}
      >
        <div
          className="cal-date"
          style={isToday ? { color: "var(--accent)", fontWeight: 700 } : {}}
        >
          {d}
        </div>
        {dot}
      </div>
    );
  }

  const todayColor =
    todayStatus === "Present"
      ? "var(--green)"
      : todayStatus === "Absent"
      ? "var(--red)"
      : todayStatus === "Leave"
      ? "var(--purple)"
      : "var(--text-muted)";

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px 16px", fontSize: "13px", color: "var(--text-muted)" }}>
            📅 Today:{" "}
            <strong style={{ color: todayColor }}>{todayStatus}</strong>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "20px", background: "rgba(16,185,129,0.1)", color: "var(--green)", border: "1px solid rgba(16,185,129,0.25)" }}>
              ✓ {mp} Present
            </span>
            <span style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "20px", background: "rgba(239,68,68,0.1)", color: "var(--red)", border: "1px solid rgba(239,68,68,0.25)" }}>
              ✗ {ma} Absent
            </span>
            <span style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "20px", background: "rgba(139,92,246,0.1)", color: "var(--purple)", border: "1px solid rgba(139,92,246,0.25)" }}>
              🏖 {ml} Leave
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {todayStatus === "Not Marked" ? (
            <button onClick={markMyAttendance} className="btn-sm btn-accent">✓ Mark Present Today</button>
          ) : (
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Already marked for today</span>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="date"
              value={leaveDate}
              onChange={(e) => setLeaveDate(e.target.value)}
              style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "8px 10px", color: "var(--text)", fontSize: "13px" }}
            />
            <button onClick={markMyLeave} className="btn-sm btn-outline">🏖 Request Leave</button>
          </div>
        </div>
      </div>

      <div className="chart-card">
        <div className="cal-controls">
          <div className="cal-month">{monthName}</div>
          <div className="cal-nav">
            <button
              onClick={() =>
                setInternAttDate(
                  new Date(internAttDate.getFullYear(), internAttDate.getMonth() - 1, 1)
                )
              }
            >
              ‹
            </button>
            <button onClick={() => setInternAttDate(new Date())}>Today</button>
            <button
              onClick={() =>
                setInternAttDate(
                  new Date(internAttDate.getFullYear(), internAttDate.getMonth() + 1, 1)
                )
              }
            >
              ›
            </button>
          </div>
        </div>
        <div className="cal-grid">
          {dayHeaders.map((dh) => (
            <div key={dh} className="cal-day-header">
              {dh}
            </div>
          ))}
          {cells}
        </div>
      </div>
    </>
  );
}
