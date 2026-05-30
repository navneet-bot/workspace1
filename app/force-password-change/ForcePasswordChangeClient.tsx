"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changePassword } from "@/app/actions/settings";
import { KeyRound, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

export default function ForcePasswordChangeClient({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPass !== confirmPass) {
      setError("New passwords do not match");
      return;
    }
    if (newPass.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await changePassword(userEmail, currentPass, newPass);
      if (res.success) {
        // Success! Route to dashboard
        router.push("/dashboard");
        router.refresh(); // Important to refresh server layout state
      } else {
        setError(res.error || "Failed to change password");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="loginPage">
      <div className="login-bg" />
      <div className="login-grid" />
      <div className="login-card">
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
          <div className="login-logo-icon">
            <Lock size={18} />
          </div>
        </div>
        <h2 style={{ textAlign: "center", marginBottom: "4px" }}>Update Password</h2>
        <p style={{ textAlign: "center", marginBottom: "20px", marginLeft: "auto", marginRight: "auto", maxWidth: "280px" }}>
          For security reasons, you must change your temporary password before accessing the dashboard.
        </p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 rounded-lg bg-jj-red/10 border border-jj-red/20 p-3 text-sm text-jj-red" style={{ position: "relative", zIndex: 5 }}>
              {error}
            </div>
          )}

          <div className="field-group">
            <label>Current (Temporary) Password</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                required
                placeholder="Enter current password"
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                style={{ paddingRight: "38px" }}
              />
            </div>
          </div>

          <div className="field-group">
            <label>New Password</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                required
                placeholder="Enter new password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                style={{ paddingRight: "38px" }}
              />
            </div>
          </div>

          <div className="field-group">
            <label>Confirm New Password</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                required
                placeholder="Confirm new password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                style={{ paddingRight: "38px" }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center"
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <KeyRound size={15} />
            )}
            Update Password & Continue
          </button>
        </form>
      </div>
    </div>
  );
}
