import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { ProductivityView } from "@/components/features/productivity/ProductivityView";
import { getAllInternsProductivity } from "@/app/actions/productivity";

export default async function ProductivityPage() {
  try {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "super_admin")) {
    redirect("/dashboard"); // Only admin/super_admin can view productivity
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [stats, todayBreaksCount, approvedBreaks] = await Promise.all([
    getAllInternsProductivity().catch(() => []),
    prisma.breakRequest.count({
      where: { createdAt: { gte: todayStart } }
    }).catch(() => 0),
    prisma.breakRequest.findMany({
      where: { status: { in: ["approved", "expired"] } },
      select: { userEmail: true, userName: true, duration: true },
    }).catch(() => []),
  ]);

  const totalBreaksCount = approvedBreaks.length;
  const totalBreakMinutes = approvedBreaks.reduce((sum, b) => sum + b.duration, 0);
  const averageBreakTime = totalBreaksCount > 0 ? Math.round(totalBreakMinutes / totalBreaksCount) : 0;
  const longestBreak = approvedBreaks.length > 0 ? Math.max(...approvedBreaks.map(b => b.duration)) : 0;

  const breakCountByUser: Record<string, { name: string; count: number }> = {};
  approvedBreaks.forEach(b => {
    if (!breakCountByUser[b.userEmail]) {
      breakCountByUser[b.userEmail] = { name: b.userName || b.userEmail.split("@")[0], count: 0 };
    }
    breakCountByUser[b.userEmail].count += 1;
  });

  const mostActiveUsers = Object.values(breakCountByUser)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const breakStats = {
    averageBreakTime,
    breakRequestsToday: todayBreaksCount,
    longestBreak,
    mostActiveUsers
  };

  return (
    <div className="page-stack">
      <ProductivityView stats={stats} breakStats={breakStats} />
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
