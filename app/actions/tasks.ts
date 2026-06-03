"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateTaskStatus(taskId: number, newStatus: string) {
  try {
    await prisma.task.update({
      where: { id: taskId },
      data: { 
        status: newStatus,
        completedAt: newStatus === "Completed" ? new Date() : null,
      },
    });
    revalidatePath("/dashboard/mytasks");
    revalidatePath("/dashboard/tasks");
    return { success: true };
  } catch (error) {
    console.error("Failed to update task status:", error);
    return { success: false, error: "Failed to update task status" };
  }
}
