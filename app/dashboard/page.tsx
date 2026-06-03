import prisma from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { DashboardCharts } from "@/components/features/dashboard/DashboardCharts";
import { DashboardHeaderActions } from "@/components/features/dashboard/DashboardHeaderActions";
import { BreakCountdownWidget } from "@/components/features/breaks/BreakCountdownWidget";
import Link from "next/link";
import { getInternProductivityDetails } from "@/app/actions/productivity";
import { CheckCircle, Briefcase, Calendar, BookOpen, Star, ShieldAlert } from "lucide-react";

const COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4"];

function prioritySpan(priority: string) {
  const cls =
    priority === "High"
      ? "priority-high"
      : priority === "Medium"
        ? "priority-medium"
        : "priority-low";
  return <span className={cls}>{priority}</span>;
}

function statusBadge(status: string) {
  const cls: Record<string, string> = {
    Pending: "badge-amber",
    "In Progress": "badge-blue",
    Completed: "badge-green",
    Approved: "badge-green",
    Rejected: "badge-red",
    Present: "badge-green",
    Absent: "badge-red",
    Leave: "badge-purple",
  };
  return <span className={`badge ${cls[status] || "badge-gray"}`}>{status}</span>;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function roleLabel(role: string) {
  return { admin: "admin", super_admin: "super admin", tutor: "tutor", intern: "intern" }[role as "admin"] || role;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  const userRole = (session?.user as { role?: string })?.role || "intern";
  const currentUserName = session?.user?.name || "Intern";
  const permissions = (session?.user as { permissions?: string })?.permissions || "";
  const hasSuperAdminAccess = userRole === "super_admin" && permissions.trim() !== "";
  const showInternDashboard = userRole === "intern" || userRole === "tutor" || (userRole === "super_admin" && !hasSuperAdminAccess);

  if (showInternDashboard && userEmail) {
    const [tasks, attendance, groups, notifications, prodDetails] = await Promise.all([
      prisma.task.findMany({
        where: { assignedTo: userEmail },
        orderBy: { createdAt: "desc" },
      }).catch(() => []),
      prisma.attendance.findMany({
        where: { email: userEmail },
      }).catch(() => []),
      prisma.group.findMany({
        orderBy: { createdAt: "desc" },
      }).catch(() => []),
      prisma.notification.findMany({
        where: {
          OR: [{ targetEmail: "ALL" }, { targetEmail: userEmail }],
        },
        orderBy: { createdAt: "desc" },
      }).catch(() => []),
      getInternProductivityDetails(userEmail),
    ]);

    // Fetch active break directly
    const activeBreakRes = await prisma.breakRequest.findFirst({
      where: {
        userEmail,
        status: "approved",
      },
    });

    let activeBreak = null;
    if (activeBreakRes && activeBreakRes.approvedAt) {
      const approvedTime = new Date(activeBreakRes.approvedAt);
      const endTime = new Date(approvedTime.getTime() + activeBreakRes.duration * 60 * 1000);
      const now = new Date();
      const remainingSeconds = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));
      if (remainingSeconds > 0) {
        activeBreak = {
          duration: activeBreakRes.duration,
          reason: activeBreakRes.reason,
          remainingSeconds,
        };
      }
    }

    const pending = tasks.filter((task) => task.status === "Pending").length;
    const inProgress = tasks.filter((task) => task.status === "In Progress").length;
    const completed = tasks.filter((task) => task.status === "Completed").length;
    const total = tasks.length;

    const present = attendance.filter((row) => row.status === "Present").length;
    const absent = attendance.filter((row) => row.status === "Absent").length;
    const leave = attendance.filter((row) => row.status === "Leave").length;
    const attendanceTotal = attendance.length;
    const attendanceScore = attendanceTotal > 0 ? Math.round((present / attendanceTotal) * 100) : 0;
    const taskScore = total > 0 ? Math.round((completed / total) * 100) : 0;
    const overallScore = Math.round(taskScore * 0.6 + attendanceScore * 0.4);

    const myGroups = groups.filter((group) => {
      try {
        return JSON.parse(group.members || "[]").includes(userEmail);
      } catch {
        return false;
      }
    });

    const todayISO = new Date().toISOString().split("T")[0];
    const todayRecord = attendance.find((row) => row.date === todayISO);
    const todayStatus = todayRecord?.status || "Not Marked";
    const unread = notifications.filter((item) => {
      if (item.read) return false;
      try {
        return !JSON.parse(item.seenBy || "[]").includes(userEmail);
      } catch {
        return true;
      }
    }).length;

    return (
      <>
        {activeBreak && (
          <BreakCountdownWidget
            initialRemainingSeconds={activeBreak.remainingSeconds}
            duration={activeBreak.duration}
            reason={activeBreak.reason}
          />
        )}
        <div
          style={{
            background:
              "linear-gradient(135deg,rgba(245,158,11,0.12),rgba(59,130,246,0.08))",
            border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: "14px",
            padding: "20px 24px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 700,
                fontFamily: "Syne, sans-serif",
              }}
            >
              Welcome back, {currentUserName} 👋
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                marginTop: "4px",
              }}
            >
              Today is{" "}
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                textAlign: "center",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "10px 18px",
              }}
            >
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  fontFamily: "Syne, sans-serif",
                  color:
                    todayStatus === "Present"
                      ? "var(--green)"
                      : todayStatus === "Absent"
                        ? "var(--red)"
                        : todayStatus === "Leave"
                          ? "var(--purple)"
                          : "var(--text-muted)",
                }}
              >
                {todayStatus === "Present"
                  ? "✓"
                  : todayStatus === "Absent"
                    ? "✗"
                    : todayStatus === "Leave"
                      ? "🏖"
                      : "—"}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                Today
              </div>
            </div>
            <DashboardHeaderActions
              todayStatus={todayStatus}
              userEmail={userEmail}
              userRole={userRole}
            />
          </div>
        </div>

        <div className="stats-grid" style={{ marginBottom: "20px" }}>
          <Link href="/dashboard/mytasks" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="stat-card amber" style={{ cursor: "pointer" }}>
              <div className="stat-icon amber">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
              </div>
              <div className="stat-value">{pending}</div>
              <div className="stat-label">Tasks Pending</div>
            </div>
          </Link>
          <Link href="/dashboard/mytasks" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="stat-card blue" style={{ cursor: "pointer" }}>
              <div className="stat-icon blue">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
              </div>
              <div className="stat-value">{inProgress}</div>
              <div className="stat-label">In Progress</div>
            </div>
          </Link>
          <Link href="/dashboard/mytasks" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="stat-card green" style={{ cursor: "pointer" }}>
              <div className="stat-icon green">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
              </div>
              <div className="stat-value">{completed}</div>
              <div className="stat-label">Completed</div>
            </div>
          </Link>
          <Link href="/dashboard/notifications" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="stat-card purple" style={{ cursor: "pointer" }}>
              <div className="stat-icon purple">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
              </div>
              <div className="stat-value">{unread}</div>
              <div className="stat-label">Unread Alerts</div>
            </div>
          </Link>
        </div>

        <div className="charts-row" style={{ marginBottom: "20px" }}>
          <div className="chart-card">
            <h3 style={{ marginBottom: "16px", fontFamily: "var(--font-syne)" }}>📊 My Productivity Index</h3>
            {prodDetails ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Overall Score Circle/Gauge */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px", background: "var(--surface2)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                  <div style={{ position: "relative", width: "70px", height: "70px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                      <circle cx="35" cy="35" r="30" stroke="rgba(150, 150, 150, 0.1)" strokeWidth="5" fill="transparent" />
                      <circle 
                        cx="35" 
                        cy="35" 
                        r="30" 
                        stroke={prodDetails.overall >= 80 ? "var(--green)" : prodDetails.overall >= 60 ? "var(--accent)" : "var(--red)"} 
                        strokeWidth="5" 
                        fill="transparent" 
                        strokeDasharray={2 * Math.PI * 30}
                        strokeDashoffset={2 * Math.PI * 30 * (1 - prodDetails.overall / 100)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 800 }}>
                      {prodDetails.overall}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: 700, fontFamily: "var(--font-syne)" }}>
                      Grade {prodDetails.overall >= 90 ? "A+" : prodDetails.overall >= 80 ? "A" : prodDetails.overall >= 70 ? "B" : prodDetails.overall >= 60 ? "C" : prodDetails.overall >= 50 ? "D" : "F"}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                      Multi-Factor Productivity Score
                    </div>
                  </div>
                </div>

                {/* Score Breakdown summary */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {/* Tasks */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><CheckCircle size={12} style={{ color: "var(--blue)" }} /> Tasks (30%)</span>
                      <strong style={{ color: "var(--blue)" }}>{prodDetails.tasks.score}%</strong>
                    </div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${prodDetails.tasks.score}%`, background: "var(--blue)" }} /></div>
                  </div>

                  {/* Projects */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Briefcase size={12} style={{ color: "var(--accent)" }} /> Projects (20%)</span>
                      <strong style={{ color: "var(--accent)" }}>{prodDetails.projects.score}%</strong>
                    </div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${prodDetails.projects.score}%`, background: "var(--accent)" }} /></div>
                  </div>

                  {/* Attendance */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Calendar size={12} style={{ color: "var(--green)" }} /> Attendance (20%)</span>
                      <strong style={{ color: "var(--green)" }}>{prodDetails.attendance.score}%</strong>
                    </div>
                    <div className="progress-bar"><div className="progress-fill green" style={{ width: `${prodDetails.attendance.score}%` }} /></div>
                  </div>

                  {/* Work Logs */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><BookOpen size={12} style={{ color: "var(--purple)" }} /> Work Logs (10%)</span>
                      <strong style={{ color: "var(--purple)" }}>{prodDetails.workLogs.score}%</strong>
                    </div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${prodDetails.workLogs.score}%`, background: "var(--purple)" }} /></div>
                  </div>
                </div>

                {/* Feedback Comment if exists */}
                {prodDetails.feedback.comment && (
                  <div style={{ background: "rgba(139,92,246,0.05)", border: "1px dashed rgba(139,92,246,0.25)", padding: "10px 12px", borderRadius: "8px", fontSize: "11.5px", color: "var(--text-soft)" }}>
                    <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: "4px", marginBottom: "3px", color: "var(--purple)" }}>
                      <Star size={12} fill="currentColor" /> Manager Review
                    </div>
                    &ldquo;{prodDetails.feedback.comment}&rdquo;
                  </div>
                )}

                {/* Insights summary */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderTop: "1px solid var(--border)", paddingTop: "12px", marginTop: "4px" }}>
                  <div style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <ShieldAlert size={12} style={{ color: "var(--blue)" }} /> Personal Insights
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "100px", overflowY: "auto" }}>
                    {(() => {
                      const ins: string[] = [];
                      const b = prodDetails;
                      if (b.tasks.overdue > 0) ins.push(`⚠️ You have ${b.tasks.overdue} overdue task(s).`);
                      if (b.attendance.lateCount > 2) ins.push(`⏰ Late check-ins detected (${b.attendance.lateCount} times).`);
                      if (b.breaks.excessiveFlags.length > 0) b.breaks.excessiveFlags.forEach((f: string) => ins.push(`☕ Wellness Alert: ${f}`));
                      if (b.workLogs.count > 0 && b.workLogs.avgWordCount < 8) ins.push(`📝 Keep work logs detailed (avg ${Math.round(b.workLogs.avgWordCount)} words).`);
                      if (b.tasks.completed > 0 && b.tasks.avgCompletionHours > 0 && b.tasks.avgCompletionHours < 24) ins.push(`⚡ Fast learner: tasks completed in under 24 hrs.`);
                      if (ins.length === 0) ins.push(`✅ Performing steadily across all metrics.`);
                      return ins.map((item, idx) => (
                        <div key={idx} style={{ fontSize: "11px", padding: "6px 8px", borderRadius: "6px", background: "var(--surface3)", border: "1px solid var(--border)", color: "var(--text-soft)" }}>
                          {item}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>Calculating your productivity index...</div>
            )}
          </div>
          <div className="chart-card">
            <h3 style={{ marginBottom: "16px" }}>👥 My Groups</h3>
            {myGroups.length ? (
              myGroups.map((group, index) => {
                let members: string[] = [];
                try {
                  members = JSON.parse(group.members || "[]");
                } catch {}
                return (
                  <div
                    key={group.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 0",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "9px",
                        background: `${COLORS[index % COLORS.length]}18`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        flexShrink: 0,
                      }}
                    >
                      {group.icon || "📁"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "13.5px",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {group.name}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                        {members.length} member{members.length !== 1 ? "s" : ""} · {group.description || ""}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)", fontSize: "13px" }}>
                You haven&apos;t been added to any group yet
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [users, projects, attendance, tasks, todayBreaks] = await Promise.all([
    prisma.user.findMany({ where: { role: { not: "admin" } } }).catch(() => []),
    prisma.project.findMany().catch(() => []),
    prisma.attendance.findMany({
      where: { date: new Date().toISOString().split("T")[0], status: "Present" },
    }).catch(() => []),
    prisma.task.findMany({ orderBy: { createdAt: "desc" } }).catch(() => []),
    prisma.breakRequest.findMany({
      where: { createdAt: { gte: todayStart } }
    }).catch(() => [])
  ]);

  const totalInterns = users.filter((user) => user.role === "intern").length;
  const tasksCompleted = tasks.filter((task) => task.status === "Completed").length;
  const tasksPending = tasks.filter((task) => task.status === "Pending").length;
  const tasksInProgress = tasks.filter((task) => task.status === "In Progress").length;

  const breaksPending = todayBreaks.filter(b => b.status === "pending").length;
  const breaksApproved = todayBreaks.filter(b => b.status === "approved" || b.status === "expired").length;
  const breaksRejected = todayBreaks.filter(b => b.status === "rejected").length;

  return (
    <>
      <div className="stats-grid">
        <Link href="/dashboard/users" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="stat-card amber" style={{ cursor: "pointer" }}>
            <div className="stat-icon amber">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
            </div>
            <div className="stat-value">{totalInterns}</div>
            <div className="stat-label">Active Interns</div>
          </div>
        </Link>
        <Link href="/dashboard/tasks" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="stat-card green" style={{ cursor: "pointer" }}>
            <div className="stat-icon green">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
            </div>
            <div className="stat-value">{tasksCompleted}</div>
            <div className="stat-label">Tasks Completed</div>
          </div>
        </Link>
        <Link href="/dashboard/projects" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="stat-card blue" style={{ cursor: "pointer" }}>
            <div className="stat-icon blue">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
            </div>
            <div className="stat-value">{projects.length}</div>
            <div className="stat-label">Active Projects</div>
          </div>
        </Link>
        <Link href="/dashboard/attendance" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="stat-card purple" style={{ cursor: "pointer" }}>
            <div className="stat-icon purple">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            </div>
            <div className="stat-value">{attendance.length}</div>
            <div className="stat-label">Present Today</div>
          </div>
        </Link>
      </div>

      <DashboardCharts pending={tasksPending} inProgress={tasksInProgress} completed={tasksCompleted} />

      <div className="table-card" style={{ marginBottom: "20px", padding: "20px" }}>
        <h3 style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          ☕ Today&apos;s Break Requests
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "16px" }}>
          <div style={{ background: "rgba(245,158,11,0.08)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(245,158,11,0.2)", textAlign: "center" }}>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--accent)" }}>{breaksPending}</div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px", fontWeight: 600 }}>Pending</div>
          </div>
          <div style={{ background: "rgba(16,185,129,0.08)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(16,185,129,0.2)", textAlign: "center" }}>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--green)" }}>{breaksApproved}</div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px", fontWeight: 600 }}>Approved / Active</div>
          </div>
          <div style={{ background: "rgba(239,68,68,0.08)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(239,68,68,0.2)", textAlign: "center" }}>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--red)" }}>{breaksRejected}</div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px", fontWeight: 600 }}>Rejected</div>
          </div>
        </div>
      </div>

      <div className="table-card">
        <div className="table-card-header">
          <h3>Recent Tasks</h3>
          <button className="btn-sm btn-accent">+ New Task</button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Assigned To</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Deadline</th>
              </tr>
            </thead>
            <tbody>
              {tasks.slice(0, 5).length ? (
                tasks.slice(0, 5).map((task) => {
                  const assignee = users.find((user) => user.email === task.assignedTo);
                  return (
                    <tr key={task.id}>
                      <td>
                        <strong>{task.title}</strong>
                        <br />
                        <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                          {task.project || ""}
                        </span>
                      </td>
                      <td>{assignee?.name || task.assignedTo || "—"}</td>
                      <td>{prioritySpan(task.priority)}</td>
                      <td>{statusBadge(task.status)}</td>
                      <td>{task.deadline || "TBD"}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>
                    No tasks yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
