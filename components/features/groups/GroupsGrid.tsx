"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useUIStore } from "@/hooks/useUIStore";
import { createGroup, deleteGroup } from "@/app/actions/groups";


interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Group {
  id: number;
  name: string;
  description: string;
  icon: string;
  members: string; // JSON list of emails
}

export function GroupsGrid({
  initialGroups,
  allUsers,
  canManage,
  currentUserEmail,
}: {
  initialGroups: Group[];
  allUsers: User[];
  canManage: boolean;
  currentUserEmail: string;
}) {
  const router = useRouter();
  const { addToast } = useUIStore();
  const [groups, setGroups] = useState(initialGroups);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("📁");
  const [search, setSearch] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4"];

  const handleCreate = async () => {
    if (!name.trim()) return addToast("Group Name is required", "error");

    setLoading(true);
    const res = await createGroup({
      name,
      description,
      icon: icon || "📁",
      members: JSON.stringify(selectedMembers),
      createdBy: currentUserEmail,
    });
    setLoading(false);

    if (res.success && res.group) {
      addToast("Group created successfully", "success");
      setGroups((prev) => [res.group as any, ...prev]);
      setName("");
      setDescription("");
      setIcon("📁");
      setSelectedMembers([]);
      setSearch("");
    } else {
      addToast(res.error || "Failed to create", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this group?")) return;
    const res = await deleteGroup(id);
    if (res.success) {
      addToast("Group deleted", "success");
      setGroups(groups.filter((g) => g.id !== id));
    } else {
      addToast(res.error || "Failed to delete", "error");
    }
  };

  const toggleMember = (email: string) => {
    setSelectedMembers((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const getMembersList = (membersStr: string) => {
    try {
      const arr = JSON.parse(membersStr);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="flex flex-col gap-[16px]">
      {canManage && (
        <div className="table-card" style={{ marginBottom: 16 }}>
          <div className="table-card-header">
            <h3>Create New Group</h3>
          </div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div className="field" style={{ margin: 0, flex: 1, minWidth: 140 }}>
                <label>Group Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Frontend Team"
                />
              </div>
              <div className="field" style={{ margin: 0, flex: 1, minWidth: 180 }}>
                <label>Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this group for?"
                />
              </div>
              <div className="field" style={{ margin: 0, width: 80 }}>
                <label>Icon</label>
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="📁"
                />
              </div>
            </div>

            {/* Searchable member selector */}
            <div className="field" style={{ margin: 0 }}>
              <label>
                Add Members <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 11 }}>(search and select)</span>
              </label>
              <input
                id="gMemberSearch"
                className="search-input"
                placeholder="🔍 Search by name or ID..."
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%", marginBottom: 8, boxSizing: "border-box" }}
              />
              <div id="gMemberDropdown" style={{ maxHeight: 160, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8, backgroundColor: "var(--surface2)" }}>
                {allUsers
                  .filter((u) => u.role !== "admin")
                  .map((u, i) => {
                    const isSelected = selectedMembers.includes(u.email);
                    const color = COLORS[i % COLORS.length];
                    const query = search.trim().toLowerCase();
                    const matches = query && (u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query));
                    return (
                      <label
                        key={u.email}
                        style={{
                          display: matches ? "flex" : "none",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 12px",
                          cursor: "pointer",
                          borderBottom: "1px solid var(--border)",
                        }}
                        className="hover:bg-white/[0.04]"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleMember(u.email)}
                          style={{ accentColor: "var(--accent)", width: 15, height: 15, flexShrink: 0 }}
                        />
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            backgroundColor: `${color}22`,
                            color: color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{u.name}</div>
                          <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>@{u.email.split("@")[0]}</div>
                        </div>
                      </label>
                    );
                  })}
              </div>
              {/* Selected tags shown here */}
              <div id="gSelectedTags" style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8, minHeight: 0 }}>
                {selectedMembers.map((email, idx) => {
                  const u = allUsers.find((x) => x.email === email);
                  const name = u ? u.name : email.split("@")[0];
                  const col = COLORS[idx % COLORS.length];
                  return (
                    <span
                      key={email}
                      onClick={() => toggleMember(email)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "4px 10px",
                        borderRadius: 20,
                        backgroundColor: `${col}18`,
                        border: `1px solid ${col}44`,
                        color: col,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                      title="Click to remove"
                    >
                      {name} <span style={{ fontSize: 10, opacity: 0.6 }}>✕</span>
                    </span>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  className="action-btn action-approve"
                  onClick={() => setSelectedMembers(allUsers.filter((u) => u.role !== "admin").map((u) => u.email))}
                >
                  + Select All
                </button>
                <button
                  className="action-btn action-reject"
                  onClick={() => setSelectedMembers([])}
                >
                  ✕ Clear All
                </button>
                <span id="gMemberCount" style={{ fontSize: 12, color: "var(--accent)", padding: "4px 0" }}>
                  {selectedMembers.length} selected
                </span>
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={loading}
              className="btn-sm btn-accent"
              style={{ alignSelf: "flex-start" }}
            >
              {loading ? "Creating..." : "+ Create Group"}
            </button>
          </div>
        </div>
      )}

      <div className="groups-grid">
        {groups.length === 0 ? (
          <div className="col-span-full p-[20px] text-center text-[13px] text-jj-text-muted">
            {canManage ? "No groups yet. Create one above!" : "You have not been added to any group yet."}
          </div>
        ) : (
          groups.map((g, i) => {
            const members = getMembersList(g.members);
            const memberUsers = members.map((email) => allUsers.find((u) => u.email === email)).filter(Boolean);
            const color = COLORS[i % COLORS.length];

            return (
              <div
                key={g.id}
                className="group-card"
                style={{ cursor: "pointer", position: "relative" }}
                onClick={() => router.push(`/dashboard/chat?select=group_${g.id}`)}
              >
                <div
                  className="group-icon"
                  style={{ backgroundColor: `${color}18` }}
                >
                  {g.icon || "📁"}
                </div>
                <h4>{g.name}</h4>
                <p>
                  {g.description}
                </p>
                
                <div style={{ margin: "10px 0", display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {memberUsers.length ? (
                    memberUsers.slice(0, 5).map((u, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          background: "var(--surface2)",
                          border: "1px solid var(--border)",
                          borderRadius: 20,
                          color: "var(--text-soft)",
                        }}
                      >
                        {u?.name}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>No members yet</span>
                  )}
                  {memberUsers.length > 5 && (
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                        borderRadius: 20,
                        color: "var(--text-soft)",
                      }}
                    >
                      +{memberUsers.length - 5}
                    </span>
                  )}
                </div>
                
                <div className="group-meta" style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {members.length} member{members.length !== 1 && "s"}
                  </span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={() => router.push(`/dashboard/chat?select=group_${g.id}`)}
                      className="action-btn action-edit"
                    >
                      💬 Chat
                    </button>
                    {canManage && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(g.id);
                        }}
                        className="action-btn action-reject"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
