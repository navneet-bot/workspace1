"use client";

import { useUIStore } from "@/hooks/useUIStore";
import { Download, TrendingUp, CheckCircle, Calendar, Trophy } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export interface ProductivityStat {
  name: string;
  email: string;
  role: string;
  tasks_total: number;
  tasks_done: number;
  tasks_in_progress: number;
  tasks_pending: number;
  task_score: number;
  present: number;
  absent: number;
  leave: number;
  att_score: number;
  reports_submitted: number;
  reports_reviewed: number;
  overall_score: number;
}

const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#f97316"];

export function ProductivityView({ stats }: { stats: ProductivityStat[] }) {
  const { addToast } = useUIStore();

  if (!stats.length) {
    return (
      <div className="surface-panel flex flex-col items-center justify-center p-12 text-center">
        <div className="mb-3 text-[32px]">📊</div>
        <div className="text-[14px] text-jj-text-muted">
          No intern data yet. Assign tasks and mark attendance to see scores.
        </div>
      </div>
    );
  }

  const avgScore = Math.round(stats.reduce((s, i) => s + i.overall_score, 0) / stats.length);
  const totalDone = stats.reduce((s, i) => s + i.tasks_done, 0);
  const totalPres = stats.reduce((s, i) => s + i.present, 0);
  const top = stats[0];

  const getGrade = (s: number) => {
    if (s >= 90) return "A+";
    if (s >= 80) return "A";
    if (s >= 70) return "B";
    if (s >= 60) return "C";
    if (s >= 50) return "D";
    return "F";
  };

  const exportProductivity = () => {
    const header = "Rank,Name,Email,Role,Tasks Total,Tasks Done,In Progress,Pending,Task Score,Present,Absent,Leave,Att Score,Reports Submitted,Reports Reviewed,Overall Score,Grade";
    const rows = stats.map((s, i) =>
      `${i + 1},"${s.name}",${s.email},${s.role},${s.tasks_total},${s.tasks_done},${s.tasks_in_progress},${s.tasks_pending},${s.task_score}%,${s.present},${s.absent},${s.leave},${s.att_score}%,${s.reports_submitted},${s.reports_reviewed},${s.overall_score}%,${getGrade(s.overall_score)}`
    );
    const csv = [header, ...rows].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", "productivity_report.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    addToast(`Exported ${stats.length} interns!`, "success");
  };

  const chartNames = stats.map((s) => s.name.split(" ")[0]);

  const scoreData = {
    labels: chartNames,
    datasets: [
      {
        label: "Overall %",
        data: stats.map((s) => s.overall_score),
        backgroundColor: stats.map((s) =>
          s.overall_score >= 80
            ? "rgba(16,185,129,0.8)"
            : s.overall_score >= 60
            ? "rgba(245,158,11,0.8)"
            : "rgba(239,68,68,0.8)"
        ),
        borderRadius: 8,
        barThickness: 32,
      },
    ],
  };

  const taskData = {
    labels: chartNames,
    datasets: [
      {
        label: "Completed",
        data: stats.map((s) => s.tasks_done),
        backgroundColor: "rgba(16,185,129,0.8)",
        borderRadius: 4,
        barThickness: 14,
      },
      {
        label: "In Progress",
        data: stats.map((s) => s.tasks_in_progress),
        backgroundColor: "rgba(59,130,246,0.7)",
        borderRadius: 4,
        barThickness: 14,
      },
      {
        label: "Pending",
        data: stats.map((s) => s.tasks_pending),
        backgroundColor: "rgba(245,158,11,0.5)",
        borderRadius: 4,
        barThickness: 14,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(150, 150, 150, 0.1)" },
        ticks: { color: "#8a8f98" },
      },
      x: {
        grid: { display: false },
        ticks: { color: "#8a8f98" },
      },
    },
    plugins: {
      legend: { labels: { color: "#8a8f98", font: { size: 12 } } },
    },
  };

  return (
    <div className="page-stack !h-auto">
      <div className="stats-grid">
        <div className="stat-card green">
          <div className="stat-icon green">
            <TrendingUp size={24} />
          </div>
          <div className="stat-value">{avgScore}%</div>
          <div className="stat-label">Avg Team Score</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon amber">
            <CheckCircle size={24} />
          </div>
          <div className="stat-value">{totalDone}</div>
          <div className="stat-label">Tasks Completed</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon blue">
            <Calendar size={24} />
          </div>
          <div className="stat-value">{totalPres}</div>
          <div className="stat-label">Total Present Days</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon purple">
            <Trophy size={24} />
          </div>
          <div className="stat-value text-[22px]">{top ? top.name.split(" ")[0] : "—"}</div>
          <div className="stat-label">Top Performer {top ? `(${top.overall_score}%)` : ""}</div>
        </div>
      </div>

      <div className="charts-row">
        <div className="chart-card">
          <h3>Overall Score per Intern</h3>
          <div className="h-[250px] w-full">
            <Bar data={scoreData} options={chartOptions} />
          </div>
        </div>
        <div className="chart-card">
          <h3>Tasks Breakdown</h3>
          <div className="h-[250px] w-full">
            <Bar data={taskData} options={chartOptions} />
          </div>
        </div>
      </div>

      <div className="table-shell padded-table">
        <div className="surface-header !py-5 !px-6 border-b border-jj-border">
          <h3 className="surface-title">Intern Performance Details</h3>
          <button
            onClick={exportProductivity}
            className="btn-sm btn-outline flex items-center gap-1.5"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>

        <div className="table-scroll">
          <table className="whitespace-nowrap">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Intern</th>
                <th>Tasks Done/Total</th>
                <th>Task Score</th>
                <th>Attendance</th>
                <th>Att. Score</th>
                <th>Reports</th>
                <th>Overall</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s, idx) => {
                const col = COLORS[idx % COLORS.length];
                const gc = s.overall_score >= 80 ? "#10b981" : s.overall_score >= 60 ? "#f59e0b" : "#ef4444";
                const ts_c = s.task_score >= 80 ? "#10b981" : s.task_score >= 50 ? "#f59e0b" : "#ef4444";
                const as_c = s.att_score >= 80 ? "#10b981" : s.att_score >= 50 ? "#f59e0b" : "#ef4444";
                const grade = getGrade(s.overall_score);

                return (
                  <tr key={s.email}>
                    <td className="font-bold" style={{ color: idx === 0 ? "#f59e0b" : idx === 1 ? "#9ca3af" : "#6b7280" }}>
                      #{idx + 1}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold shrink-0"
                          style={{ backgroundColor: `${col}22`, color: col }}
                        >
                          {s.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-[13px]">{s.name}</div>
                          <div className="text-[11px] text-jj-text-muted">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="font-semibold text-[13px]">{s.tasks_done}/{s.tasks_total}</div>
                      <div className="text-[11px] text-jj-text-muted">{s.tasks_in_progress} in progress · {s.tasks_pending} pending</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-[60px] overflow-hidden rounded-full bg-jj-border">
                          <div className="h-full rounded-full" style={{ width: `${s.task_score}%`, backgroundColor: ts_c }} />
                        </div>
                        <span className="text-[12px] font-bold" style={{ color: ts_c }}>{s.task_score}%</span>
                      </div>
                    </td>
                    <td className="text-[12px]">
                      ✅{s.present} ❌{s.absent} 🌿{s.leave}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-[60px] overflow-hidden rounded-full bg-jj-border">
                          <div className="h-full rounded-full" style={{ width: `${s.att_score}%`, backgroundColor: as_c }} />
                        </div>
                        <span className="text-[12px] font-bold" style={{ color: as_c }}>{s.att_score}%</span>
                      </div>
                    </td>
                    <td className="text-[13px]">
                      <strong>{s.reports_submitted}</strong> submitted · <span className="text-[#10b981]">{s.reports_reviewed}</span> reviewed
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-[70px] overflow-hidden rounded-full bg-jj-border">
                          <div className="h-full rounded-full" style={{ width: `${s.overall_score}%`, backgroundColor: gc }} />
                        </div>
                        <span className="text-[13px] font-bold" style={{ color: gc }}>{s.overall_score}%</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-[20px] font-extrabold" style={{ color: gc }}>{grade}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
