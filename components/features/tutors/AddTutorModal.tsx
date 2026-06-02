"use client";

import { useState } from "react";
import { useUIStore } from "@/hooks/useUIStore";

export interface TutorFormData {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  gender: string;
  dob: string;
  location: string;
  profilePhoto: string;
  qualification: string;
  university: string;
  degree: string;
  specialization: string;
  gradYear: string;
  subject: string;
  experience: string;
  mode: string;
  occupation: string;
  prevInst: string;
  certifications: string;
  portfolio: string;
  linkedinUrl: string;
  resumeUrl: string;
  status: string;
  interviewNotes: string;
  createdAt: Date;
}

interface AddTutorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (tutor: TutorFormData) => void;
}

export function AddTutorModal({ isOpen, onClose, onAdd }: AddTutorModalProps) {
  const { addToast } = useUIStore();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    dob: "",
    location: "",
    profilePhoto: "",
    qualification: "",
    university: "",
    degree: "",
    specialization: "",
    gradYear: "",
    subject: "",
    experience: "",
    mode: "Online",
    occupation: "",
    prevInst: "",
    certifications: "",
    portfolio: "",
    linkedinUrl: "",
    resumeUrl: "",
    status: "Applied",
    interviewNotes: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!formData.name) {
      addToast("Enter tutor name", "error");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { createTutor } = await import("@/app/actions/tutors");
      const res = await createTutor(formData);
      
      setIsSubmitting(false);

      if (res.success && res.tutor) {
        onAdd(res.tutor as any);
        
        // Reset form
        setFormData({
          name: "",
          email: "",
          phone: "",
          gender: "",
          dob: "",
          location: "",
          profilePhoto: "",
          qualification: "",
          university: "",
          degree: "",
          specialization: "",
          gradYear: "",
          subject: "",
          experience: "",
          mode: "Online",
          occupation: "",
          prevInst: "",
          certifications: "",
          portfolio: "",
          linkedinUrl: "",
          resumeUrl: "",
          status: "Applied",
          interviewNotes: ""
        });
        
        addToast("Tutor added successfully", "success");
        onClose();
      } else {
        addToast(`Error adding tutor: ${res.error}`, "error");
      }
    } catch (e: any) {
      setIsSubmitting(false);
      addToast(`Error adding tutor: ${e.message}`, "error");
    }
  };

  return (
    <div className="modal-shell">
      <div className="modal modal-scrollable w-full !max-w-[700px]">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "bold" }}>👨‍🏫 Add New Tutor</h3>
          <button onClick={onClose} className="modal-close">
            ✕
          </button>
        </div>
        
        <div className="modal-form flex flex-col gap-[18px]">
          <div className="form-body">
            
            {/* Section 1: Basic Info */}
            <div className="mb-4">
              <h4 className="text-[12.5px] font-bold text-jj-accent uppercase tracking-wider mb-2 border-b border-jj-border pb-1">
                👤 Basic Information
              </h4>
              <div className="form-row">
                <div className="field">
                  <label>Full Name *</label>
                  <input 
                    placeholder="e.g. Maniarasan J"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="field">
                  <label>Email Address</label>
                  <input 
                    type="email"
                    placeholder="tutor@gmail.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="field">
                  <label>Phone Number</label>
                  <input 
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div className="field">
                  <label>Gender</label>
                  <select 
                    value={formData.gender}
                    onChange={e => setFormData({...formData, gender: e.target.value})}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="field">
                  <label>Date of Birth</label>
                  <input 
                    type="date"
                    value={formData.dob}
                    onChange={e => setFormData({...formData, dob: e.target.value})}
                  />
                </div>
                <div className="field">
                  <label>Location (City/State)</label>
                  <input 
                    placeholder="e.g. Chennai, Tamil Nadu"
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                  />
                </div>
              </div>

              <div className="field">
                <label>Profile Photo URL</label>
                <input 
                  placeholder="https://..."
                  value={formData.profilePhoto}
                  onChange={e => setFormData({...formData, profilePhoto: e.target.value})}
                />
              </div>
            </div>

            {/* Section 2: Academic Info */}
            <div className="mb-4">
              <h4 className="text-[12.5px] font-bold text-jj-accent uppercase tracking-wider mb-2 border-b border-jj-border pb-1">
                🎓 Academic Background
              </h4>
              <div className="form-row">
                <div className="field">
                  <label>Highest Qualification</label>
                  <input 
                    placeholder="e.g. Master of Technology (M.Tech)"
                    value={formData.qualification}
                    onChange={e => setFormData({...formData, qualification: e.target.value})}
                  />
                </div>
                <div className="field">
                  <label>University</label>
                  <input 
                    placeholder="e.g. IIT Madras"
                    value={formData.university}
                    onChange={e => setFormData({...formData, university: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="field">
                  <label>Degree</label>
                  <input 
                    placeholder="e.g. Computer Science and Engineering"
                    value={formData.degree}
                    onChange={e => setFormData({...formData, degree: e.target.value})}
                  />
                </div>
                <div className="field">
                  <label>Specialization / Major</label>
                  <input 
                    placeholder="e.g. Artificial Intelligence"
                    value={formData.specialization}
                    onChange={e => setFormData({...formData, specialization: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="field w-1/2">
                  <label>Graduation Year</label>
                  <input 
                    placeholder="e.g. 2023"
                    value={formData.gradYear}
                    onChange={e => setFormData({...formData, gradYear: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Teaching Info */}
            <div className="mb-4">
              <h4 className="text-[12.5px] font-bold text-jj-accent uppercase tracking-wider mb-2 border-b border-jj-border pb-1">
                📚 Teaching Details
              </h4>
              <div className="form-row">
                <div className="field">
                  <label>Subjects</label>
                  <input 
                    placeholder="e.g. Mathematics, Programming, AI / ML"
                    value={formData.subject}
                    onChange={e => setFormData({...formData, subject: e.target.value})}
                  />
                </div>
                <div className="field">
                  <label>Teaching Mode</label>
                  <select 
                    value={formData.mode}
                    onChange={e => setFormData({...formData, mode: e.target.value})}
                  >
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="field w-1/2">
                  <label>Teaching Experience (Years/Details)</label>
                  <input 
                    placeholder="e.g. 2 Years"
                    value={formData.experience}
                    onChange={e => setFormData({...formData, experience: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Professional Details */}
            <div className="mb-4">
              <h4 className="text-[12.5px] font-bold text-jj-accent uppercase tracking-wider mb-2 border-b border-jj-border pb-1">
                💼 Professional Details
              </h4>
              <div className="form-row">
                <div className="field">
                  <label>Current Occupation</label>
                  <input 
                    placeholder="e.g. Software Engineer / Freelance Tutor"
                    value={formData.occupation}
                    onChange={e => setFormData({...formData, occupation: e.target.value})}
                  />
                </div>
                <div className="field">
                  <label>Previous Institutions</label>
                  <input 
                    placeholder="e.g. Byju's, Unacademy"
                    value={formData.prevInst}
                    onChange={e => setFormData({...formData, prevInst: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="field">
                  <label>Teaching Certifications</label>
                  <input 
                    placeholder="e.g. B.Ed, CELTA, TOEFL Cert"
                    value={formData.certifications}
                    onChange={e => setFormData({...formData, certifications: e.target.value})}
                  />
                </div>
                <div className="field">
                  <label>Portfolio / Personal Website</label>
                  <input 
                    placeholder="https://myportfolio.com"
                    value={formData.portfolio}
                    onChange={e => setFormData({...formData, portfolio: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="field">
                  <label>LinkedIn Profile URL</label>
                  <input 
                    placeholder="https://linkedin.com/in/..."
                    value={formData.linkedinUrl}
                    onChange={e => setFormData({...formData, linkedinUrl: e.target.value})}
                  />
                </div>
                <div className="field">
                  <label>Resume / CV Link</label>
                  <input 
                    placeholder="https://drive.google.com/file/..."
                    value={formData.resumeUrl}
                    onChange={e => setFormData({...formData, resumeUrl: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Recruitment Initial Status */}
            <div>
              <h4 className="text-[12.5px] font-bold text-jj-accent uppercase tracking-wider mb-2 border-b border-jj-border pb-1">
                ⚙️ Status
              </h4>
              <div className="form-row">
                <div className="field w-1/2">
                  <label>Recruitment Status</label>
                  <select 
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="Applied">Applied</option>
                    <option value="Screening">Screening</option>
                    <option value="Interview Scheduled">Interview Scheduled</option>
                    <option value="Selected">Selected</option>
                    <option value="Onboarded">Onboarded</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

          </div>

          <div className="modal-footer" style={{ marginTop: "10px" }}>
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
              {isSubmitting ? "Adding..." : "+ Add Tutor"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
