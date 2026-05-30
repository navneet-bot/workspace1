"use client";

import { useUIStore } from "@/hooks/useUIStore";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getUsersForSelect, getProjectsForSelect, createTask } from "@/app/actions/metadata";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export function TaskModal() {
  const { isTaskModalOpen, setTaskModalOpen, addToast } = useUIStore();
  const { data: session } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<{ email: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);

  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [deadline, setDeadline] = useState("");
  const [project, setProject] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isTaskModalOpen) {
      getUsersForSelect().then((u) => setUsers(u.map(x => ({ email: x.email, name: x.name }))));
      getProjectsForSelect().then(setProjects);
    }
  }, [isTaskModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return addToast("Task Title is required", "error");
    
    setLoading(true);
    const result = await createTask({
      title,
      description,
      assignedTo,
      priority,
      deadline: deadline || "TBD",
      project,
      createdBy: session?.user?.email || "Unknown",
    });

    setLoading(false);
    if (result.success) {
      addToast("Task Created successfully!", "success");
      setTaskModalOpen(false);
      setTitle("");
      setDescription("");
      router.refresh();
    } else {
      addToast(result.error || "Failed to create task", "error");
    }
  };

  return (
    <AnimatePresence>
      {isTaskModalOpen && (
        <div className="modal-shell">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="modal"
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <h3 style={{ margin: 0 }}>Create New Task</h3>
              <button
                type="button"
                onClick={() => setTaskModalOpen(false)}
                className="modal-close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="field">
                <label>Task Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Build Login Page"
                />
              </div>

              <div className="form-row">
                <div className="field">
                  <label>Assign To</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                  >
                    <option value="">-- Unassigned --</option>
                    {users.map((u) => (
                      <option key={u.email} value={u.email}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="field">
                  <label>Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Project</label>
                  <select
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                  >
                    <option value="">-- Select Project --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Task details..."
                  rows={2}
                  style={{ resize: "vertical" }}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setTaskModalOpen(false)}
                  className="btn-sm btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-sm btn-accent disabled:opacity-70"
                >
                  {loading ? "Saving..." : "Create Task"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
