"use client";

import { Bell, LogOut, User } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";

export function HeaderControls({ userEmail, unreadCount }: { userEmail: string, unreadCount: number }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = () => {
    // Basic signout. In legacy, intern logs out and gets the worklog popup.
    // NextAuth standard signout handles session destruction.
    signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="flex items-center gap-3">
      <Link href="/dashboard/notifications" className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-jj-border bg-jj-surface text-jj-text-soft transition-all duration-200 hover:border-jj-accent hover:text-jj-accent">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <div className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full border-[1.5px] border-jj-bg bg-jj-accent" />
        )}
      </Link>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-jj-border bg-jj-surface text-jj-text-soft transition-all duration-200 hover:border-jj-accent hover:text-jj-accent"
        >
          <User className="h-4 w-4" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-48 rounded-[10px] border border-jj-border bg-jj-surface p-1 shadow-lg z-50">
            <div className="px-3 py-2 text-[12px] text-jj-text-muted border-b border-jj-border mb-1 truncate">
              {userEmail}
            </div>
            <Link
              href="/dashboard/settings"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 rounded-[6px] px-3 py-1.5 text-[13px] font-semibold text-jj-text hover:bg-jj-surface2 transition-colors"
            >
              <User size={14} /> Profile & Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-[6px] px-3 py-1.5 text-[13px] font-semibold text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors mt-1"
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
