import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { ReportsView } from "@/components/features/reports/ReportsView";

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect("/login");
  }

  const role = (session.user as any).role || "intern";
  const canManage = role !== "intern";

  const reports = await prisma.report.findMany({
    where: canManage ? undefined : { submittedBy: session.user.email },
    orderBy: { submittedAt: "desc" }
  });

  return (
    <div className="page-stack">
      <ReportsView 
        reports={reports} 
        currentUserEmail={session.user.email} 
        canManage={canManage} 
      />
    </div>
  );
}
