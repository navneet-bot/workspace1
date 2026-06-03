"use client";

import { useState, useEffect } from "react";
import { Coffee } from "lucide-react";

export function BreakCountdownWidget({
  initialRemainingSeconds,
  duration,
  reason,
}: {
  initialRemainingSeconds: number;
  duration: number;
  reason: string;
}) {
  const [seconds, setSeconds] = useState(initialRemainingSeconds);

  useEffect(() => {
    if (seconds <= 0) return;
    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [seconds]);

  if (seconds <= 0) return null;

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))",
        border: "1px solid rgba(245,158,11,0.3)",
        borderRadius: "14px",
        padding: "16px 24px",
        marginBottom: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "12px",
        boxShadow: "0 4px 20px rgba(245, 158, 11, 0.05)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ fontSize: "24px" }}>☕</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "14.5px", color: "var(--accent)" }}>Break Active</div>
          <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>
            Reason: {reason} · Duration: {duration} mins
          </div>
        </div>
      </div>
      <div
        style={{
          fontSize: "24px",
          fontWeight: 800,
          fontFamily: "monospace",
          color: "var(--accent)",
          background: "rgba(0,0,0,0.2)",
          padding: "6px 14px",
          borderRadius: "8px",
          border: "1px solid rgba(245,158,11,0.15)",
        }}
      >
        {formatTime(seconds)}
      </div>
    </div>
  );
}
