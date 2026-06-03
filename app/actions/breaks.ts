"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

// Auto-expire approved breaks whose duration has passed
export async function checkAndExpireBreaks() {
  try {
    const approvedBreaks = await prisma.breakRequest.findMany({
      where: { status: "approved" },
    });

    const now = new Date();

    for (const br of approvedBreaks) {
      if (!br.approvedAt) continue;
      const approvedTime = new Date(br.approvedAt);
      const endTime = new Date(approvedTime.getTime() + br.duration * 60 * 1000);

      if (now > endTime) {
        // Update break request status to expired
        await prisma.breakRequest.update({
          where: { id: br.id },
          data: { status: "expired" },
        });

        // Find user's attendance for the break date
        const dateStr = br.approvedAt.toISOString().split("T")[0];
        const attendance = await prisma.attendance.findFirst({
          where: {
            email: br.userEmail,
            date: dateStr,
          },
        });

        if (attendance) {
          const newTotal = (attendance.totalBreakDuration || 0) + br.duration;
          await prisma.attendance.update({
            where: { id: attendance.id },
            data: {
              breakEndTime: endTime.toISOString(),
              totalBreakDuration: newTotal,
            },
          });
        }

        // Notify user
        await prisma.notification.create({
          data: {
            title: "☕ Break Completed",
            body: `Your ${br.duration}-minute break is complete.`,
            icon: "☕",
            targetEmail: br.userEmail,
          },
        });
      }
    }
  } catch (error) {
    console.error("Error in checkAndExpireBreaks:", error);
  }
}

export async function submitBreakRequest(data: {
  userId: number;
  userEmail: string;
  userName: string;
  duration: number;
  reason: string;
}) {
  try {
    await checkAndExpireBreaks();

    // Check if the user already has a pending or approved break
    const activeRequest = await prisma.breakRequest.findFirst({
      where: {
        userId: data.userId,
        status: { in: ["pending", "approved"] },
      },
    });

    if (activeRequest) {
      return {
        success: false,
        error: `You already have a ${activeRequest.status} break request.`,
      };
    }

    const breakRequest = await prisma.breakRequest.create({
      data: {
        userId: data.userId,
        userEmail: data.userEmail,
        userName: data.userName,
        duration: data.duration,
        reason: data.reason,
        status: "pending",
      },
    });

    // Notify all admins and super admins
    const admins = await prisma.user.findMany({
      where: { role: { in: ["admin", "super_admin"] } },
      select: { email: true },
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          title: "☕ Break Request",
          body: `☕ ${data.userName} requested a ${data.duration}-minute break.\nReason: ${data.reason}`,
          icon: "☕",
          targetEmail: admin.email,
        },
      });
    }

    revalidatePath("/dashboard/attendance");
    return { success: true, breakRequest };
  } catch (error: any) {
    console.error("Error submitting break request:", error);
    return { success: false, error: error.message || "Failed to submit request" };
  }
}

export async function getBreakRequests(filterEmail?: string) {
  try {
    await checkAndExpireBreaks();

    const requests = await prisma.breakRequest.findMany({
      where: filterEmail ? { userEmail: filterEmail } : undefined,
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      requests: requests.map((r) => ({
        ...r,
        requestedAt: r.requestedAt.toISOString(),
        approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  } catch (error: any) {
    console.error("Error loading break requests:", error);
    return { success: false, error: error.message || "Failed to load requests" };
  }
}

export async function approveBreakRequest(id: number, adminId: number, adminName: string) {
  try {
    const br = await prisma.breakRequest.findUnique({
      where: { id },
    });

    if (!br) return { success: false, error: "Break request not found" };
    if (br.status !== "pending") {
      return { success: false, error: `Break request is already ${br.status}` };
    }

    const approvedAt = new Date();

    await prisma.breakRequest.update({
      where: { id },
      data: {
        status: "approved",
        approvedAt,
        approvedBy: adminId,
        approvedByName: adminName,
      },
    });

    // Log the breakStartTime in user's today's attendance record
    const dateStr = approvedAt.toISOString().split("T")[0];
    const attendance = await prisma.attendance.findFirst({
      where: {
        email: br.userEmail,
        date: dateStr,
      },
    });

    if (attendance) {
      await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          breakStartTime: approvedAt.toISOString(),
        },
      });
    }

    // Notify intern
    await prisma.notification.create({
      data: {
        title: "✅ Break Approved",
        body: `Your ${br.duration}-minute break request has been approved.`,
        icon: "✅",
        targetEmail: br.userEmail,
      },
    });

    revalidatePath("/dashboard/attendance");
    return { success: true };
  } catch (error: any) {
    console.error("Error approving break request:", error);
    return { success: false, error: error.message || "Failed to approve request" };
  }
}

export async function rejectBreakRequest(
  id: number,
  adminId: number,
  adminName: string,
  comment?: string
) {
  try {
    const br = await prisma.breakRequest.findUnique({
      where: { id },
    });

    if (!br) return { success: false, error: "Break request not found" };
    if (br.status !== "pending") {
      return { success: false, error: `Break request is already ${br.status}` };
    }

    await prisma.breakRequest.update({
      where: { id },
      data: {
        status: "rejected",
        rejectComment: comment || "",
        approvedAt: new Date(),
        approvedBy: adminId,
        approvedByName: adminName,
      },
    });

    // Notify intern
    await prisma.notification.create({
      data: {
        title: "❌ Break Rejected",
        body: `Your break request was rejected.${comment ? ` Reason: ${comment}` : ""}`,
        icon: "❌",
        targetEmail: br.userEmail,
      },
    });

    revalidatePath("/dashboard/attendance");
    return { success: true };
  } catch (error: any) {
    console.error("Error rejecting break request:", error);
    return { success: false, error: error.message || "Failed to reject request" };
  }
}

export async function getActiveBreak(userEmail: string) {
  try {
    await checkAndExpireBreaks();

    const active = await prisma.breakRequest.findFirst({
      where: {
        userEmail,
        status: "approved",
      },
    });

    if (!active || !active.approvedAt) return { success: true, active: null };

    // Calculate remaining time
    const approvedTime = new Date(active.approvedAt);
    const endTime = new Date(approvedTime.getTime() + active.duration * 60 * 1000);
    const now = new Date();
    const remainingSeconds = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));

    return {
      success: true,
      active: {
        id: active.id,
        duration: active.duration,
        reason: active.reason,
        approvedAt: active.approvedAt.toISOString(),
        remainingSeconds,
      },
    };
  } catch (error: any) {
    console.error("Error checking active break:", error);
    return { success: false, error: error.message || "Failed to check active break" };
  }
}

export async function getTodayBreaksStats() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const breaks = await prisma.breakRequest.findMany({
      where: {
        createdAt: { gte: today },
      },
    });

    const pending = breaks.filter((b) => b.status === "pending").length;
    const approved = breaks.filter((b) => b.status === "approved" || b.status === "expired").length;
    const rejected = breaks.filter((b) => b.status === "rejected").length;

    return {
      success: true,
      stats: { pending, approved, rejected },
    };
  } catch (error: any) {
    console.error("Error loading today's break stats:", error);
    return { success: false, error: error.message || "Failed to load today's break stats" };
  }
}
