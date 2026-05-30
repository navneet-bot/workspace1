"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createProject(data: {
  name: string;
  description: string;
  status: string;
  progress: number;
  color: string;
  createdBy: string;
}) {
  try {
    await prisma.project.create({ data });
    revalidatePath("/dashboard/projects");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to create project" };
  }
}

export async function updateProject(id: number, data: {
  name?: string;
  description?: string;
  status?: string;
  progress?: number;
  color?: string;
}) {
  try {
    await prisma.project.update({
      where: { id },
      data,
    });
    revalidatePath("/dashboard/projects");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update project" };
  }
}

export async function deleteProject(id: number) {
  try {
    await prisma.project.delete({ where: { id } });
    revalidatePath("/dashboard/projects");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete project" };
  }
}
