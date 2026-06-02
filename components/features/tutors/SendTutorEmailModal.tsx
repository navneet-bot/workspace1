"use client";

import { useState, useEffect } from "react";
import { useUIStore } from "@/hooks/useUIStore";

interface Tutor {
  id: number;
  name: string;
  email: string | null;
}

interface SendTutorEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  tutor: Tutor | null;
}

export function SendTutorEmailModal({ isOpen, onClose, tutor }: SendTutorEmailModalProps) {
  const { addToast } = useUIStore();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isOpen && tutor) {
      setSubject("");
      setBody("");
    }
  }, [isOpen, tutor]);

  if (!isOpen || !tutor) return null;

  const useTemplate = (type: string) => {
    const name = tutor.name.split(" ")[0];
    if (type === "welcome") {
      setSubject("🎉 Welcome to Job Jockey's Tutor Network!");
      setBody(`Dear ${name},\n\nCongratulations! We are thrilled to welcome you to the Job Jockey Tutor network as a verified educator.\n\nBest regards,\nJob Jockey Team`);
    } else if (type === "interview") {
      setSubject("👨‍🏫 Invitation to Tutor Interview - Job Jockey");
      setBody(`Dear ${name},\n\nWe would like to invite you for an interview/demo session to discuss your tutor application.\nPlease share your availability for this week so we can schedule the call.\n\nBest regards,\nJob Jockey Team`);
    } else if (type === "demo") {
      setSubject("📚 Demo Class Session details - Job Jockey");
      setBody(`Dear ${name},\n\nWe would like to schedule a 15-minute Demo Class to evaluate your teaching methodologies. Please prepare a brief lesson on one of your primary subjects.\n\nBest regards,\nJob Jockey Team`);
    } else if (type === "reject") {
      setSubject("Update regarding your tutor application");
      setBody(`Dear ${name},\n\nThank you for applying. Unfortunately, we will not be moving forward with your tutor application at this time. We wish you the best of luck in your endeavors.\n\nBest regards,\nJob Jockey Team`);
    }
  };

  const handleSend = async () => {
    if (!tutor.email) {
      addToast("Tutor has no email address", "error");
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
          email: tutor.email,
          name: tutor.name,
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
      <div className="modal modal-scrollable w-full !max-w-[540px]">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "bold" }}>📧 Send Email to {tutor.name.split(" ")[0]}</h3>
          <button onClick={onClose} className="modal-close">
            ✕
          </button>
        </div>
        
        <div className="modal-form flex flex-col gap-[18px]">
          <div className="form-body">
            <div className="flex gap-[8px] flex-wrap mb-4">
              <button onClick={() => useTemplate("welcome")} className="action-btn action-approve">🎉 Welcome</button>
              <button onClick={() => useTemplate("interview")} className="action-btn action-approve">📅 Interview Invite</button>
              <button onClick={() => useTemplate("demo")} className="action-btn action-edit">📚 Demo Class</button>
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
              disabled={isSending || !tutor.email}
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
