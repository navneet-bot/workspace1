"use client";

import { useState } from "react";
import { updateTaskStatus } from "@/app/actions/tasks";
import { useUIStore } from "@/hooks/useUIStore";

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  deadline: string;
  assignedTo?: string | null;
}

interface AssigneeUser {
  id: number;
  name: string | null;
  username: string | null;
  email: string;
}

function getAssigneeLabel(user?: AssigneeUser | null, email?: string | null) {
  if (!user && !email) return "";
  return user?.name?.trim() || user?.username?.trim() || (user?.id ? `User #${user.id}` : "") || email || "";
}

export function MyTasksKanban({ initialTasks, currentUser }: { initialTasks: Task[]; currentUser?: AssigneeUser | null }) {
  const { addToast } = useUIStore();
  const [tasks, setTasks] = useState(initialTasks);
  const assigneeLabel = getAssigneeLabel(currentUser, currentUser?.email);

  const pending = tasks.filter((t) => t.status === "Pending");
  const inProg = tasks.filter((t) => t.status === "In Progress");
  const done = tasks.filter((t) => t.status === "Completed");

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    const originalTasks = [...tasks];
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));

    const result = await updateTaskStatus(taskId, newStatus);
    if (!result.success) {
      setTasks(originalTasks);
      addToast(result.error || "Failed to update status", "error");
    } else {
      addToast(`Task moved to ${newStatus}`, "success");
    }
  };

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData("taskId", id.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    const idStr = e.dataTransfer.getData("taskId");
    if (!idStr) return;
    const taskId = parseInt(idStr);
    await handleStatusChange(taskId, newStatus);
  };

  const prioritySpan = (priority: string) => {
    let color = "";
    if (priority === "High") color = "bg-[rgba(239,68,68,0.15)] text-[#ef4444]";
    else if (priority === "Low") color = "bg-[rgba(16,185,129,0.15)] text-[#10b981]";
    else color = "bg-[rgba(59,130,246,0.15)] text-[#3b82f6]";
    return (
      <span className={`inline-block rounded-[20px] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.5px] ${color}`}>
        {priority}
      </span>
    );
  };

  const renderCard = (t: Task) => (
    <div
      key={t.id}
      draggable
      onDragStart={(e) => handleDragStart(e, t.id)}
      className="task-card cursor-grab active:cursor-grabbing active:scale-95"
    >
      <h5>{t.title}</h5>
      <p className="line-clamp-2">{t.description}</p>
      
      <div className="task-card-meta mb-3">
        {prioritySpan(t.priority)}
        <span className="task-due">📅 {t.deadline}</span>
      </div>

      {assigneeLabel ? (
        <div className="mb-3 text-[12px] font-semibold text-jj-text-main">
          {assigneeLabel}
          {currentUser?.email ? (
            <div className="mt-0.5 text-[11px] font-normal text-jj-text-muted">{currentUser.email}</div>
          ) : null}
        </div>
      ) : null}
      
      <div>
        <select
          value={t.status}
          onChange={(e) => handleStatusChange(t.id, e.target.value)}
          className="field-select !w-full !rounded-[7px] !bg-[var(--surface)] !px-[10px] !py-[6px] !text-[12.5px]"
        >
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="task-kanban">
      <div
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, "Pending")}
        className="kanban-col"
      >
        <div className="kanban-header">
          <span>Pending</span>
          <span className="kanban-count">{pending.length}</span>
        </div>
        <div className="kanban-body min-h-[220px]">
          {pending.length > 0 ? (
            pending.map(renderCard)
          ) : (
            <div className="empty-state py-6 text-[12px]">
              No pending tasks
            </div>
          )}
        </div>
      </div>

      <div
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, "In Progress")}
        className="kanban-col"
      >
        <div className="kanban-header">
          <span>In Progress</span>
          <span className="kanban-count">{inProg.length}</span>
        </div>
        <div className="kanban-body min-h-[220px]">
          {inProg.length > 0 ? (
            inProg.map(renderCard)
          ) : (
            <div className="empty-state py-6 text-[12px]">
              None in progress
            </div>
          )}
        </div>
      </div>

      <div
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, "Completed")}
        className="kanban-col"
      >
        <div className="kanban-header">
          <span>Completed</span>
          <span className="kanban-count">{done.length}</span>
        </div>
        <div className="kanban-body min-h-[220px]">
          {done.length > 0 ? (
            done.map(renderCard)
          ) : (
            <div className="empty-state py-6 text-[12px]">
              None completed yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
