"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function sendNotification(data: {
  title: string;
  body: string;
  icon: string;
  targetEmail: string;
}) {
  try {
    await prisma.notification.create({ data });
    revalidatePath("/dashboard/notifications");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to send notification" };
  }
}

export async function markRead(id: number, userEmail: string) {
  try {
    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif) return { success: false, error: "Not found" };

    let seenBy: string[] = [];
    try {
      seenBy = JSON.parse(notif.seenBy || "[]");
    } catch {}

    if (!seenBy.includes(userEmail)) {
      seenBy.push(userEmail);
    }

    await prisma.notification.update({
      where: { id },
      data: {
        read: true,
        seenBy: JSON.stringify(seenBy)
      }
    });

    revalidatePath("/dashboard/notifications");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to mark read" };
  }
}

export async function markAllRead(userEmail: string, targetEmail: string) {
  try {
    // simplified: just marks all visible as read
    const notifs = await prisma.notification.findMany({
      where: {
        OR: [
          { targetEmail: "ALL" },
          { targetEmail: targetEmail }
        ],
        read: false
      }
    });

    for (const n of notifs) {
      let seenBy: string[] = [];
      try { seenBy = JSON.parse(n.seenBy || "[]"); } catch {}
      if (!seenBy.includes(userEmail)) seenBy.push(userEmail);
      await prisma.notification.update({
        where: { id: n.id },
        data: { read: true, seenBy: JSON.stringify(seenBy) }
      });
    }

    revalidatePath("/dashboard/notifications");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to mark all read" };
  }
}

export async function clearAllNotifications(targetEmail: string) {
  try {
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { targetEmail: "ALL" },
          { targetEmail: targetEmail }
        ]
      }
    });
    revalidatePath("/dashboard/notifications");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to clear notifications" };
  }
}

export async function deleteNotification(id: number) {
  try {
    await prisma.notification.delete({ where: { id } });
    revalidatePath("/dashboard/notifications");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete" };
  }
}

export async function getUserNotifications(userEmail: string) {
  try {
    const notifs = await prisma.notification.findMany({
      where: {
        OR: [
          { targetEmail: "ALL" },
          { targetEmail: userEmail }
        ]
      },
      orderBy: { id: "desc" },
      take: 15
    });
    // Serialize Dates
    const serialized = notifs.map(n => ({
      ...n,
      createdAt: n.createdAt.toISOString()
    }));
    return { success: true, notifications: serialized };
  } catch (error: any) {
    return { success: false, notifications: [], error: error.message };
  }
}

