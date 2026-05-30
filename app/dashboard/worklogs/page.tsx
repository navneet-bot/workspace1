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

  let currentUser = await prisma.user.findUnique({
    where: { email: session.user.email }
  }).catch(() => null);

  if (!currentUser) {
    currentUser = {
      id: parseInt((session.user as any).id || "0"),
      email: session.user.email,
      name: session.user.name || "User",
      role: (session.user as any).role || "intern",
      permissions: (session.user as any).permissions || "",
      password: "",
      mustChangePassword: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
  }

  if (currentUser.role === "intern") {
    redirect("/dashboard"); // Only admin/super_admin can view worklogs for now
  }

  const [logs, users] = await Promise.all([
    prisma.workLog.findMany({ orderBy: { createdAt: "desc" } }).catch(() => []),
    prisma.user.findMany({
      where: { role: "intern" },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" }
    }).catch(() => [])
  ]);

  return (
    <div className="page-stack">
      <WorkLogsView initialLogs={logs as any} users={users} />
    </div>
  );
}
