"use client";

import { useState, useRef } from "react";
import { useUIStore } from "@/hooks/useUIStore";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AddTutorModal, TutorFormData } from "./AddTutorModal";
import { EditTutorModal } from "./EditTutorModal";
import { SendTutorEmailModal } from "./SendTutorEmailModal";
import * as XLSX from "xlsx";
import { Check, X as XIcon, Clipboard, Pencil, Mail, Trash2, Eye } from "lucide-react";
import { 
  bulkImportTutors,
  updateTutorStatus,
  bulkUpdateTutorStatus,
  deleteTutors
} from "@/app/actions/tutors";
import { fetchGoogleSheetCsv } from "@/app/actions/candidates";

const CSV_FIELDS = [
  { key: "name", label: "Name (Full Name)", icon: "👤", required: true },
  { key: "email", label: "Email Address", icon: "📧", required: true },
  { key: "phone", label: "Phone Number", icon: "📱", required: false },
  { key: "subject", label: "Subject", icon: "📚", required: false },
  { key: "experience", label: "Teaching Experience", icon: "⚡", required: false },
  { key: "qualification", label: "Highest Qualification", icon: "🎓", required: false },
  { key: "mode", label: "Teaching Mode (Online/Offline/Hybrid)", icon: "⏱", required: false },
  { key: "location", label: "Location", icon: "📍", required: false }
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
    else if ((h.includes("subject") || h.includes("course") || h.includes("topic")) && map.subject === undefined) map.subject = i;
    else if ((h.includes("experience") || h.includes("years")) && map.experience === undefined) map.experience = i;
    else if ((h.includes("qualification") || h.includes("degree") || h.includes("education")) && map.qualification === undefined) map.qualification = i;
    else if ((h.includes("mode") || h.includes("teachingmode")) && map.mode === undefined) map.mode = i;
    else if ((h.includes("location") || h.includes("city") || h.includes("state")) && map.location === undefined) map.location = i;
  }
  return map;
}

export function TutorsTable({ initialTutors }: { initialTutors: TutorFormData[] }) {
  const router = useRouter();
  const { addToast } = useUIStore();
  const { data: session } = useSession();
  const [tutors, setTutors] = useState(initialTutors);
  const [activeTab, setActiveTab] = useState<"applicants" | "applications">("applicants");
  
  // Modals state
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [editTutor, setEditTutor] = useState<TutorFormData | null>(null);
  const [emailTutor, setEmailTutor] = useState<TutorFormData | null>(null);

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
  const [subjectFilter, setSubjectFilter] = useState("");
  const [experienceFilter, setExperienceFilter] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Permissions Check
  const role = (session?.user as any)?.role || "intern";
  const permissions = (session?.user as any)?.permissions || "";
  const hasPerm = (key: string) => role === "admin" || permissions.split(",").map((p: string) => p.trim()).includes(key);

  const filtered = tutors.filter((t) => {
    if (activeTab === "applicants" && t.status === "Onboarded") return false;
    if (activeTab === "applications" && t.status !== "Onboarded") return false;

    if (statusFilter && t.status !== statusFilter) return false;
    if (subjectFilter && !t.subject.toLowerCase().includes(subjectFilter.toLowerCase())) return false;
    if (experienceFilter && !t.experience.toLowerCase().includes(experienceFilter.toLowerCase())) return false;
    if (modeFilter && t.mode !== modeFilter) return false;
    if (locationFilter && !t.location.toLowerCase().includes(locationFilter.toLowerCase())) return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !t.name.toLowerCase().includes(q) && 
        !(t.email || "").toLowerCase().includes(q) && 
        !t.subject.toLowerCase().includes(q) &&
        !t.qualification.toLowerCase().includes(q) &&
        !t.location.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filtered.map(t => t.id)));
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
    if (!hasPerm("manage_tutor_interviews")) {
      addToast("You don't have permission to update tutor status", "error");
      return;
    }
    addToast(`Updating status to ${newStatus}...`, "info");
    const res = await updateTutorStatus(id, newStatus);
    if (res.success) {
      setTutors(tutors.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
      addToast(`Status updated`, "success");
    } else {
      addToast(`Error: ${res.error}`, "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!hasPerm("delete_tutors")) {
      addToast("You don't have permission to delete tutors", "error");
      return;
    }
    if (!confirm("This will permanently delete the tutor record. This action cannot be undone.")) return;
    const res = await deleteTutors([id]);
    if (res.success) {
      setTutors(tutors.filter(t => t.id !== id));
      setSelectedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      addToast("Tutor deleted", "success");
    } else {
      addToast(`Error: ${res.error}`, "error");
    }
  };

  const bulkStatusUpdate = async (status: string) => {
    if (!hasPerm("manage_tutor_interviews")) {
      addToast("You don't have permission to manage status", "error");
      return;
    }
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    addToast("Updating statuses...", "info");
    const res = await bulkUpdateTutorStatus(ids, status);
    if (res.success) {
      setTutors(tutors.map((t) => (ids.includes(t.id) ? { ...t, status } : t)));
      setSelectedIds(new Set());
      addToast(`${ids.length} tutors status updated to ${status}`, "success");
    } else {
      addToast(`Error: ${res.error}`, "error");
    }
  };

  const bulkDelete = async () => {
    if (!hasPerm("delete_tutors")) {
      addToast("You don't have permission to delete tutors", "error");
      return;
    }
    if (selectedIds.size === 0) return;
    if (!confirm("This will permanently delete the selected tutor records. This action cannot be undone.")) return;
    const ids = Array.from(selectedIds);
    const res = await deleteTutors(ids);
    if (res.success) {
      setTutors(tutors.filter((t) => !ids.includes(t.id)));
      setSelectedIds(new Set());
      addToast(`${ids.length} tutors deleted`, "success");
    } else {
      addToast(`Error: ${res.error}`, "error");
    }
  };

  const statusBadge = (status: string) => {
    if (status === "Onboarded") return <span className="badge badge-green">{status}</span>;
    if (status === "Rejected") return <span className="badge badge-red">{status}</span>;
    if (status === "Inactive") return <span className="badge badge-gray">{status}</span>;
    return <span className="badge badge-amber">{status}</span>;
  };

  // --- CSV Handlers ---
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasPerm("import_tutors")) {
      addToast("You don't have permission to import tutors", "error");
      return;
    }
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
    
    const preparedTutors = [];
    let empty = 0;
    let badEmail = 0;

    for (const row of csvRows) {
      const name = (row[csvFieldMap.name] ?? "").trim();
      const email = (row[csvFieldMap.email] ?? "").trim().toLowerCase();

      if (!name || !email) { empty++; continue; }
      if (!emailRe.test(email)) { badEmail++; continue; }

      preparedTutors.push({
        name,
        email,
        phone: csvFieldMap.phone !== undefined ? (row[csvFieldMap.phone] ?? "").trim() : "",
        subject: csvFieldMap.subject !== undefined ? (row[csvFieldMap.subject] ?? "").trim() : "",
        experience: csvFieldMap.experience !== undefined ? (row[csvFieldMap.experience] ?? "").trim() : "",
        qualification: csvFieldMap.qualification !== undefined ? (row[csvFieldMap.qualification] ?? "").trim() : "",
        mode: csvFieldMap.mode !== undefined ? (row[csvFieldMap.mode] ?? "Online").trim() : "Online",
        location: csvFieldMap.location !== undefined ? (row[csvFieldMap.location] ?? "").trim() : "",
        status: "Applied"
      });
    }

    try {
      const res = await bulkImportTutors(preparedTutors);
      const parts = [`✅ ${res.imported} imported`];
      if (res.dupes) parts.push(`${res.dupes} already exist`);
      if (badEmail) parts.push(`${badEmail} invalid email skipped`);
      if (empty) parts.push(`${empty} empty rows skipped`);
      if (res.errors) parts.push(`${res.errors} errors`);
      
      addToast(parts.join(" · "), res.imported > 0 ? "success" : "error");
      
      if (res.imported > 0) {
        router.refresh();
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
  const exportTutors = () => {
    const list = tutors.map(t => ({
      ID: t.id,
      Name: t.name,
      Email: t.email || "",
      Phone: t.phone || "",
      Subject: t.subject || "",
      Experience: t.experience || "",
      Qualification: t.qualification || "",
      Mode: t.mode,
      Location: t.location || "",
      Status: t.status,
    }));
    
    if (list.length === 0) { addToast("No tutors to export", "info"); return; }
    
    const headers = Object.keys(list[0]);
    const csvContent = [
      headers.join(","),
      ...list.map(row => headers.map(h => `"${String((row as any)[h]).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `job_jockey_tutors_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="table-card">
      <div className="table-card-header" style={{ flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <h3 id="tutorsTabTitle">
            {activeTab === "applicants" ? "Tutor Applicants" : "Onboarded Tutors"}
          </h3>
          <div style={{ display: "flex", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "3px", gap: "2px" }}>
            <button
              id="tabApplicants"
              onClick={() => { setActiveTab("applicants"); setStatusFilter(""); }}
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
              onClick={() => { setActiveTab("applications"); setStatusFilter(""); }}
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
              ✅ Onboarded
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {hasPerm("create_tutors") && (
            <button 
              onClick={() => setAddModalOpen(true)}
              className="btn-sm btn-accent"
              style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
            >
              + Add Tutor
            </button>
          )}
          
          {hasPerm("import_tutors") && (
            <>
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
                🔗 Google Sheets Sync
              </button>
            </>
          )}

          <button 
            onClick={exportTutors}
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
              <h3 className="modal-title" style={{ fontSize: "15px", fontWeight: "bold", margin: 0 }}>📁 Map Columns → Tutors Fields</h3>
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
        
        {hasPerm("manage_tutor_interviews") && (
          <>
            <button onClick={() => bulkStatusUpdate("Onboarded")} className="action-btn action-approve" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
              Onboard Selected
            </button>
          </>
        )}
        
        {hasPerm("delete_tutors") && (
          <button onClick={bulkDelete} className="action-btn action-reject">
            Delete Selected
          </button>
        )}
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{selectedIds.size} selected</span>
      </div>

      {/* Complex Filters & Search */}
      <div className="table-tools" style={{ flexWrap: "wrap", gap: "10px" }}>
        <input 
          type="text" 
          placeholder="🔍 Search name, email, subject, location..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
          style={{ flex: "1 1 200px" }}
        />
        
        {activeTab === "applicants" && (
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Statuses</option>
            <option value="Applied">Applied</option>
            <option value="Rejected">Rejected</option>
            <option value="Inactive">Inactive</option>
          </select>
        )}

        <select 
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
          className="filter-select"
        >
          <option value="">All Modes</option>
          <option value="Online">Online</option>
          <option value="Offline">Offline</option>
          <option value="Hybrid">Hybrid</option>
        </select>

        <input 
          type="text" 
          placeholder="Filter by Subject..." 
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="search-input !py-1 !px-2"
          style={{ flex: "0 1 140px", fontSize: "12.5px" }}
        />

        <input 
          type="text" 
          placeholder="Filter by Exp..." 
          value={experienceFilter}
          onChange={(e) => setExperienceFilter(e.target.value)}
          className="search-input !py-1 !px-2"
          style={{ flex: "0 1 120px", fontSize: "12.5px" }}
        />

        <input 
          type="text" 
          placeholder="Filter by Location..." 
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="search-input !py-1 !px-2"
          style={{ flex: "0 1 140px", fontSize: "12.5px" }}
        />
      </div>

      {/* Tutors Table */}
      <div className="table-scroll">
        <table style={{ minWidth: "1100px" }}>
          <thead>
            <tr>
              <th style={{ width: 30 }}></th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Subject</th>
              <th>Experience</th>
              <th>Mode</th>
              <th>Location</th>
              <th>Status</th>
              <th style={{ minWidth: "180px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>
                  No {activeTab === "applicants" ? "applicants" : "onboarded tutors"} found — click Add Tutor or Upload CSV to start!
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id}>
                  <td>
                    <input 
                      type="checkbox" 
                      style={{ accentColor: "var(--accent)" }}
                      checked={selectedIds.has(t.id)}
                      onChange={() => toggleSelect(t.id)}
                    />
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {t.profilePhoto ? (
                        <img 
                          src={t.profilePhoto} 
                          alt={t.name}
                          style={{ width: "26px", height: "26px", borderRadius: "50%", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "50%",
                          background: "var(--surface2)",
                          border: "1px solid var(--border)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "10px",
                          fontWeight: "bold",
                          color: "var(--text-soft)"
                        }}>
                          {t.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <strong>{t.name}</strong>
                    </div>
                  </td>
                  <td style={{ fontSize: 12 }}>{t.email || "—"}</td>
                  <td>{t.phone || "—"}</td>
                  <td>{t.subject || "—"}</td>
                  <td>{t.experience || "—"}</td>
                  <td>{t.mode}</td>
                  <td>{t.location || "—"}</td>
                  <td>{statusBadge(t.status)}</td>
                  <td>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <button
                        onClick={() => router.push(`/dashboard/tutors/${t.id}`)}
                        className="action-btn action-edit flex items-center justify-center"
                        style={{ width: "28px", height: "28px", padding: 0, borderRadius: "6px" }}
                        title="View Profile Details & Pipeline"
                      >
                        <Eye size={12} className="stroke-[2.5]" />
                      </button>

                      {hasPerm("manage_tutor_interviews") && t.status === "Applied" && (
                        <button
                          onClick={() => handleUpdateStatus(t.id, "Onboarded")}
                          className="action-btn action-approve flex items-center justify-center"
                          style={{ width: "28px", height: "28px", padding: 0, borderRadius: "6px" }}
                          title="Onboard Tutor"
                        >
                          <Check size={12} className="stroke-[2.5]" />
                        </button>
                      )}

                      {hasPerm("edit_tutors") && (
                        <button
                          onClick={() => setEditTutor(t)}
                          className="action-btn action-edit flex items-center justify-center"
                          style={{ width: "28px", height: "28px", padding: 0, borderRadius: "6px" }}
                          title="Edit Profile"
                        >
                          <Pencil size={12} className="stroke-[2.5]" />
                        </button>
                      )}

                      {t.email && (
                        <button
                          onClick={() => setEmailTutor(t)}
                          className="action-btn action-edit flex items-center justify-center"
                          style={{ width: "28px", height: "28px", padding: 0, borderRadius: "6px" }}
                          title="Send Email"
                        >
                          <Mail size={12} className="stroke-[2.5]" />
                        </button>
                      )}

                      {hasPerm("delete_tutors") && (
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="action-btn action-reject flex items-center justify-center"
                          style={{ width: "28px", height: "28px", padding: 0, borderRadius: "6px" }}
                          title="Delete Record"
                        >
                          <Trash2 size={12} className="stroke-[2.5]" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {/* Spacer to prevent scrollbar overlap */}
        <div style={{ height: "64px" }} />
      </div>

      <AddTutorModal 
        isOpen={isAddModalOpen} 
        onClose={() => setAddModalOpen(false)} 
        onAdd={(newTutor: any) => setTutors([...tutors, newTutor])} 
      />
      
      <EditTutorModal
        isOpen={!!editTutor}
        onClose={() => setEditTutor(null)}
        tutor={editTutor}
        onUpdate={(updated) => {
          setTutors(tutors.map(t => t.id === updated.id ? { ...t, ...updated } : t));
        }}
      />
      
      <SendTutorEmailModal
        isOpen={!!emailTutor}
        onClose={() => setEmailTutor(null)}
        tutor={emailTutor}
      />
    </div>
  );
}
