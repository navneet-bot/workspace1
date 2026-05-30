import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { MyTasksKanban } from "@/components/features/tasks/MyTasksKanban";

export default async function MyTasksPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return null; // Layout handles redirect
  }

  const tasks = await prisma.task.findMany({
    where: { assignedTo: session.user.email },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="page-stack">
      <MyTasksKanban initialTasks={tasks} />
    </div>
  );
}
