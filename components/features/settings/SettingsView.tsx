"use client";

import { useState } from "react";
import { useUIStore } from "@/hooks/useUIStore";
import { updateCandidateInfo, saveEmailConfig, changePassword, sendCustomEmail, sendTestEmailAction } from "@/app/actions/settings";

interface CandidateInfo {
  phone: string;
  skill: string;
  state: string;
  college: string;
  edu_domain: string;
  resume_link: string;
  name?: string;
  email?: string;
}

interface EmailConfig {
  resendKey: string;
}

export function SettingsView({
  userRole,
  userEmail,
  userName,
  candidateInfo,
  emailConfig,
}: {
  userRole: string;
  userEmail: string;
  userName: string;
  candidateInfo: CandidateInfo | null;
  emailConfig: EmailConfig;
}) {
  const { addToast } = useUIStore();
  const isIntern = userRole === "intern" || userRole === "tutor";
  const isSuperAdmin = userRole === "super_admin";
  const isAdmin = userRole === "admin";

  const defaultTab = isIntern ? "editinfo" : isSuperAdmin ? "password" : "email";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loading, setLoading] = useState(false);

  // Edit Info State
  const [info, setInfo] = useState<CandidateInfo>(candidateInfo || {
    phone: "", skill: "", state: "", college: "", edu_domain: "", resume_link: ""
  });

  // Password State
  const [cpCurrent, setCpCurrent] = useState("");
  const [cpNew, setCpNew] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");

  // Email State
  const [resendKey, setResendKey] = useState(emailConfig.resendKey);

  // Email Test State
  const [mailTo, setMailTo] = useState("");
  const [mailName, setMailName] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");

  const handleSaveInfo = async () => {
    setLoading(true);
    const res = await updateCandidateInfo(userEmail, info);
    setLoading(false);
    if (res.success) {
      addToast("Profile updated!", "success");
    } else {
      addToast("Failed to update profile", "error");
    }
  };

  const handleSaveEmail = async () => {
    setLoading(true);
    const res = await saveEmailConfig(resendKey);
    setLoading(false);
    if (res.success) {
      addToast("Config saved!", "success");
    } else {
      addToast("Failed to save config", "error");
    }
  };

  const handleChangePassword = async () => {
    if (!cpCurrent || !cpNew || !cpConfirm) {
      return addToast("Please fill all fields", "error");
    }
    if (cpNew.length < 4) {
      return addToast("New password must be at least 4 characters", "error");
    }
    if (cpNew !== cpConfirm) {
      return addToast("Passwords do not match", "error");
    }
    setLoading(true);
    const res = await changePassword(userEmail, cpCurrent, cpNew);
    setLoading(false);
    if (res.success) {
      addToast("Password changed successfully", "success");
      setCpCurrent("");
      setCpNew("");
      setCpConfirm("");
    } else {
      addToast(res.error || "Failed to change password", "error");
    }
  };

  const sendTestEmail = async () => {
    setLoading(true);
    const res = await sendTestEmailAction();
    setLoading(false);
    if (res.success) {
      addToast(`Test email sent to ${res.to}!`, "success");
    } else {
      addToast(res.error || "Test email failed", "error");
    }
  };

  const handleSendCustomEmail = async () => {
    if (!mailTo) return addToast("Recipient email is required", "error");
    if (!mailSubject) return addToast("Subject is required", "error");
    if (!mailBody) return addToast("Message is required", "error");

    setLoading(true);
    const res = await sendCustomEmail({
      toEmail: mailTo,
      toName: mailName,
      subject: mailSubject,
      message: mailBody,
    });
    setLoading(false);

    if (res.success) {
      addToast(`Email sent successfully!`, "success");
      setMailTo("");
      setMailName("");
      setMailSubject("");
      setMailBody("");
    } else {
      addToast(res.error || "Failed to send email", "error");
    }
  };

  const useTemplate = (type: string) => {
    switch (type) {
      case "welcome":
        setMailSubject("🎉 Welcome to the Team!");
        setMailBody(`Hi ${mailName || "Candidate"},\n\nWelcome aboard! We are thrilled to have you with us.\n\nBest,\nAdmin`);
        break;
      case "interview":
        setMailSubject("📅 Interview Invitation");
        setMailBody(`Hi ${mailName || "Candidate"},\n\nWe would like to invite you for an interview.\n\nBest,\nAdmin`);
        break;
      case "followup":
        setMailSubject("🔔 Application Follow Up");
        setMailBody(`Hi ${mailName || "Candidate"},\n\nWe are following up on your recent application.\n\nBest,\nAdmin`);
        break;
      case "reject":
        setMailSubject("❌ Application Status");
        setMailBody(`Hi ${mailName || "Candidate"},\n\nThank you for applying. Unfortunately, we are moving forward with other candidates.\n\nBest,\nAdmin`);
        break;
    }
  };

  return (
    <div className="page-stack">
      {!isSuperAdmin && (
        <div className="flex items-center w-full max-w-[320px] h-[46px] rounded-[12px] border border-jj-border bg-jj-surface2 p-1 mb-4 shadow-md overflow-hidden gap-1.5">
          {isIntern ? (
            <>
              <button
                onClick={() => setActiveTab("editinfo")}
                className={`flex-1 h-full flex items-center justify-center gap-2 rounded-[8px] text-sm font-bold transition-all border-none outline-none cursor-pointer ${
                  activeTab === "editinfo" ? "bg-jj-accent text-black shadow-sm" : "text-jj-text-soft hover:bg-jj-surface hover:text-jj-text"
                }`}
              >
                <span className="text-[16px] flex-shrink-0 w-4 h-4 flex items-center justify-center">📝</span>
                <span className="whitespace-nowrap">Edit Info</span>
              </button>
              <button
                onClick={() => setActiveTab("password")}
                className={`flex-1 h-full flex items-center justify-center gap-2 rounded-[8px] text-sm font-bold transition-all border-none outline-none cursor-pointer ${
                  activeTab === "password" ? "bg-jj-accent text-black shadow-sm" : "text-jj-text-soft hover:bg-jj-surface hover:text-jj-text"
                }`}
              >
                <span className="text-[16px] flex-shrink-0 w-4 h-4 flex items-center justify-center">🔑</span>
                <span className="whitespace-nowrap">Password</span>
              </button>
            </>
          ) : isAdmin ? (
            <>
              <button
                onClick={() => setActiveTab("email")}
                className={`flex-1 h-full flex items-center justify-center gap-2 rounded-[8px] text-sm font-bold transition-all border-none outline-none cursor-pointer ${
                  activeTab === "email" ? "bg-jj-accent text-black shadow-sm" : "text-jj-text-soft hover:bg-jj-surface hover:text-jj-text"
                }`}
              >
                <span className="text-[16px] flex-shrink-0 w-4 h-4 flex items-center justify-center">📧</span>
                <span className="whitespace-nowrap">Email</span>
              </button>
              <button
                onClick={() => setActiveTab("password")}
                className={`flex-1 h-full flex items-center justify-center gap-2 rounded-[8px] text-sm font-bold transition-all border-none outline-none cursor-pointer ${
                  activeTab === "password" ? "bg-jj-accent text-black shadow-sm" : "text-jj-text-soft hover:bg-jj-surface hover:text-jj-text"
                }`}
              >
                <span className="text-[16px] flex-shrink-0 w-4 h-4 flex items-center justify-center">🔑</span>
                <span className="whitespace-nowrap">Password</span>
              </button>
            </>
          ) : null}
        </div>
      )}

      {/* EDIT INFO TAB */}
      {activeTab === "editinfo" && (
        <div className="table-shell settings-card">
          <div className="surface-header !py-4 !px-6 border-b border-jj-border">
            <h3 className="surface-title text-[15px] flex items-center gap-2">📝 My Profile Info</h3>
          </div>
          <div className="settings-card-body !p-6 !gap-6">
            <div className="settings-note border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.08)] !p-4 !text-[13.5px]">
              Logged in as <strong className="text-jj-accent">{userName}</strong> · <span className="text-jj-text-soft">{userEmail}</span>
            </div>
            
            <div className="settings-grid !gap-6">
              <div className="field-stack">
                <label className="field-label mb-1">Phone</label>
                <input
                  type="text"
                  value={info.phone}
                  onChange={(e) => setInfo({ ...info, phone: e.target.value })}
                  placeholder="9876543210"
                  className="field-input !px-4 !py-2.5 text-[14px]"
                />
              </div>
              <div className="field-stack">
                <label className="field-label mb-1">Skills / Domain</label>
                <input
                  type="text"
                  value={info.skill}
                  onChange={(e) => setInfo({ ...info, skill: e.target.value })}
                  placeholder="e.g. React JS, Python"
                  className="field-input !px-4 !py-2.5 text-[14px]"
                />
              </div>
            </div>

            <div className="settings-grid !gap-6">
              <div className="field-stack">
                <label className="field-label mb-1">State</label>
                <input
                  type="text"
                  value={info.state}
                  onChange={(e) => setInfo({ ...info, state: e.target.value })}
                  placeholder="e.g. Maharashtra"
                  className="field-input !px-4 !py-2.5 text-[14px]"
                />
              </div>
              <div className="field-stack">
                <label className="field-label mb-1">College / University</label>
                <input
                  type="text"
                  value={info.college}
                  onChange={(e) => setInfo({ ...info, college: e.target.value })}
                  placeholder="e.g. MIT Pune"
                  className="field-input !px-4 !py-2.5 text-[14px]"
                />
              </div>
            </div>

            <div className="field-stack">
              <label className="field-label mb-1">Education Domain</label>
              <input
                type="text"
                value={info.edu_domain}
                onChange={(e) => setInfo({ ...info, edu_domain: e.target.value })}
                placeholder="e.g. Computer Science"
                className="field-input !px-4 !py-2.5 text-[14px]"
              />
            </div>

            <div className="field-stack">
              <label className="field-label mb-1">
                📄 Resume Link <span className="text-[11px] font-normal text-jj-text-muted">(PDF, Google Drive, GitHub, etc.)</span>
              </label>
              <input
                type="url"
                value={info.resume_link}
                onChange={(e) => setInfo({ ...info, resume_link: e.target.value })}
                placeholder="https://drive.google.com/file/d/..."
                className="field-input !px-4 !py-2.5 text-[14px]"
              />
              {info.resume_link && (
                <a href={info.resume_link} target="_blank" rel="noreferrer" className="mt-1 text-[12px] text-jj-accent no-underline hover:underline">
                  🔗 View Current Resume →
                </a>
              )}
            </div>

            <button
              onClick={handleSaveInfo}
              disabled={loading}
              className="btn-sm btn-accent mt-2 w-fit px-8 py-2.5 text-[14px] font-bold disabled:opacity-70 rounded-[10px] transition-transform hover:scale-[1.02]"
            >
              {loading ? "⏳ Saving..." : "💾 Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* EMAIL TAB */}
      {activeTab === "email" && (
        <div className="flex flex-col gap-6">
          <div className="table-shell settings-card">
            <div className="surface-header !py-4 !px-6 border-b border-jj-border">
              <h3 className="surface-title text-[15px] flex items-center gap-2">📧 Email Setup (Resend)</h3>
            </div>
            <div className="settings-card-body !p-6 !gap-6">
              <div className="settings-note border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.08)] leading-[1.8] text-jj-text-soft !p-4 !text-[13.5px]">
                <strong className="text-jj-accent">📬 Resend API Setup</strong><br />
                1. Sign up at <strong>resend.com</strong><br />
                2. Go to <strong>API Keys</strong> and create a new key<br />
                3. Paste the key below (starts with <code>re_</code>)<br />
                4. Verify your sending domain or use <code>onboarding@resend.dev</code> for testing
              </div>
              
              <div className="field-stack">
                <label className="field-label mb-1">Resend API Key</label>
                <input
                  type="password"
                  value={resendKey}
                  onChange={(e) => setResendKey(e.target.value)}
                  placeholder="re_xxxxxxxxxxxxxxxxxxxx"
                  className="field-input !px-4 !py-2.5 text-[14px]"
                />
              </div>

              <div className="settings-actions justify-start mt-2">
                <button
                  onClick={handleSaveEmail}
                  disabled={loading}
                  className="btn-sm btn-accent px-6 py-2.5 text-[14px] font-bold disabled:opacity-70 rounded-[10px] transition-transform hover:scale-[1.02]"
                >
                  💾 Save Config
                </button>
                <button
                  onClick={sendTestEmail}
                  className="btn-sm btn-outline px-6 py-2.5 text-[14px] font-bold rounded-[10px]"
                >
                  📤 Send Test Email
                </button>
              </div>
            </div>
          </div>

          <div className="table-shell settings-card">
            <div className="surface-header !py-4 !px-6 border-b border-jj-border">
              <h3 className="surface-title text-[15px] flex items-center gap-2">📨 Send Email to Candidate</h3>
            </div>
            <div className="settings-card-body !p-6 !gap-6">
              <div className="field-stack">
                <label className="field-label mb-1">Recipient Email</label>
                <input
                  type="email"
                  value={mailTo}
                  onChange={(e) => setMailTo(e.target.value)}
                  placeholder="candidate@gmail.com"
                  className="field-input !px-4 !py-2.5 text-[14px]"
                />
              </div>
              <div className="field-stack">
                <label className="field-label mb-1">Recipient Name</label>
                <input
                  type="text"
                  value={mailName}
                  onChange={(e) => setMailName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="field-input !px-4 !py-2.5 text-[14px]"
                />
              </div>
              <div className="field-stack">
                <label className="field-label mb-1">Subject</label>
                <input
                  type="text"
                  value={mailSubject}
                  onChange={(e) => setMailSubject(e.target.value)}
                  placeholder="e.g. Your Application Status"
                  className="field-input !px-4 !py-2.5 text-[14px]"
                />
              </div>
              <div className="field-stack">
                <label className="field-label mb-1">Message</label>
                <textarea
                  rows={6}
                  value={mailBody}
                  onChange={(e) => setMailBody(e.target.value)}
                  placeholder="Write your message here..."
                  className="field-textarea !px-4 !py-3 text-[14px]"
                />
              </div>
              
              <div className="mt-2">
                <div className="mb-3 text-[11.5px] font-bold uppercase tracking-[0.8px] text-jj-text-muted">
                  Quick Templates
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => useTemplate("welcome")} className="action-pill green !px-4 !py-2 text-[13px]">🎉 Welcome</button>
                  <button onClick={() => useTemplate("interview")} className="action-pill green !px-4 !py-2 text-[13px]">📅 Interview Invite</button>
                  <button onClick={() => useTemplate("followup")} className="action-pill amber !px-4 !py-2 text-[13px]">🔔 Follow Up</button>
                  <button onClick={() => useTemplate("reject")} className="action-pill red !px-4 !py-2 text-[13px]">❌ Rejection</button>
                </div>
              </div>

              <button
                onClick={handleSendCustomEmail}
                disabled={loading}
                className="btn-sm btn-accent mt-2 w-fit px-8 py-2.5 text-[14px] font-bold disabled:opacity-70 rounded-[10px] transition-transform hover:scale-[1.02]"
              >
                📤 Send Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD TAB */}
      {activeTab === "password" && (
        <div className="table-shell settings-card-narrow">
          <div className="surface-header !py-4 !px-6 border-b border-jj-border">
            <h3 className="surface-title text-[15px] flex items-center gap-2">🔑 Change Password</h3>
          </div>
          <div className="settings-card-body !p-6 !gap-6">
            <div className="settings-note border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.08)] !p-4 !text-[13.5px]">
              Logged in as <strong className="text-jj-accent">{userName}</strong> ({userRole})
            </div>
            
            <div className="field-stack">
              <label className="field-label mb-1">Current Password</label>
              <input
                type="password"
                value={cpCurrent}
                onChange={(e) => setCpCurrent(e.target.value)}
                placeholder="Enter current password"
                className="field-input !px-4 !py-2.5 text-[14px]"
              />
            </div>
            <div className="field-stack">
              <label className="field-label mb-1">New Password</label>
              <input
                type="password"
                value={cpNew}
                onChange={(e) => setCpNew(e.target.value)}
                placeholder="Enter new password (min 4 chars)"
                className="field-input !px-4 !py-2.5 text-[14px]"
              />
            </div>
            <div className="field-stack">
              <label className="field-label mb-1">Confirm New Password</label>
              <input
                type="password"
                value={cpConfirm}
                onChange={(e) => setCpConfirm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
                placeholder="Re-enter new password"
                className="field-input !px-4 !py-2.5 text-[14px]"
              />
            </div>
            
            <button
              onClick={handleChangePassword}
              className="btn-sm btn-accent mt-2 w-fit px-8 py-2.5 text-[14px] font-bold rounded-[10px] transition-transform hover:scale-[1.02]"
            >
              🔑 Update Password
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
