"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function promoteUser(id: number) {
  try {
    await prisma.user.update({
      where: { id },
      data: { role: "super_admin" },
    });
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to promote user" };
  }
}

export async function demoteUser(id: number) {
  try {
    await prisma.user.update({
      where: { id },
      data: { role: "intern", permissions: "" },
    });
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to demote user" };
  }
}

export async function updateUserRole(id: number, role: string) {
  try {
    await prisma.user.update({
      where: { id },
      data: {
        role,
        permissions: role === "super_admin" ? undefined : "",
      },
    });
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update role" };
  }
}

export async function updateUserPermissions(id: number, permissions: string) {
  try {
    await prisma.user.update({
      where: { id },
      data: { permissions },
    });
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update permissions" };
  }
}

export async function deleteUser(id: number) {
  try {
    await prisma.user.delete({ where: { id } });
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete user" };
  }
}
