"use client";

import { useUIStore } from "@/hooks/useUIStore";
import { useState } from "react";
import { createProject, updateProject, deleteProject } from "@/app/actions/projects";
import { AnimatePresence, motion } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";

interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
  progress: number;
  color: string;
  members: string;
}

export function ProjectsGrid({ initialProjects, canManage, currentUserEmail }: { initialProjects: Project[]; canManage: boolean; currentUserEmail: string }) {
  const { addToast } = useUIStore();
  const [projects, setProjects] = useState(initialProjects);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("In Progress");
  const [loading, setLoading] = useState(false);

  const PROJECT_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#f97316"];

  const getMembersList = (membersStr: string) => {
    try {
      const arr = JSON.parse(membersStr);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return addToast("Project Name is required", "error");

    setLoading(true);
    const res = await createProject({
      name,
      description,
      status: "In Progress",
      progress: 0,
      color,
      createdBy: currentUserEmail,
    });
    setLoading(false);

    if (res.success) {
      addToast("Project created successfully!", "success");
      setIsCreateModalOpen(false);
      setName("");
      setDescription("");
      setColor("#3b82f6");
      window.location.reload();
    } else {
      addToast(res.error || "Failed to create", "error");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    if (!name.trim()) return addToast("Project Name is required", "error");

    const finalStatus = progress === 100 ? "Completed" : status;

    setLoading(true);
    const res = await updateProject(editingProject.id, {
      name,
      description,
      progress,
      status: finalStatus,
    });
    setLoading(false);

    if (res.success) {
      addToast("Project updated!", "success");
      setIsEditModalOpen(false);
      window.location.reload();
    } else {
      addToast(res.error || "Failed to update", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    const res = await deleteProject(id);
    if (res.success) {
      addToast("Project deleted", "success");
      setProjects(projects.filter((p) => p.id !== id));
    } else {
      addToast(res.error || "Failed to delete", "error");
    }
  };

  const handleQuickProgress = async (id: number, currentProgress: number, pColor: string) => {
    if (!canManage) return;
    const val = prompt("Set progress % (0-100):", currentProgress.toString());
    if (val === null) return;
    const num = Math.min(100, Math.max(0, parseInt(val) || 0));
    const newStatus = num === 100 ? "Completed" : num === 0 ? "Pending" : "In Progress";
    
    const res = await updateProject(id, { progress: num, status: newStatus });
    if (res.success) {
      addToast(`Progress updated to ${num}%`, "success");
      setProjects(projects.map(p => p.id === id ? { ...p, progress: num, status: newStatus } : p));
    } else {
      addToast("Failed to update progress", "error");
    }
  };

  const openEdit = (p: Project) => {
    setEditingProject(p);
    setName(p.name);
    setDescription(p.description);
    setProgress(p.progress);
    setStatus(p.status);
    setIsEditModalOpen(true);
  };

  return (
    <div className="page-stack">
      <div className="table-card">
        <div className="table-card-header">
          <h3>All Projects</h3>
          {canManage && (
            <button
              onClick={() => {
                setName("");
                setDescription("");
                setColor("#3b82f6");
                setIsCreateModalOpen(true);
              }}
              className="btn-sm btn-accent"
            >
              + New Project
            </button>
          )}
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>
                    No projects yet
                  </td>
                </tr>
              ) : (
                projects.map((p) => {
                  let statusClass = "badge-gray";
                  if (p.status === "Pending") statusClass = "badge-amber";
                  else if (p.status === "In Progress") statusClass = "badge-blue";
                  else if (p.status === "Completed") statusClass = "badge-green";

                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: p.color, flexShrink: 0 }} />
                          <div>
                            <strong>{p.name}</strong>
                            {p.description && (
                              <>
                                <br />
                                <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>{p.description}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ minWidth: "180px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div 
                            className="progress-bar" 
                            style={{ flex: 1, cursor: canManage ? "pointer" : "default" }}
                            onClick={() => handleQuickProgress(p.id, p.progress, p.color)}
                            title={canManage ? "Click to update progress" : ""}
                          >
                            <div className="progress-fill" style={{ width: `${p.progress}%`, backgroundColor: p.color }} />
                          </div>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: p.color, minWidth: "32px" }}>
                            {p.progress}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${statusClass}`}>
                          {p.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {canManage && (
                            <>
                              <button 
                                onClick={() => openEdit(p)}
                                className="action-btn action-edit flex items-center gap-1"
                              >
                                <Pencil size={12} className="stroke-[2.5]" />
                                <span>Edit</span>
                              </button>
                              <button 
                                onClick={() => handleDelete(p.id)}
                                className="action-btn action-reject flex items-center justify-center"
                                style={{ width: "28px", height: "28px", padding: 0, borderRadius: "6px" }}
                              >
                                <Trash2 size={12} className="stroke-[2.5]" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE PROJECT MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="modal-shell">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="modal w-full !max-w-[450px]"
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
                <h3 style={{ margin: 0 }}>Create New Project</h3>
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="modal-close">✕</button>
              </div>

              <form onSubmit={handleCreate} className="modal-form">
                <div className="field">
                  <label>Project Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Website Revamp"
                  />
                </div>
                <div className="field">
                  <label>Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this project about?"
                    rows={2}
                    style={{ resize: "vertical" }}
                  />
                </div>
                <div className="field">
                  <label>Color</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {PROJECT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className="h-6 w-6 rounded-full transition-transform"
                        style={{
                          backgroundColor: c,
                          border: color === c ? "2px solid white" : "2px solid transparent",
                          transform: color === c ? "scale(1.2)" : "scale(1)",
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="btn-sm btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-sm btn-accent disabled:opacity-70"
                  >
                    {loading ? "Creating..." : "Create"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT PROJECT MODAL */}
      <AnimatePresence>
        {isEditModalOpen && editingProject && (
          <div className="modal-shell">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="modal w-full !max-w-[450px]"
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
                <h3 style={{ margin: 0 }}>Edit Project</h3>
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="modal-close">✕</button>
              </div>

              <form onSubmit={handleEdit} className="modal-form">
                <div className="field">
                  <label>Project Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    style={{ resize: "vertical" }}
                  />
                </div>
                <div className="field">
                  <label>Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option>In Progress</option>
                    <option>Pending</option>
                    <option>Completed</option>
                  </select>
                </div>
                <div className="field">
                  <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    Progress — <span className="font-bold text-jj-accent">{progress}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={progress}
                    onChange={(e) => setProgress(Number(e.target.value))}
                    className="mt-1 w-full cursor-pointer accent-jj-accent"
                  />
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-jj-border">
                    <div
                      className="h-full rounded-full transition-all duration-200"
                      style={{ width: `${progress}%`, backgroundColor: editingProject.color }}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="btn-sm btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-sm btn-accent disabled:opacity-70"
                  >
                    {loading ? "Saving..." : "✓ Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
