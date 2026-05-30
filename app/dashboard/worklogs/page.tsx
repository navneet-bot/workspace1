import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { WorkLogsView } from "@/components/features/worklogs/WorkLogsView";

export default async function WorkLogsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!currentUser || currentUser.role === "intern") {
    redirect("/dashboard"); // Only admin/super_admin can view worklogs for now
  }

  const [logs, users] = await Promise.all([
    prisma.workLog.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.user.findMany({
      where: { role: "intern" },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <div className="page-stack">
      <WorkLogsView initialLogs={logs as any} users={users} />
    </div>
  );
}
