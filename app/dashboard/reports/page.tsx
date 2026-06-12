import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { ReportsView } from "@/components/features/reports/ReportsView";

export default async function ReportsPage() {
  try {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect("/login");
  }

  const role = (session.user as any).role || "intern";
  const permissions = (session.user as any).permissions || "";
  const permList = permissions.split(",").map((p: string) => p.trim());
  const canManage = role === "admin" || role === "super_admin" || role === "tutor" || permList.includes("view_reports");

  const allReports = await prisma.report.findMany({
    orderBy: { submittedAt: "desc" }
  }).catch(() => []);

  let reports = [];
  if (role === "admin" || role === "super_admin" || permList.includes("view_reports")) {
    reports = allReports;
  } else if (role === "tutor") {
    reports = allReports.filter(r => {
      if (r.submittedBy === session?.user?.email) return true;
      try {
        const targetEmails = r.submittedTo ? JSON.parse(r.submittedTo) : [];
        return Array.isArray(targetEmails) && targetEmails.includes(session?.user?.email || "");
      } catch {
        return false;
      }
    });
  } else {
    reports = allReports.filter(r => r.submittedBy === session?.user?.email);
  }

  const potentialReviewers = await prisma.user.findMany({
    where: { role: { in: ["admin", "super_admin", "tutor"] } },
    select: { name: true, email: true, role: true }
  }).catch(() => []);

  return (
    <div className="page-stack">
      <ReportsView 
        reports={reports as any} 
        currentUserEmail={session?.user?.email || ""} 
        canManage={canManage} 
        reviewers={potentialReviewers as any}
        currentUserRole={role}
      />
    </div>
  );
  } catch (error: any) {
    if (error?.digest === "DYNAMIC_SERVER_USAGE" || error?.message?.includes("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("SERVER COMPONENT ERROR:", error);
    throw error;
  }
}
