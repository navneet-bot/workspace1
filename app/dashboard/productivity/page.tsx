import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { ProductivityView, ProductivityStat } from "@/components/features/productivity/ProductivityView";

export default async function ProductivityPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!currentUser || currentUser.role === "intern") {
    redirect("/dashboard"); // Only admin/super_admin can view productivity
  }

  const users = await prisma.user.findMany({
    where: { role: "intern" },
    select: { email: true, name: true, role: true }
  });

  if (!users.length) {
    return (
      <div className="page-stack">
        <ProductivityView stats={[]} />
      </div>
    );
  }

  const [tasks, attendance, reports] = await Promise.all([
    prisma.task.findMany(),
    prisma.attendance.findMany(),
    prisma.report.findMany()
  ]);

  const stats: ProductivityStat[] = users.map((u) => {
    // Tasks
    const userTasks = tasks.filter((t) => t.assignedTo === u.email);
    const tasks_total = userTasks.length;
    const tasks_done = userTasks.filter((t) => t.status === "Completed").length;
    const tasks_in_progress = userTasks.filter((t) => t.status === "In Progress").length;
    const tasks_pending = userTasks.filter((t) => t.status === "Pending").length;
    const task_score = tasks_total > 0 ? Math.round((tasks_done / tasks_total) * 100) : 0;

    // Attendance
    const userAtt = attendance.filter((a) => a.email === u.email);
    const present = userAtt.filter((a) => a.status === "Present").length;
    const absent = userAtt.filter((a) => a.status === "Absent").length;
    const leave = userAtt.filter((a) => a.status === "Leave").length;
    const total_days = present + absent + leave;
    const att_score = total_days > 0 ? Math.round((present / total_days) * 100) : 0;

    // Reports
    const userReports = reports.filter((r) => r.submittedBy === u.email);
    const reports_submitted = userReports.length;
    const reports_reviewed = userReports.filter((r) => r.reviewed).length;

    // Overall formula (ts * 0.6 + as * 0.4)
    let overall = (task_score * 0.6) + (att_score * 0.4);
    if (tasks_total === 0 && total_days === 0) overall = 0;

    return {
      name: u.name,
      email: u.email,
      role: u.role,
      tasks_total,
      tasks_done,
      tasks_in_progress,
      tasks_pending,
      task_score,
      present,
      absent,
      leave,
      att_score,
      reports_submitted,
      reports_reviewed,
      overall_score: Math.round(overall)
    };
  });

  // Sort by overall score descending
  stats.sort((a, b) => b.overall_score - a.overall_score);

  return (
    <div className="page-stack">
      <ProductivityView stats={stats} />
    </div>
  );
}
