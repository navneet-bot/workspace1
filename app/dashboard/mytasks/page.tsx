import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { MyTasksKanban } from "@/components/features/tasks/MyTasksKanban";

export default async function MyTasksPage() {
  try {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return null; // Layout handles redirect
  }

  const [tasks, currentUser] = await Promise.all([
    prisma.task.findMany({
      where: { assignedTo: session.user.email },
      orderBy: { createdAt: "desc" }
    }).catch(() => []),
    prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, username: true, email: true },
    }).catch(() => null),
  ]);

  return (
    <div className="page-stack">
      <MyTasksKanban initialTasks={tasks} currentUser={currentUser} />
    </div>
  );
  } catch (error) {
    console.error("SERVER COMPONENT ERROR:", error);
    throw error;
  }
}
