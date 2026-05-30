"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getWorkLogs(email?: string) {
  try {
    const logs = await prisma.workLog.findMany({
      where: email ? { email } : {},
      orderBy: { createdAt: "desc" }
    });
    return { success: true, logs };
  } catch (error: any) {
    return { success: false, logs: [], error: error.message };
  }
}

export async function submitWorkLog(data: {
  email: string;
  name: string;
  loginTime: string;
  logoutTime: string;
  workAssigned: string;
  workDid: string;
  hoursWorked: string;
  issues: string;
  resolved: string;
  startedAt: string;
  completedAt: string;
}) {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const log = await prisma.workLog.create({
      data: {
        email: data.email,
        name: data.name,
        loginTime: data.loginTime,
        logoutTime: data.logoutTime,
        workAssigned: data.workAssigned,
        workDid: data.workDid,
        hoursWorked: data.hoursWorked,
        issues: data.issues,
        resolved: data.resolved,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
        date: todayStr
      }
    });

    revalidatePath("/dashboard/worklogs");
    revalidatePath("/dashboard");
    return { success: true, log };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
