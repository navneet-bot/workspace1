"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const sharedLegend = {
  labels: {
    color: "#94a3b8",
    font: {
      family: "DM Sans",
      size: 12,
    },
  },
};

export function DashboardCharts({
  pending,
  inProgress,
  completed,
}: {
  pending: number;
  inProgress: number;
  completed: number;
}) {
  return (
    <div className="charts-row">
      <div className="chart-card">
        <h3>Task Status Overview</h3>
        <div className="chart-wrap">
          <Bar
            data={{
              labels: ["Pending", "In Progress", "Completed"],
              datasets: [
                {
                  label: "Tasks",
                  data: [pending, inProgress, completed],
                  backgroundColor: [
                    "rgba(245,158,11,0.7)",
                    "rgba(59,130,246,0.7)",
                    "rgba(16,185,129,0.7)",
                  ],
                  borderRadius: 6,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: sharedLegend,
              },
              scales: {
                x: {
                  ticks: { color: "#64748b" },
                  grid: { color: "rgba(255,255,255,0.04)" },
                },
                y: {
                  ticks: { color: "#64748b" },
                  grid: { color: "rgba(255,255,255,0.04)" },
                },
              },
            }}
          />
        </div>
      </div>
      <div className="chart-card">
        <h3>Task Distribution</h3>
        <div className="chart-wrap">
          <Doughnut
            data={{
              labels: ["Completed", "In Progress", "Pending"],
              datasets: [
                {
                  data: [completed, inProgress, pending],
                  backgroundColor: ["#10b981", "#3b82f6", "#f59e0b"],
                  borderWidth: 0,
                  hoverOffset: 6,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: sharedLegend,
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
