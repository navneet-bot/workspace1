"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function markAttendance(email: string, status: string, date: string) {
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

      await prisma.attendance.update({
        where: { id: existing.id },
        data: { status },
      });
    } else {
      await prisma.attendance.create({
        data: {
          email,
          status,
          date,
        },
      });
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
        status: p.status
      }))
    };
  } catch (error: any) {
    console.error("Error fetching pending leaves:", error);
    return { success: false, error: error.message || "Failed to fetch pending leaves" };
  }
}
