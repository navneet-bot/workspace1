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
  const permissions = (session.user as any).permissions || "";
  const permList = permissions.split(",").map((p: string) => p.trim());
  const canManage = role === "admin" || role === "super_admin" || role === "tutor" || permList.includes("view_reports");

  const reports = await prisma.report.findMany({
    where: canManage ? undefined : { submittedBy: session.user.email },
    orderBy: { submittedAt: "desc" }
  }).catch(() => []);

  const potentialReviewers = await prisma.user.findMany({
    where: { role: { in: ["admin", "super_admin", "tutor"] } },
    select: { name: true, email: true, role: true }
  }).catch(() => []);

  return (
    <div className="page-stack">
      <ReportsView 
        reports={reports} 
        currentUserEmail={session.user.email} 
        canManage={canManage} 
        reviewers={potentialReviewers as any}
      />
    </div>
  );
}
