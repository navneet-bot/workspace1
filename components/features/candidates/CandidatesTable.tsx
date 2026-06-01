"use client";

import { useState, useRef } from "react";
import { useUIStore } from "@/hooks/useUIStore";
import { useRouter } from "next/navigation";
import { AddCandidateModal } from "./AddCandidateModal";
import { EditCandidateModal } from "./EditCandidateModal";
import { SendEmailModal } from "./SendEmailModal";
import * as XLSX from "xlsx";
import { 
  bulkImportCandidates, 
  fetchGoogleSheetCsv,
  updateCandidateStatus,
  bulkUpdateCandidateStatus,
  deleteCandidates,
  revokeCandidateCredentials
} from "@/app/actions/candidates";

interface Candidate {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  skill: string;
  resume: string;
  resumeLink: string;
  status: string;
  state: string;
  college: string;
  eduDomain: string;
  duration: string;
  appliedAt: Date;
}

const CSV_FIELDS = [
  { key: "name", label: "Name (Full Name)", icon: "👤", required: true },
  { key: "email", label: "Email Address", icon: "📧", required: true },
  { key: "phone", label: "Phone Number", icon: "📱", required: false },
  { key: "skill", label: "Primary Skill", icon: "⚡", required: false },
  { key: "college", label: "College/University", icon: "🎓", required: false },
  { key: "state", label: "State", icon: "📍", required: false },
  { key: "edu_domain", label: "Education Domain", icon: "📚", required: false },
  { key: "duration", label: "Duration", icon: "⏱", required: false },
  { key: "resume_link", label: "Resume/CV Link", icon: "🔗", required: false }
];

function _parseCsv(text: string) {
  return text.trim().split(/\r?\n/).map(line => {
    const result = []; let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"' && !inQ) { inQ = true; continue; }
      if (ch === '"' && inQ) { inQ = false; continue; }
      if (ch === "," && !inQ) { result.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    result.push(cur.trim());
    return result;
  });
}

function _autoMapFields(headers: string[]) {
  const map: Record<string, number> = {};
  for (let i = 0; i < headers.length; i++) {
    const h = (headers[i] || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!h) continue;
    if (h.includes("name") && map.name === undefined) map.name = i;
    else if (h.includes("email") && map.email === undefined) map.email = i;
    else if ((h.includes("phone") || h.includes("mobile")) && map.phone === undefined) map.phone = i;
    else if ((h.includes("skill") || h.includes("technology")) && map.skill === undefined) map.skill = i;
    else if ((h.includes("college") || h.includes("university")) && map.college === undefined) map.college = i;
    else if (h.includes("state") && map.state === undefined) map.state = i;
    else if ((h.includes("domain") || h.includes("education")) && map.edu_domain === undefined) map.edu_domain = i;
    else if ((h.includes("duration") || h.includes("months")) && map.duration === undefined) map.duration = i;
    else if ((h.includes("resume") || h.includes("cv")) && map.resume_link === undefined) map.resume_link = i;
  }
  return map;
}

export function CandidatesTable({ initialCandidates }: { initialCandidates: Candidate[] }) {
  const router = useRouter();
  const { addToast } = useUIStore();
  const [candidates, setCandidates] = useState(initialCandidates);
  const [activeTab, setActiveTab] = useState<"applicants" | "applications">("applicants");
  
  // Modals state
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [editCandidate, setEditCandidate] = useState<Candidate | null>(null);
  const [emailCandidate, setEmailCandidate] = useState<Candidate | null>(null);

  // CSV State
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<any[][]>([]);
  const [csvFieldMap, setCsvFieldMap] = useState<Record<string, number>>({});
  const [isCsvPreviewOpen, setCsvPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync State
  const [isSyncPanelOpen, setSyncPanelOpen] = useState(false);
  const [gsheetUrl, setGsheetUrl] = useState("");
  const [syncStatus, setSyncStatus] = useState<React.ReactNode>(null);
  
  const [isImporting, setIsImporting] = useState(false);

  // Filter & Bulk Actions State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const filtered = candidates.filter((c) => {
    if (activeTab === "applicants" && c.status === "Approved") return false;
    if (activeTab === "applications" && c.status !== "Approved") return false;
    
    if (statusFilter && c.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !(c.email || "").toLowerCase().includes(q) && !(c.skill || "").toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filtered.map(c => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    addToast(`Updating status to ${newStatus}...`, "info");
    const res = await updateCandidateStatus(id, newStatus);
    if (res.success) {
      setCandidates(candidates.map((c) => (c.id === id ? { ...c, status: newStatus } : c)));
      addToast(`Status updated`, "success");
      
      if (newStatus === "Approved") {
        const candidate = candidates.find(c => c.id === id);
        if (candidate && candidate.email) {
          try {
            fetch("/api/send-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: candidate.email, name: candidate.name }),
            });
            addToast(`Acceptance email sent to ${candidate.email}!`, "success");
          } catch (e) {
            // silent fail
          }
        }
      }
    } else {
      addToast(`Error: ${res.error}`, "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("This will permanently delete the candidate and all associated records. This action cannot be undone.")) return;
    const res = await deleteCandidates([id]);
    if (res.success) {
      setCandidates(candidates.filter(c => c.id !== id));
      setSelectedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      addToast("Candidate deleted", "success");
    } else {
      addToast(`Error: ${res.error}`, "error");
    }
  };

  const handleRevoke = async (id: number) => {
    if (!confirm("Are you sure you want to revoke credentials?")) return;
    const res = await revokeCandidateCredentials(id);
    if (res.success) {
      setCandidates(candidates.map((c) => (c.id === id ? { ...c, resume: "" } : c)));
      addToast("Credentials revoked", "success");
    } else {
      addToast(`Error: ${res.error}`, "error");
    }
  };

  const bulkApprove = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const res = await bulkUpdateCandidateStatus(ids, "Approved");
    if (res.success) {
      setCandidates(candidates.map((c) => (ids.includes(c.id) ? { ...c, status: "Approved" } : c)));
      setSelectedIds(new Set());
      addToast(`${ids.length} candidates approved`, "success");
    } else {
      addToast(`Error: ${res.error}`, "error");
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm("This will permanently delete the candidate and all associated records. This action cannot be undone.")) return;
    const ids = Array.from(selectedIds);
    const res = await deleteCandidates(ids);
    if (res.success) {
      setCandidates(candidates.filter((c) => !ids.includes(c.id)));
      setSelectedIds(new Set());
      addToast(`${ids.length} candidates deleted`, "success");
    } else {
      addToast(`Error: ${res.error}`, "error");
    }
  };

  const statusBadge = (status: string) => {
    if (status === "Approved") return <span className="badge badge-green">Approved</span>;
    if (status === "Rejected") return <span className="badge badge-red">Rejected</span>;
    return <span className="badge badge-amber">{status}</span>;
  };

  // --- CSV Handlers ---
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isExcel = file.name.match(/\.(xlsx|xls)$/i);
    const isCsv = file.name.match(/\.csv$/i);
    if (!isExcel && !isCsv) { addToast("Select a .csv, .xlsx or .xls file", "error"); return; }

    const reader = new FileReader();
    reader.onload = (evt) => {
      let lines: any[][] = [];
      try {
        if (isExcel) {
          const wb = XLSX.read(evt.target?.result, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          lines = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false }) as any[][];
          lines = lines.filter(r => r.length > 0).map(r => r.map(c => {
            if (c === null || c === undefined) return "";
            const s = String(c).trim();
            if (/^\d+(\.\d+)?[eE][+]?\d+$/.test(s)) return String(Math.round(Number(s)));
            return s;
          }));
        } else {
          lines = _parseCsv(evt.target?.result as string);
        }
      } catch (err: any) { addToast("Could not read file: " + err.message, "error"); return; }

      if (lines.length < 2) { addToast("File is empty or has no data rows", "error"); return; }

      const headers = lines[0];
      const rows = lines.slice(1).filter(r => r.some(c => String(c).trim()));
      const fieldMap = _autoMapFields(headers);

      setCsvHeaders(headers);
      setCsvRows(rows);
      setCsvFieldMap(fieldMap);
      setCsvPreviewOpen(true);
      setSyncPanelOpen(false);
      
      const missing = CSV_FIELDS.filter(f => f.required && fieldMap[f.key] === undefined);
      if (missing.length) {
        addToast(`Verify the mapping (${missing.map(f => f.label).join(", ")} not auto-detected)`, "info");
      } else {
        addToast(`${rows.length} rows loaded. Fields auto-mapped!`, "success");
      }
    };

    if (isExcel) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
    e.target.value = "";
  };

  const importMappedData = async () => {
    if (csvFieldMap.name === undefined) { addToast("Select the Name column", "error"); return; }
    if (csvFieldMap.email === undefined) { addToast("Select the Email column", "error"); return; }

    setIsImporting(true);
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    
    const preparedCandidates = [];
    let empty = 0;
    let badEmail = 0;

    for (const row of csvRows) {
      const name = (row[csvFieldMap.name] ?? "").trim();
      const email = (row[csvFieldMap.email] ?? "").trim().toLowerCase();

      if (!name || !email) { empty++; continue; }
      if (!emailRe.test(email)) { badEmail++; continue; }

      preparedCandidates.push({
        name,
        email,
        phone: csvFieldMap.phone !== undefined ? (row[csvFieldMap.phone] ?? "").trim() : "",
        skill: csvFieldMap.skill !== undefined ? (row[csvFieldMap.skill] ?? "").trim() : "",
        college: csvFieldMap.college !== undefined ? (row[csvFieldMap.college] ?? "").trim() : "",
        state: csvFieldMap.state !== undefined ? (row[csvFieldMap.state] ?? "").trim() : "",
        edu_domain: csvFieldMap.edu_domain !== undefined ? (row[csvFieldMap.edu_domain] ?? "").trim() : "",
        duration: csvFieldMap.duration !== undefined ? (row[csvFieldMap.duration] ?? "").trim() : "",
        resume_link: csvFieldMap.resume_link !== undefined ? (row[csvFieldMap.resume_link] ?? "").trim() : "",
        status: "Pending"
      });
    }

    try {
      const res = await bulkImportCandidates(preparedCandidates);
      const parts = [`✅ ${res.imported} imported`];
      if (res.dupes) parts.push(`${res.dupes} already exist`);
      if (badEmail) parts.push(`${badEmail} invalid email skipped`);
      if (empty) parts.push(`${empty} empty rows skipped`);
      if (res.errors) parts.push(`${res.errors} errors`);
      
      addToast(parts.join(" · "), res.imported > 0 ? "success" : "error");
      
      if (res.imported > 0) {
        window.location.reload();
      }
    } catch (e: any) {
      addToast(`Import failed: ${e.message}`, "error");
    } finally {
      setIsImporting(false);
      setCsvPreviewOpen(false);
    }
  };

  // --- Google Sheet Sync Handlers ---
  const extractSheetId = (url: string) => {
    if (url.includes("/forms/d/e/")) return "";
    const sheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (sheetMatch) return sheetMatch[1];
    const directMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)(?:\/|$|\?)/);
    return directMatch ? directMatch[1] : "";
  };

  const handleFetchSheet = async () => {
    if (!gsheetUrl) { addToast("Paste a Google Sheet URL first", "error"); return; }
    
    const sheetId = extractSheetId(gsheetUrl);
    if (!sheetId) { 
      setSyncStatus(<span className="text-jj-red">❌ Invalid Google Sheets URL or it is a Forms URL.</span>);
      return; 
    }

    setSyncStatus(<span className="text-jj-accent">⏳ Fetching data...</span>);
    
    const result = await fetchGoogleSheetCsv(sheetId);
    if (!result.success || !result.data) {
      setSyncStatus(
        <div>
          <span className="text-jj-red">❌ {result.error}</span>
          <div className="mt-1 text-[12px] text-jj-text-muted">
            Make sure your Google Sheet is published publicly (File → Share → Publish to web → CSV).
          </div>
        </div>
      );
      return;
    }

    const lines = _parseCsv(result.data);
    if (lines.length < 2) {
      setSyncStatus(<span className="text-jj-red">❌ File is empty or has no data rows</span>);
      return;
    }

    const headers = lines[0];
    const rows = lines.slice(1).filter(r => r.some(c => String(c).trim()));
    const fieldMap = _autoMapFields(headers);

    setCsvHeaders(headers);
    setCsvRows(rows);
    setCsvFieldMap(fieldMap);
    setSyncStatus(null);
    setSyncPanelOpen(false);
    setCsvPreviewOpen(true);
  };

  // --- Export Handler ---
  const exportCandidates = () => {
    const list = candidates.map(c => ({
      ID: c.id,
      Name: c.name,
      Email: c.email || "",
      Phone: c.phone || "",
      Skill: c.skill || "",
      Status: c.status,
      State: c.state || "",
      College: c.college || "",
      "Edu Domain": c.eduDomain || "",
      Duration: c.duration || "",
    }));
    
    if (list.length === 0) { addToast("No candidates to export", "info"); return; }
    
    const headers = Object.keys(list[0]);
    const csvContent = [
      headers.join(","),
      ...list.map(row => headers.map(h => `"${String((row as any)[h]).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `job_jockey_candidates_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="table-card">
      <div className="table-card-header" style={{ flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <h3 id="candidateTabTitle">
            {activeTab === "applicants" ? "Applicants" : "Approved Interns"}
          </h3>
          <div style={{ display: "flex", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "3px", gap: "2px" }}>
            <button
              id="tabApplicants"
              onClick={() => setActiveTab("applicants")}
              style={{
                padding: "5px 14px",
                borderRadius: "6px",
                border: "none",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all .2s",
                background: activeTab === "applicants" ? "var(--accent)" : "transparent",
                color: activeTab === "applicants" ? "#000" : "var(--text-muted)"
              }}
            >
              📋 Applicants
            </button>
            <button
              id="tabApplications"
              onClick={() => setActiveTab("applications")}
              style={{
                padding: "5px 14px",
                borderRadius: "6px",
                border: "none",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all .2s",
                background: activeTab === "applications" ? "var(--accent)" : "transparent",
                color: activeTab === "applications" ? "#000" : "var(--text-muted)"
              }}
            >
              ✅ Approved
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <button 
            onClick={() => setAddModalOpen(true)}
            className="btn-sm btn-accent"
            style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            + Add Candidate
          </button>
          
          <label style={{ cursor: "pointer" }} title="Upload CSV file">
            <span className="btn-sm btn-outline" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              📁 Upload CSV / Excel
            </span>
            <input 
              type="file" 
              accept=".csv,.xlsx,.xls" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleCsvUpload} 
            />
          </label>

          <button 
            onClick={() => { setSyncPanelOpen(!isSyncPanelOpen); setCsvPreviewOpen(false); }}
            className="btn-sm btn-outline"
            style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            🔗 Google Form Sync
          </button>

          <button 
            onClick={exportCandidates}
            className="btn-sm btn-outline"
            style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            ↓ Export CSV
          </button>
        </div>
      </div>

      {isSyncPanelOpen && (
        <div id="syncPanel" style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "rgba(245,158,11,0.04)" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-soft)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 6 }}>
                Google Sheet CSV URL
              </label>
              <input
                id="gsheetUrl"
                className="search-input"
                style={{ width: "100%", padding: "9px 13px", fontSize: 13 }}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                type="text"
                value={gsheetUrl}
                onChange={(e) => setGsheetUrl(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button className="btn-sm btn-accent" onClick={handleFetchSheet}>🔄 Fetch & Import</button>
            </div>
          </div>
          <div className="text-[12px] text-jj-text-muted">
            💡 <strong>How:</strong> Google Sheets → File → Share → Publish to web → Select sheet → CSV → Publish → Copy link
          </div>
          {syncStatus && <div className="mt-2 text-[13px]">{syncStatus}</div>}
        </div>
      )}

      {isCsvPreviewOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(3px)",
        }}>
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "20px",
            width: "95vw",
            maxWidth: "1600px",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 24px 64px rgba(0,0,0,.5)",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}>
            <div className="flex items-center justify-between">
              <h3 className="modal-title" style={{ fontSize: "15px", fontWeight: "bold", margin: 0 }}>📁 Map Columns → Portal Fields</h3>
              <div className="table-panel-meta text-xs text-jj-text-muted">{csvRows.length} rows · {csvHeaders.length} columns</div>
            </div>
            
            <div style={{
              display: "grid",
              gap: "14px",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              width: "100%",
            }}>
              {CSV_FIELDS.map(f => {
                const mappedIndex = csvFieldMap[f.key];
                const isMapped = mappedIndex !== undefined;
                return (
                  <div key={f.key} style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    width: "100%",
                  }}>
                    <label style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      whiteSpace: "nowrap",
                    }}>
                      <span>{isMapped ? (f.required ? "🟢" : "🟡") : "⚪"}</span>
                      <span>{f.icon}</span>
                      <strong style={{ color: "var(--text-soft)" }}>{f.label}</strong>
                      {f.required && <span style={{ fontSize: "12px", color: "var(--red)" }}>*</span>}
                    </label>
                    <select
                      value={mappedIndex !== undefined ? mappedIndex : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCsvFieldMap(prev => {
                          const next = { ...prev };
                          if (val === "") delete next[f.key];
                          else next[f.key] = parseInt(val);
                          return next;
                        });
                      }}
                      style={{
                        width: "100%",
                        minHeight: "38px",
                        borderRadius: "8px",
                        padding: "0 10px",
                        boxSizing: "border-box",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                        fontSize: "12.5px",
                        outline: "none",
                      }}
                    >
                      {!f.required && <option value="">— Skip this field —</option>}
                      {csvHeaders.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

            <div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-soft)", marginBottom: "6px" }}>Preview (first 5 rows):</div>
              <div style={{
                width: "100%",
                overflowX: "auto",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                maxHeight: "180px",
              }}>
                <table className="table-compact" style={{
                  width: "100%",
                  tableLayout: "auto",
                  borderCollapse: "collapse",
                }}>
                  <thead>
                    <tr>
                      <th className="whitespace-nowrap bg-white/5 text-left text-jj-text-muted">⚠️</th>
                      {CSV_FIELDS.map(f => csvFieldMap[f.key] !== undefined && (
                        <th key={f.key} className="whitespace-nowrap bg-white/5 text-left text-jj-text-muted">{f.icon} {f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(0, 5).map((row, rIdx) => {
                      const nameIdx = csvFieldMap.name;
                      const emailIdx = csvFieldMap.email;
                      const name = nameIdx !== undefined ? (row[nameIdx] ?? "").trim() : "";
                      const email = emailIdx !== undefined ? (row[emailIdx] ?? "").trim() : "";
                      const invalid = !name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
                      
                      return (
                        <tr key={rIdx} className={invalid ? "bg-jj-red/10" : ""}>
                          <td className="whitespace-nowrap border-t border-jj-border text-[11px]">
                            {invalid ? <span className="text-jj-red" title="Invalid/missing name or email">⚠️</span> : <span className="text-jj-green">✅</span>}
                          </td>
                          {CSV_FIELDS.map(f => {
                            const colIdx = csvFieldMap[f.key];
                            if (colIdx === undefined) return null;
                            return (
                              <td key={f.key} className="max-w-[160px] truncate whitespace-nowrap border-t border-jj-border">
                                {row[colIdx] || "—"}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button 
                onClick={importMappedData}
                disabled={isImporting}
                className="btn-sm btn-accent px-4 py-2 text-[12.5px] font-bold disabled:opacity-50"
              >
                {isImporting ? "⏳ Importing..." : "✓ Import"}
              </button>
              <button 
                onClick={() => addToast("Preview refreshed", "success")}
                className="btn-sm btn-outline px-4 py-2 text-[12.5px] font-bold"
              >
                🔄 Refresh Preview
              </button>
              <button 
                onClick={() => setCsvPreviewOpen(false)}
                className="btn-sm btn-outline px-4 py-2 text-[12.5px] font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
          <input 
            type="checkbox" 
            checked={selectedIds.size > 0 && selectedIds.size === filtered.length}
            onChange={(e) => toggleSelectAll(e.target.checked)}
            style={{ accentColor: "var(--accent)" }}
          /> 
          Select All
        </label>
        <button onClick={bulkApprove} className="action-btn action-approve">
          Approve Selected
        </button>
        <button onClick={bulkDelete} className="action-btn action-reject">
          Delete Selected
        </button>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{selectedIds.size} selected</span>
      </div>

      {/* Search & Filter */}
      <div className="table-tools">
        <input 
          type="text" 
          placeholder="🔍 Search candidates..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="filter-select"
          id="candidateStatusFilter"
        >
          <option value="">All</option>
          <option value="Pending">Pending</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {/* Candidates Table (Full Columns) */}
      <div className="table-scroll">
        <table style={{ minWidth: "1200px" }}>
          <thead>
            <tr>
              <th style={{ width: 30 }}></th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Skills</th>
              <th>Status</th>
              <th>State</th>
              <th>College/University</th>
              <th>Domain</th>
              <th>Duration</th>
              <th>Resume</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="candidateBody">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>
                  No {activeTab} found — use Google Form Sync or Upload CSV above!
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} id={`crow_${c.id}`}>
                  <td>
                    <input 
                      type="checkbox" 
                      style={{ accentColor: "var(--accent)" }}
                      checked={selectedIds.has(c.id)}
                      onChange={() => toggleSelect(c.id)}
                    />
                  </td>
                  <td><strong>{c.name}</strong></td>
                  <td style={{ fontSize: 12 }}>{c.email || "—"}</td>
                  <td>{c.phone || "—"}</td>
                  <td>{c.skill || "—"}</td>
                  <td>{statusBadge(c.status)}</td>
                  <td>{c.state || "—"}</td>
                  <td style={{ maxWidth: 140, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={c.college || ""}>
                    {c.college || "—"}
                  </td>
                  <td>{c.eduDomain || "—"}</td>
                  <td>{c.duration || "—"}</td>
                  <td>
                    {c.resumeLink ? (
                      <a href={c.resumeLink} target="_blank" style={{ color: "var(--accent)", fontSize: 12 }}>View</a>
                    ) : c.resume && !c.resume.startsWith("LOGIN:") ? (
                      <a href={c.resume} target="_blank" style={{ color: "var(--accent)", fontSize: 12 }}>View</a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {c.status === "Pending" && (
                        <>
                          <button onClick={() => handleUpdateStatus(c.id, "Approved")} className="action-btn action-approve" title="Approve">✓</button>
                          <button onClick={() => handleUpdateStatus(c.id, "Rejected")} className="action-btn action-reject" title="Reject">✗</button>
                        </>
                      )}
                      {c.status === "Approved" && (
                        <button onClick={() => router.push(`/dashboard/tasks?assignTo=${encodeURIComponent(c.email || "")}`)} className="action-btn action-edit" title="Assign Task">📋</button>
                      )}
                      <button onClick={() => setEditCandidate(c)} className="action-btn action-edit" title="Edit Info">✏️</button>
                      <button onClick={() => setEmailCandidate(c)} className="action-btn action-edit" title="Send Email">📧</button>
                      {c.status === "Approved" && c.resume && c.resume.startsWith("LOGIN:") && (
                        <button onClick={() => handleRevoke(c.id)} className="action-btn action-reject" style={{ background: "rgba(139,92,246,0.15)", color: "#c084fc" }} title="Revoke Credentials">🔒 Revoke</button>
                      )}
                      <button onClick={() => handleDelete(c.id)} className="action-btn action-reject" title="Delete">🗑</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddCandidateModal 
        isOpen={isAddModalOpen} 
        onClose={() => setAddModalOpen(false)} 
        onAdd={(newCandidate: any) => setCandidates([...candidates, newCandidate])} 
      />
      
      <EditCandidateModal
        isOpen={!!editCandidate}
        onClose={() => setEditCandidate(null)}
        candidate={editCandidate as any}
        onUpdate={(updated) => {
          setCandidates(candidates.map(c => c.id === updated.id ? { ...c, ...updated } : c));
        }}
      />
      
      <SendEmailModal
        isOpen={!!emailCandidate}
        onClose={() => setEmailCandidate(null)}
        candidate={emailCandidate}
      />
    </div>
  );
}
