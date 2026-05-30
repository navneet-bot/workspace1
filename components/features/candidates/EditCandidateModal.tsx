"use client";

import { useState, useEffect } from "react";
import { useUIStore } from "@/hooks/useUIStore";
import { updateCandidateDetails } from "@/app/actions/candidates";

export interface CandidateFormData {
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

interface EditCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: CandidateFormData | null;
  onUpdate: (candidate: CandidateFormData) => void;
}

export function EditCandidateModal({ isOpen, onClose, candidate, onUpdate }: EditCandidateModalProps) {
  const { addToast } = useUIStore();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    skill: "",
    state: "",
    college: "",
    eduDomain: "",
    duration: "",
    resumeLink: ""
  });
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (candidate) {
      setFormData({
        name: candidate.name || "",
        email: candidate.email || "",
        phone: candidate.phone || "",
        skill: candidate.skill || "",
        state: candidate.state || "",
        college: candidate.college || "",
        eduDomain: candidate.eduDomain || "",
        duration: candidate.duration || "",
        resumeLink: candidate.resumeLink || ""
      });
    }
  }, [candidate]);

  if (!isOpen || !candidate) return null;

  const handleSubmit = async () => {
    if (!formData.name) {
      addToast("Enter candidate name", "error");
      return;
    }
    
    setIsSaving(true);
    
    const res = await updateCandidateDetails(candidate.id, {
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone,
      skill: formData.skill,
      state: formData.state,
      college: formData.college,
      edu_domain: formData.eduDomain, // mapping camelCase to db schema
      duration: formData.duration,
      resume_link: formData.resumeLink
    });
    
    setIsSaving(false);

    if (res.success) {
      onUpdate({
        ...candidate,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        skill: formData.skill,
        state: formData.state,
        college: formData.college,
        eduDomain: formData.eduDomain,
        duration: formData.duration,
        resumeLink: formData.resumeLink,
      });
      addToast("Candidate updated successfully", "success");
      onClose();
    } else {
      addToast(`Error updating candidate: ${res.error}`, "error");
    }
  };

  return (
    <div className="modal-shell">
      <div className="modal w-full !max-w-[540px]">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <h3 style={{ margin: 0 }}>✏️ Edit Candidate</h3>
          <button onClick={onClose} className="modal-close">
            ✕
          </button>
        </div>
        
        <div className="flex flex-col gap-[18px]">
          <div className="form-row">
            <div className="field">
              <label>Full Name *</label>
              <input 
                placeholder="e.g. Rahul Sharma"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input 
                type="email"
                placeholder="rahul@gmail.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="field">
              <label>Phone</label>
              <input 
                placeholder="9876543210"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            <div className="field">
              <label>Skills / Domain</label>
              <input 
                placeholder="e.g. React JS, Python"
                value={formData.skill}
                onChange={e => setFormData({...formData, skill: e.target.value})}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="field">
              <label>State</label>
              <input 
                placeholder="e.g. Maharashtra"
                value={formData.state}
                onChange={e => setFormData({...formData, state: e.target.value})}
              />
            </div>
            <div className="field">
              <label>College / University</label>
              <input 
                placeholder="e.g. MIT Pune"
                value={formData.college}
                onChange={e => setFormData({...formData, college: e.target.value})}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="field">
              <label>Education Domain</label>
              <input 
                placeholder="e.g. Computer Science"
                value={formData.eduDomain}
                onChange={e => setFormData({...formData, eduDomain: e.target.value})}
              />
            </div>
            <div className="field">
              <label>Internship Duration</label>
              <select 
                value={formData.duration}
                onChange={e => setFormData({...formData, duration: e.target.value})}
              >
                <option value="">-- Select --</option>
                <option>1 Month</option>
                <option>2 Months</option>
                <option>3 Months</option>
                <option>4 Months</option>
                <option>6 Months</option>
                <option>1 Year</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label>Resume Link (optional)</label>
            <input 
              placeholder="https://drive.google.com/..."
              value={formData.resumeLink}
              onChange={e => setFormData({...formData, resumeLink: e.target.value})}
            />
          </div>

          <div className="modal-footer">
            <button 
              onClick={onClose}
              disabled={isSaving}
              className="btn-sm btn-outline"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={isSaving}
              className="btn-sm btn-accent"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
