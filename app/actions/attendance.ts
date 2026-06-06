"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

function getProjectManagerEmails(managerEmail?: string | null) {
  if (!managerEmail) return [];
  try {
    const parsed = JSON.parse(managerEmail);
    if (Array.isArray(parsed)) {
      return parsed.filter((email): email is string => typeof email === "string" && email.trim() !== "");
    }
  } catch {
    // Older projects stored one manager email directly.
  }
  return managerEmail.trim() ? [managerEmail] : [];
}

export async function markAttendance(
  email: string,
  status: string,
  date: string,
  leaveType?: string,
  leaveReason?: string
) {
  try {
    const existing = await prisma.attendance.findFirst({
      where: {
        email,
        date,
      },
    });

    if (existing) {
      // Check if this was a pending leave approval or rejection
      if (existing.status === "Leave Requested") {
        if (status === "Leave") {
          await prisma.notification.create({
            data: {
              title: "✅ Leave Approved",
              body: `Your leave request for ${date} has been approved.`,
              icon: "🏖",
              targetEmail: email,
            },
          });
        } else if (status === "Absent") {
          await prisma.notification.create({
            data: {
              title: "❌ Leave Rejected",
              body: `Your leave request for ${date} was rejected.`,
              icon: "❌",
              targetEmail: email,
            },
          });
        }
      }

      const updateData: any = { status };
      if (leaveType !== undefined) updateData.leaveType = leaveType;
      if (leaveReason !== undefined) updateData.leaveReason = leaveReason;

      await prisma.attendance.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      await prisma.attendance.create({
        data: {
          email,
          status,
          date,
          leaveType: leaveType || null,
          leaveReason: leaveReason || null,
        },
      });
    }

    if (status === "Leave Requested") {
      // Find the user's name
      const user = await prisma.user.findUnique({
        where: { email },
        select: { name: true }
      });
      const userName = user?.name || email.split("@")[0];

      // Find projects where user is a member
      const projects = await prisma.project.findMany();
      const userProjects = projects.filter(p => {
        try {
          const members = JSON.parse(p.members || "[]");
          return Array.isArray(members) && members.includes(email);
        } catch {
          return false;
        }
      });
      
      const managerEmails = userProjects
        .flatMap(p => getProjectManagerEmails(p.managerEmail));

      let targetEmails = Array.from(new Set(managerEmails));
      if (targetEmails.length === 0) {
        // Fallback: Notify all admins, super_admins, and tutors
        const admins = await prisma.user.findMany({
          where: {
            role: { in: ["admin", "super_admin", "tutor"] }
          },
          select: { email: true }
        });
        targetEmails = admins.map(a => a.email).filter(Boolean);
      }

      // Send notifications
      for (const tEmail of targetEmails) {
        await prisma.notification.create({
          data: {
            title: "🏖 New Leave Request",
            body: `${userName} requested leave for ${date}.${leaveType ? ` Type: ${leaveType}.` : ""}${leaveReason ? ` Reason: ${leaveReason}` : ""}`,
            icon: "🏖",
            targetEmail: tEmail
          }
        });
      }
    }

    revalidatePath("/dashboard/attendance");
    revalidatePath("/dashboard/productivity");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Error marking attendance:", error);
    return { success: false, error: error.message || "Failed to mark attendance" };
  }
}

export async function getPendingLeaves() {
  try {
    const pending = await prisma.attendance.findMany({
      where: { status: "Leave Requested" },
      orderBy: { date: "asc" }
    });
    
    // Fetch user names for these emails
    const emails = pending.map(p => p.email).filter(Boolean) as string[];
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { email: true, name: true }
    });
    
    const userMap = new Map(users.map(u => [u.email, u.name]));
    
    return {
      success: true,
      leaves: pending.map(p => ({
        id: p.id,
        email: p.email,
        name: userMap.get(p.email || "") || p.email?.split("@")[0] || "Unknown",
        date: p.date,
        status: p.status,
        leaveType: p.leaveType,
        leaveReason: p.leaveReason
      }))
    };
  } catch (error: any) {
    console.error("Error fetching pending leaves:", error);
    return { success: false, error: error.message || "Failed to fetch pending leaves" };
  }
}
