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
    revalidatePath("/dashboard/meetings");
    return { success: true, meeting };
  } catch (error) {
    return { success: false, error: "Failed to create meeting" };
  }
}

export async function deleteMeeting(id: number) {
  try {
    await prisma.meeting.delete({ where: { id } });
    revalidatePath("/dashboard/meetings");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete meeting" };
  }
}
