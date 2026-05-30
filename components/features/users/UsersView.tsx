"use client";

import { useState } from "react";
import { useUIStore } from "@/hooks/useUIStore";
import { promoteUser, demoteUser, deleteUser, updateUserPermissions } from "@/app/actions/users";

import { AnimatePresence, motion } from "framer-motion";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: string;
}

const ALL_PERMISSIONS = [
  { key: "create_task", label: "Create Tasks", desc: "Can create and assign tasks to interns", icon: "📋" },
  { key: "delete_task", label: "Delete Tasks", desc: "Can remove any task from the system", icon: "🗑" },
  { key: "manage_attendance", label: "Manage Attendance", desc: "Can mark attendance for all members", icon: "📅" },
  { key: "view_reports", label: "View & Review Reports", desc: "Can see and review all intern reports", icon: "📄" },
  { key: "manage_groups", label: "Manage Groups", desc: "Can create and manage groups", icon: "👥" },
  { key: "manage_meetings", label: "Schedule Meetings", desc: "Can schedule and manage meetings", icon: "📅" },
  { key: "manage_candidates", label: "View Candidates", desc: "Can view and manage candidates", icon: "🎯" },
  { key: "send_notifications", label: "Send Notifications", desc: "Can send notifications to team", icon: "🔔" },
  { key: "view_productivity", label: "View Productivity", desc: "Can view productivity reports", icon: "📊" },
  { key: "manage_projects", label: "Manage Projects", desc: "Can create and update projects", icon: "🚀" },
];

export function UsersView({ initialUsers }: { initialUsers: User[] }) {
  const { addToast } = useUIStore();
  const [users, setUsers] = useState(initialUsers);
  
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [permMode, setPermMode] = useState<"default" | "promote">("default");
  const [loading, setLoading] = useState(false);

  const handlePromote = async (u: User) => {
    setSelectedUser(u);
    setSelectedPerms(u.permissions ? u.permissions.split(",").map((p) => p.trim()) : []);
    setPermMode("promote");
    setIsPermModalOpen(true);
  };

  const handleDemote = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to demote ${name} to Intern?`)) return;
    const res = await demoteUser(id);
    if (res.success) {
      addToast(`${name} demoted to Intern`, "success");
      setUsers(users.map((u) => (u.id === id ? { ...u, role: "intern", permissions: "" } : u)));
    } else {
      addToast(res.error || "Failed to demote", "error");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete user ${name}?`)) return;
    const res = await deleteUser(id);
    if (res.success) {
      addToast("User deleted", "success");
      setUsers(users.filter((u) => u.id !== id));
    } else {
      addToast(res.error || "Failed to delete", "error");
    }
  };

  const savePermissions = async () => {
    if (!selectedUser) return;
    setLoading(true);

    const permString = selectedPerms.join(",");
    let success = false;

    if (permMode === "promote") {
      // First promote, then update permissions
      const res1 = await promoteUser(selectedUser.id);
      if (res1.success) {
        const res2 = await updateUserPermissions(selectedUser.id, permString);
        if (res2.success) success = true;
      }
    } else {
      const res = await updateUserPermissions(selectedUser.id, permString);
      if (res.success) success = true;
    }

    setLoading(false);

    if (success) {
      addToast("Permissions updated successfully", "success");
      setIsPermModalOpen(false);
      // Optimistic
      setUsers(
        users.map((u) =>
          u.id === selectedUser.id
            ? { ...u, role: permMode === "promote" ? "super_admin" : u.role, permissions: permString }
            : u
        )
      );
    } else {
      addToast("Failed to update permissions", "error");
    }
  };

  const togglePerm = (key: string) => {
    setSelectedPerms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handleSelectAll = (select: boolean) => {
    setSelectedPerms(select ? ALL_PERMISSIONS.map((p) => p.key) : []);
  };

  const RoleBadge = ({ role }: { role: string }) => {
    if (role === "admin")
      return <span className="badge badge-red">admin</span>;
    if (role === "super_admin")
      return <span className="badge badge-purple">super admin</span>;
    return <span className="badge badge-blue">intern</span>;
  };

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="table-card">
        <div className="table-card-header">
          <h3>All Users & Roles</h3>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{users.length} total</span>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Permissions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong></td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{u.email}</td>
                  <td>
                    <RoleBadge role={u.role} />
                  </td>
                  <td style={{ fontSize: 11.5, color: "var(--text-muted)", maxWidth: 200 }}>
                    {u.role === "super_admin" ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                        {u.permissions ? (
                          u.permissions.split(",").map((p) => (
                            <span
                              key={p}
                              style={{
                                padding: "1px 6px",
                                background: "rgba(139,92,246,0.12)",
                                border: "1px solid rgba(139,92,246,0.25)",
                                borderRadius: 10,
                                fontSize: 10.5,
                                color: "var(--purple)",
                              }}
                            >
                                {p.trim()}
                              </span>
                          ))
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>No permissions</span>
                        )}
                      </div>
                    ) : (
                      u.permissions || "—"
                    )}
                  </td>
                  <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {u.role !== "admin" ? (
                      <>
                        {u.role === "intern" && (
                          <button
                            onClick={() => handlePromote(u)}
                            className="action-btn action-approve"
                          >
                            ⭐ Super Admin
                          </button>
                        )}
                        {u.role === "super_admin" && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setSelectedPerms(u.permissions ? u.permissions.split(",").map((p) => p.trim()) : []);
                                setPermMode("default");
                                setIsPermModalOpen(true);
                              }}
                              className="action-btn action-edit"
                            >
                              🔧 Permissions
                            </button>
                            <button
                              onClick={() => handleDemote(u.id, u.name)}
                              className="action-btn action-edit"
                            >
                              ↓ Intern
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(u.id, u.name)}
                          className="action-btn action-reject"
                        >
                          🗑
                        </button>
                      </>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Boss</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="table-card" style={{ marginTop: 16 }}>
        <div className="table-card-header">
          <h3>Role Hierarchy & Permissions</h3>
        </div>
        <div style={{ padding: 20, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 12, padding: 18, flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>👑</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--red)" }}>Admin — Boss</div>
            <ul style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10, paddingLeft: 16, lineHeight: 2.2 }}>
              <li>Full platform control</li>
              <li>Promote → Super Admin</li>
              <li>Set custom permissions</li>
              <li>Demote / Delete users</li>
              <li>All modules</li>
            </ul>
          </div>
          <div style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 12, padding: 18, flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⭐</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--purple)" }}>Super Admin</div>
            <ul style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10, paddingLeft: 16, lineHeight: 2.2 }}>
              <li>Permissions set by Admin</li>
              <li>Click 🔧 to customize</li>
              <li>Can vary per user</li>
            </ul>
          </div>
          <div style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 12, padding: 18, flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🎓</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--blue)" }}>Intern</div>
            <ul style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10, paddingLeft: 16, lineHeight: 2.2 }}>
              <li>View own tasks</li>
              <li>Mark own attendance</li>
              <li>Submit reports</li>
              <li>Chat with team</li>
            </ul>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isPermModalOpen && selectedUser && (
          <div className="modal-shell">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-jj-surface border border-jj-border rounded-[20px] w-full max-w-[520px] shadow-[0_24px_64px_rgba(0,0,0,0.5)] max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 md:p-[24px_32px] border-b border-jj-border flex items-center justify-between shrink-0">
                <div>
                  <h3 className="m-0 text-[16px] font-bold text-jj-text">
                    {permMode === "promote" ? "🔧 Promote to Super Admin & Set Permissions" : "🔧 Set Permissions"}
                  </h3>
                  <p className="m-0 mt-1 text-[12.5px] text-jj-text-muted">
                    ⭐ {selectedUser.name} — Super Admin
                  </p>
                </div>
                <button
                  onClick={() => setIsPermModalOpen(false)}
                  className="modal-close text-[20px]"
                >
                  ✕
                </button>
              </div>

              {/* Quick select */}
              <div className="p-[12px_20px] md:p-[12px_32px] border-b border-jj-border flex gap-2 shrink-0 items-center">
                <button className="action-btn action-approve" onClick={() => handleSelectAll(true)}>✓ Select All</button>
                <button className="action-btn action-reject" onClick={() => handleSelectAll(false)}>✕ Clear All</button>
                <span id="permCount" className="text-[12px] text-jj-accent">{selectedPerms.length} selected</span>
              </div>

              {/* Permissions list */}
              <div className="overflow-y-auto flex-1 p-5 md:p-[16px_32px] flex flex-col gap-4">
                {ALL_PERMISSIONS.map((p) => {
                  const isChecked = selectedPerms.includes(p.key);
                  return (
                    <label
                      key={p.key}
                      style={{
                        border: `1px solid ${isChecked ? "var(--accent)" : "var(--border)"}`,
                        background: isChecked ? "rgba(245,158,11,0.06)" : "transparent"
                      }}
                      className="flex items-start gap-3 p-3.5 rounded-[12px] cursor-pointer transition-all hover:border-jj-accent"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePerm(p.key)}
                        style={{ accentColor: "var(--accent)" }}
                        className="w-[18px] h-[18px] shrink-0 mt-0.5"
                      />
                      <div>
                        <div className="text-[13px] font-semibold text-jj-text">
                          {p.icon} {p.label}
                        </div>
                        <div className="text-[11.5px] text-jj-text-muted mt-0.5">
                          {p.desc}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="p-5 md:p-[20px_32px] border-t border-jj-border flex gap-2 justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPermModalOpen(false)}
                  className="btn-sm btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={savePermissions}
                  disabled={loading}
                  className="btn-sm btn-accent"
                >
                  {loading ? "Saving..." : "✓ Save Permissions"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
