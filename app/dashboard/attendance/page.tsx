import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { AttendanceView } from "@/components/features/attendance/AttendanceView";

export default async function AttendancePage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as any).role || "intern";
  const permissions = (session.user as any).permissions || "";
  
  const users = await prisma.user.findMany({
    select: { name: true, email: true, role: true },
    orderBy: { name: "asc" }
  });

  const attendance = await prisma.attendance.findMany();

  return (
    <div className="page-stack">
      <AttendanceView 
        role={role} 
        permissions={permissions}
        currentUserEmail={session.user.email!}
        users={users}
        attendance={attendance}
      />
    </div>
  );
}
