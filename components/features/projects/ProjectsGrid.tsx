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
  managerEmail?: string;
  deadline?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export function ProjectsGrid({
  initialProjects,
  canManage,
  currentUserEmail,
  allUsers = [],
}: {
  initialProjects: Project[];
  canManage: boolean;
  currentUserEmail: string;
  allUsers?: User[];
}) {
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
  const [managerEmail, setManagerEmail] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [managerSearch, setManagerSearch] = useState("");
  const [deadline, setDeadline] = useState("");

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
      managerEmail,
      members: JSON.stringify(selectedMembers),
      deadline,
    });
    setLoading(false);

    if (res.success) {
      addToast("Project created successfully!", "success");
      setIsCreateModalOpen(false);
      setName("");
      setDescription("");
      setColor("#3b82f6");
      setManagerEmail("");
      setSelectedMembers([]);
      setDeadline("");
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
      managerEmail,
      members: JSON.stringify(selectedMembers),
      deadline,
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
    setManagerEmail(p.managerEmail || "");
    setSelectedMembers(getMembersList(p.members));
    setMemberSearch("");
    setManagerSearch("");
    setDeadline(p.deadline || "");
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
                setManagerEmail("");
                setSelectedMembers([]);
                setMemberSearch("");
                setManagerSearch("");
                setDeadline("");
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
                <th>Reporting Manager</th>
                <th>Deadline</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>
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
                      <td>
                        {(() => {
                          if (!p.managerEmail) return <span style={{ color: "var(--text-muted)", fontSize: "12.5px" }}>—</span>;
                          const manager = allUsers.find(u => u.email === p.managerEmail);
                          return (
                            <div>
                              <strong style={{ fontSize: "13px" }}>{manager ? manager.name : p.managerEmail.split("@")[0]}</strong>
                              <br />
                              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{p.managerEmail}</span>
                            </div>
                          );
                        })()}
                      </td>
                      <td>
                        {p.deadline ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span style={{ fontSize: "13px", fontWeight: 500 }}>
                              {new Date(p.deadline).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                            {(() => {
                              const dlDate = new Date(p.deadline);
                              const now = new Date();
                              dlDate.setHours(0, 0, 0, 0);
                              now.setHours(0, 0, 0, 0);
                              if (dlDate < now && p.status !== "Completed") {
                                return <span style={{ fontSize: "10px", color: "#ef4444", fontWeight: 600 }}>Overdue</span>;
                              }
                              return null;
                            })()}
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "12.5px" }}>TBD</span>
                        )}
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
                  <label>Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Reporting Manager</label>
                  <input
                    className="search-input"
                    placeholder="🔍 Search managers..."
                    type="text"
                    value={managerSearch}
                    onChange={(e) => setManagerSearch(e.target.value)}
                    style={{ width: "100%", marginBottom: 8, boxSizing: "border-box" }}
                  />
                  <div style={{ maxHeight: 110, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8, backgroundColor: "var(--surface2)" }}>
                    {allUsers
                      .filter(u => (u.role === "admin" || u.role === "super_admin" || u.role === "tutor") && (u.name.toLowerCase().includes(managerSearch.toLowerCase()) || u.email.toLowerCase().includes(managerSearch.toLowerCase())))
                      .map(u => {
                        const isChecked = managerEmail === u.email;
                        return (
                          <label key={u.email} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", cursor: "pointer", borderBottom: "1px solid var(--border)" }} className="hover:bg-white/[0.04]">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setManagerEmail(isChecked ? "" : u.email);
                              }}
                              style={{ accentColor: "var(--accent)", width: 14, height: 14 }}
                            />
                            <span style={{ fontSize: "12.5px" }}>{u.name} ({u.role.replace("_", " ")})</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
                <div className="field">
                  <label>Project Members</label>
                  <input
                    className="search-input"
                    placeholder="🔍 Search members..."
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    style={{ width: "100%", marginBottom: 8, boxSizing: "border-box" }}
                  />
                  <div style={{ maxHeight: 110, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8, backgroundColor: "var(--surface2)" }}>
                    {allUsers
                      .filter(u => u.role === "intern" && (u.name.toLowerCase().includes(memberSearch.toLowerCase()) || u.email.toLowerCase().includes(memberSearch.toLowerCase())))
                      .map(u => {
                        const isChecked = selectedMembers.includes(u.email);
                        return (
                          <label key={u.email} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", cursor: "pointer", borderBottom: "1px solid var(--border)" }} className="hover:bg-white/[0.04]">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setSelectedMembers(prev =>
                                  prev.includes(u.email) ? prev.filter(e => e !== u.email) : [...prev, u.email]
                                );
                              }}
                              style={{ accentColor: "var(--accent)", width: 14, height: 14 }}
                            />
                            <span style={{ fontSize: "12.5px" }}>{u.name} ({u.email.split("@")[0]})</span>
                          </label>
                        );
                      })}
                  </div>
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
                  <label>Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Reporting Manager</label>
                  <input
                    className="search-input"
                    placeholder="🔍 Search managers..."
                    type="text"
                    value={managerSearch}
                    onChange={(e) => setManagerSearch(e.target.value)}
                    style={{ width: "100%", marginBottom: 8, boxSizing: "border-box" }}
                  />
                  <div style={{ maxHeight: 110, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8, backgroundColor: "var(--surface2)" }}>
                    {allUsers
                      .filter(u => (u.role === "admin" || u.role === "super_admin" || u.role === "tutor") && (u.name.toLowerCase().includes(managerSearch.toLowerCase()) || u.email.toLowerCase().includes(managerSearch.toLowerCase())))
                      .map(u => {
                        const isChecked = managerEmail === u.email;
                        return (
                          <label key={u.email} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", cursor: "pointer", borderBottom: "1px solid var(--border)" }} className="hover:bg-white/[0.04]">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setManagerEmail(isChecked ? "" : u.email);
                              }}
                              style={{ accentColor: "var(--accent)", width: 14, height: 14 }}
                            />
                            <span style={{ fontSize: "12.5px" }}>{u.name} ({u.role.replace("_", " ")})</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
                <div className="field">
                  <label>Project Members</label>
                  <input
                    className="search-input"
                    placeholder="🔍 Search members..."
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    style={{ width: "100%", marginBottom: 8, boxSizing: "border-box" }}
                  />
                  <div style={{ maxHeight: 110, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8, backgroundColor: "var(--surface2)" }}>
                    {allUsers
                      .filter(u => u.role === "intern" && (u.name.toLowerCase().includes(memberSearch.toLowerCase()) || u.email.toLowerCase().includes(memberSearch.toLowerCase())))
                      .map(u => {
                        const isChecked = selectedMembers.includes(u.email);
                        return (
                          <label key={u.email} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", cursor: "pointer", borderBottom: "1px solid var(--border)" }} className="hover:bg-white/[0.04]">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setSelectedMembers(prev =>
                                  prev.includes(u.email) ? prev.filter(e => e !== u.email) : [...prev, u.email]
                                );
                              }}
                              style={{ accentColor: "var(--accent)", width: 14, height: 14 }}
                            />
                            <span style={{ fontSize: "12.5px" }}>{u.name} ({u.email.split("@")[0]})</span>
                          </label>
                        );
                      })}
                  </div>
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
