import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { TasksTable } from "@/components/features/tasks/TasksTable";

export default async function TasksPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role === "intern") {
    redirect("/dashboard");
  }

  const tasks = await prisma.task.findMany({
    orderBy: { createdAt: "desc" }
  }).catch(() => []);

  return (
    <div className="page-stack">
      <div className="table-card">
        <TasksTable initialTasks={tasks} />
      </div>
    </div>
  );
}
