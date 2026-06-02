"use client";

import { useState } from "react";
import { useUIStore } from "@/hooks/useUIStore";

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

interface AddCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (candidate: CandidateFormData) => void;
}

export function AddCandidateModal({ isOpen, onClose, onAdd }: AddCandidateModalProps) {
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

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!formData.name) {
      addToast("Enter candidate name", "error");
      return;
    }
    
    setIsSubmitting(true);
    
    // Call server action to actually save to database!
    const { createCandidate } = await import("@/app/actions/candidates");
    const res = await createCandidate(formData);
    
    setIsSubmitting(false);

    if (res.success && res.candidate) {
      onAdd(res.candidate); // Use the real generated ID and values
      
      // Reset form for next open
      setFormData({
        name: "", email: "", phone: "", skill: "", state: "", 
        college: "", eduDomain: "", duration: "", resumeLink: ""
      });
      
      addToast("Candidate added successfully", "success");
      onClose();
    } else {
      addToast(`Error adding candidate: ${res.error}`, "error");
    }
  };

  return (
    <div className="modal-shell">
      <div className="modal modal-scrollable w-full !max-w-[560px]">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <h3 style={{ margin: 0 }}>+ Add Candidate</h3>
          <button onClick={onClose} className="modal-close">
            ✕
          </button>
        </div>
        
        <div className="modal-form flex flex-col gap-[18px]">
          <div className="form-body">
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
                <label>Email *</label>
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
          </div>

          <div className="modal-footer">
            <button 
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-sm btn-outline"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="btn-sm btn-accent"
            >
              {isSubmitting ? "Adding..." : "+ Add Candidate"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
