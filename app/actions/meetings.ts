"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function deleteExpiredMeetings() {
  try {
    const now = new Date();
    const meetings = await prisma.meeting.findMany();
    const expiredIds: number[] = [];

    for (const m of meetings) {
      if (!m.date) continue;

      const isRecurring = m.recurrenceType !== "none";

      if (isRecurring) {
        if (m.recurrenceEndDate && m.recurrenceEndDate >= m.date) {
          const [ey, em, ed] = m.recurrenceEndDate.split("-").map(Number);
          const endDay = new Date(ey, em - 1, ed, 23, 59, 59);
          if (now <= endDay) continue;
        } else {
          continue;
        }
      }

      const endT = m.endTime || "00:00";
      const [year, month, day] = m.date.split("-").map(Number);
      const [hours, minutes] = endT.split(":").map(Number);
      
      const pad = (n: number) => String(n).padStart(2, "0");
      const isoStr = `${pad(year)}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00+05:30`;
      const meetingEndDateTime = new Date(isoStr);
      
      if (now > meetingEndDateTime) {
        expiredIds.push(m.id);
      }
    }

    if (expiredIds.length > 0) {
      for (const id of expiredIds) {
        const meeting = meetings.find(m => m.id === id);
        if (meeting) {
          let memberEmails: string[] = [];
          try {
            memberEmails = JSON.parse(meeting.members || "[]");
          } catch {}
          await prisma.notification.deleteMany({
            where: {
              title: `📅 New Meeting: ${meeting.title}`,
              targetEmail: { in: memberEmails },
              icon: "📅"
            }
          });
        }
      }

      await prisma.meeting.deleteMany({
        where: { id: { in: expiredIds } }
      });
      console.log(`Deleted ${expiredIds.length} expired meetings.`);
    }
  } catch (error) {
    console.error("Failed to delete expired meetings:", error);
  }
}

export async function createMeeting(data: {
  title: string;
  description: string;
  date: string;
  time: string;
  endTime?: string;
  meetLink: string;
  members: string;
  createdBy: string;
  recurrenceType?: string;
  recurrenceInterval?: number;
  recurrenceEndDate?: string;
}) {
  try {
    const meeting = await prisma.meeting.create({
      data: {
        title: data.title,
        description: data.description,
        date: data.date,
        time: data.time,
        endTime: data.endTime,
        meetLink: data.meetLink,
        members: data.members,
        createdBy: data.createdBy,
        recurrenceType: data.recurrenceType || "none",
        recurrenceInterval: data.recurrenceInterval || null,
        recurrenceEndDate: data.recurrenceEndDate || null,
      }
    });
    
    // Notify all invited members except the creator
    let memberEmails: string[] = [];
    try {
      memberEmails = JSON.parse(data.members || "[]");
    } catch {}
 
    const creatorName = data.createdBy ? data.createdBy.split("@")[0] : "Admin";
    const timeRangeStr = data.endTime 
      ? `from ${data.time} to ${data.endTime}`
      : `at ${data.time}`;

    let recurrenceNote = "";
    if (data.recurrenceType === "daily") {
      recurrenceNote = data.recurrenceEndDate ? ` Repeats daily until ${data.recurrenceEndDate}.` : " Repeats daily.";
    } else if (data.recurrenceType === "custom" && data.recurrenceInterval) {
      recurrenceNote = data.recurrenceEndDate ? ` Repeats every ${data.recurrenceInterval} days until ${data.recurrenceEndDate}.` : ` Repeats every ${data.recurrenceInterval} days.`;
    }
 
    for (const email of memberEmails) {
      if (email !== data.createdBy) {
        await prisma.notification.create({
          data: {
            title: `📅 New Meeting: ${data.title}`,
            body: `Scheduled by ${creatorName} for ${data.date} ${timeRangeStr}.${data.description ? ` Details: ${data.description}` : ""}${recurrenceNote}`,
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
