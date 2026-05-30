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
