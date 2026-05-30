"use client";

import { useState, useEffect } from "react";
import { useUIStore } from "@/hooks/useUIStore";

interface Candidate {
  id: number;
  name: string;
  email: string | null;
}

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate | null;
}

export function SendEmailModal({ isOpen, onClose, candidate }: SendEmailModalProps) {
  const { addToast } = useUIStore();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isOpen && candidate) {
      setSubject("");
      setBody("");
    }
  }, [isOpen, candidate]);

  if (!isOpen || !candidate) return null;

  const useTemplate = (type: string) => {
    const name = candidate.name.split(" ")[0];
    if (type === "welcome") {
      setSubject("Welcome to Job Jockey!");
      setBody(`Hi ${name},\n\nCongratulations! We are thrilled to welcome you to the Job Jockey internship program.\n\nBest regards,\nJob Jockey Team`);
    } else if (type === "interview") {
      setSubject("Invitation to Interview - Job Jockey");
      setBody(`Hi ${name},\n\nWe would like to invite you for a brief interview to discuss your application.\nPlease let us know your availability for this week.\n\nBest,\nJob Jockey Team`);
    } else if (type === "followup") {
      setSubject("Update on your Application");
      setBody(`Hi ${name},\n\nJust checking in! We are still reviewing applications and will get back to you shortly.\n\nThanks,\nJob Jockey Team`);
    } else if (type === "reject") {
      setSubject("Update regarding your application");
      setBody(`Hi ${name},\n\nThank you for applying. Unfortunately, we will not be moving forward with your application at this time. We wish you the best of luck.\n\nBest regards,\nJob Jockey Team`);
    }
  };

  const handleSend = async () => {
    if (!candidate.email) {
      addToast("Candidate has no email address", "error");
      return;
    }
    if (!subject || !body) {
      addToast("Subject and body are required", "error");
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: candidate.email,
          name: candidate.name,
          subject,
          body
        })
      });
      
      if (res.ok) {
        addToast("Email sent successfully!", "success");
        onClose();
      } else {
        const data = await res.json();
        addToast(`Failed to send email: ${data.error || "Unknown error"}`, "error");
      }
    } catch (e: any) {
      addToast(`Error: ${e.message}`, "error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="modal-shell">
      <div className="modal w-full !max-w-[540px]">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <h3 style={{ margin: 0 }}>📧 Send Email to {candidate.name.split(" ")[0]}</h3>
          <button onClick={onClose} className="modal-close">
            ✕
          </button>
        </div>
        
        <div className="flex flex-col gap-[18px]">
          <div className="flex gap-[8px] flex-wrap">
            <button onClick={() => useTemplate("welcome")} className="action-btn action-approve">🎉 Welcome</button>
            <button onClick={() => useTemplate("interview")} className="action-btn action-approve">📅 Interview Invite</button>
            <button onClick={() => useTemplate("followup")} className="action-btn action-edit">🔔 Follow Up</button>
            <button onClick={() => useTemplate("reject")} className="action-btn action-reject">❌ Rejection</button>
          </div>
          
          <div className="field">
            <label>Subject</label>
            <input 
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Message</label>
            <textarea 
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={8}
              style={{ resize: "vertical" }}
            />
          </div>

          <div className="modal-footer">
            <button 
              onClick={onClose}
              disabled={isSending}
              className="btn-sm btn-outline disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              onClick={handleSend}
              disabled={isSending || !candidate.email}
              className="btn-sm btn-accent flex items-center gap-[6px] disabled:opacity-50"
            >
              {isSending ? "Sending..." : "Send Email"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
