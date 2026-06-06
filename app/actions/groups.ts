"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createGroup(data: {
  name: string;
  description: string;
  icon: string;
  members: string;
  createdBy: string;
}) {
  try {
    const group = await prisma.group.create({ data });
    revalidatePath("/dashboard/groups");
    return { success: true, group };
  } catch (error) {
    return { success: false, error: "Failed to create group" };
  }
}

export async function deleteGroup(id: number) {
  try {
    await prisma.group.delete({ where: { id } });
    revalidatePath("/dashboard/groups");
    revalidatePath("/dashboard/chat");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete group" };
  }
}

export async function renameGroup(id: number, newName: string) {
  try {
    const group = await prisma.group.update({
      where: { id },
      data: { name: newName }
    });
    revalidatePath("/dashboard/groups");
    revalidatePath("/dashboard/chat");
    return { success: true, group };
  } catch (error) {
    return { success: false, error: "Failed to rename group" };
  }
}

export async function updateGroup(id: number, data: {
  name?: string;
  description?: string;
  icon?: string;
  members?: string;
}) {
  try {
    const group = await prisma.group.update({
      where: { id },
      data
    });
    revalidatePath("/dashboard/groups");
    revalidatePath("/dashboard/chat");
    return { success: true, group };
  } catch (error) {
    return { success: false, error: "Failed to update group" };
  }
}
