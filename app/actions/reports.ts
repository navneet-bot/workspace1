"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function submitReport(data: {
  title: string;
  description: string;
  fileName: string;
  fileData: string;
  submittedBy: string;
}) {
  try {
    const report = await prisma.report.create({ data });
    revalidatePath("/dashboard/reports");
    return { success: true, report };
  } catch (error) {
    return { success: false, error: "Failed to submit report" };
  }
}

export async function reviewReport(id: number) {
  try {
    await prisma.report.update({
      where: { id },
      data: { reviewed: true },
    });
    revalidatePath("/dashboard/reports");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to review report" };
  }
}
