"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createMeeting(data: {
  title: string;
  description: string;
  date: string;
  time: string;
  meetLink: string;
  members: string;
  createdBy: string;
}) {
  try {
    const meeting = await prisma.meeting.create({ data });
    
    // Notify all invited members except the creator
    let memberEmails: string[] = [];
    try {
      memberEmails = JSON.parse(data.members || "[]");
    } catch {}

    const creatorName = data.createdBy ? data.createdBy.split("@")[0] : "Admin";

    for (const email of memberEmails) {
      if (email !== data.createdBy) {
        await prisma.notification.create({
          data: {
            title: `📅 New Meeting: ${data.title}`,
            body: `Scheduled by ${creatorName} for ${data.date} at ${data.time}.${data.description ? ` Details: ${data.description}` : ""}`,
            icon: "📅",
            targetEmail: email
          }
        });
      }
    }

    revalidatePath("/dashboard/meetings");
    revalidatePath("/dashboard/notifications");
    return { success: true, meeting };
  } catch (error) {
    return { success: false, error: "Failed to create meeting" };
  }
}

export async function deleteMeeting(id: number) {
  try {
    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (meeting) {
      let memberEmails: string[] = [];
      try {
        memberEmails = JSON.parse(meeting.members || "[]");
      } catch {}

      // Delete corresponding notifications
      await prisma.notification.deleteMany({
        where: {
          title: `📅 New Meeting: ${meeting.title}`,
          targetEmail: { in: memberEmails },
          icon: "📅"
        }
      });

      await prisma.meeting.delete({ where: { id } });
    }
    revalidatePath("/dashboard/meetings");
    revalidatePath("/dashboard/notifications");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete meeting" };
  }
}
