"use client";

import { useUIStore } from "@/hooks/useUIStore";
import { updateTaskStatus } from "@/app/actions/tasks";
import { useState } from "react";
import { MoreHorizontal } from "lucide-react";

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  deadline: string;
  assignedTo: string | null;
  project: string;
}

export function TasksTable({ initialTasks }: { initialTasks: Task[] }) {
  const { setTaskModalOpen, addToast } = useUIStore();
  const [tasks, setTasks] = useState(initialTasks);
  const [search, setSearch] = useState("");

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    const original = [...tasks];
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    const res = await updateTaskStatus(taskId, newStatus);
    if (!res.success) {
      setTasks(original);
      addToast(res.error || "Failed", "error");
    } else {
      addToast("Status updated", "success");
    }
  };

  const prioritySpan = (priority: string) => {
    let color = "";
    if (priority === "High") color = "priority-high";
    else if (priority === "Low") color = "priority-low";
    else color = "priority-medium";
    return (
      <span className={color}>
        {priority}
      </span>
    );
  };

  const filteredTasks = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.assignedTo || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="table-tools">
        <input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <button
          onClick={() => setTaskModalOpen(true)}
          className="btn-sm btn-accent"
        >
          + New Task
        </button>
      </div>
      
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Assignee</th>
              <th>Project</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Deadline</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>
                  No tasks found.
                </td>
              </tr>
            ) : (
              filteredTasks.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--text-soft)" }}>#{t.id}</td>
                  <td>
                    <strong>{t.title}</strong>
                    {t.description && (
                      <>
                        <br />
                        <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                          {t.description}
                        </span>
                      </>
                    )}
                  </td>
                  <td>{t.assignedTo || <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                  <td>{t.project || <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                  <td>{prioritySpan(t.priority)}</td>
                  <td>
                    <select
                      value={t.status}
                      onChange={(e) => handleStatusChange(t.id, e.target.value)}
                      style={{
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        padding: "4px 8px",
                        color: "var(--text)",
                        fontSize: "12px",
                        outline: "none",
                        cursor: "pointer"
                      }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </td>
                  <td style={{ color: "var(--text-soft)" }}>{t.deadline || "TBD"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
