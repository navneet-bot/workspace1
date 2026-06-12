import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { TasksTable } from "@/components/features/tasks/TasksTable";

export default async function TasksPage() {
  try {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect("/login");
  }

  const role = (session.user as any).role || "intern";
  const permissions = (session.user as any).permissions || "";
  const permList = permissions.split(",").map((p: string) => p.trim());

  const canManage = role === "admin" || role === "super_admin" || role === "tutor" || permList.includes("manage_tasks");
  if (!canManage) {
    redirect("/dashboard");
  }

  const [tasks, users] = await Promise.all([
    prisma.task.findMany({
      orderBy: { createdAt: "desc" }
    }).catch(() => []),
    prisma.user.findMany({
      select: { id: true, name: true, username: true, email: true }
    }).catch(() => [])
  ]);

  const userByEmail = new Map(users.map((user) => [user.email, user]));
  const tasksWithAssignees = tasks.map((task) => ({
    ...task,
    assignee: task.assignedTo ? userByEmail.get(task.assignedTo) || null : null,
  }));

  return (
    <div className="page-stack">
      <div className="table-card">
        <TasksTable initialTasks={tasksWithAssignees} assigneeUsers={users} />
      </div>
    </div>
  );
  } catch (error) {
    console.error("SERVER COMPONENT ERROR:", error);
    throw error;
  }
}
