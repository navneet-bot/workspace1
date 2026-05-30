"use server";

import prisma from "@/lib/db";

export async function getUsersForSelect() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  return users;
}

export async function getProjectsForSelect() {
  const projects = await prisma.project.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return projects;
}

export async function createTask(data: {
  title: string;
  description: string;
  assignedTo?: string;
  priority: string;
  deadline: string;
  project?: string;
  createdBy: string;
}) {
  try {
    await prisma.task.create({ data });
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to create task" };
  }
}
