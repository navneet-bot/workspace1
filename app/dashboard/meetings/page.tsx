import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { MeetingsList } from "@/components/features/meetings/MeetingsList";

export default async function MeetingsPage() {
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

  const role = currentUser.role;
  const canManage = role !== "intern";

  let meetings = await prisma.meeting.findMany({
    orderBy: { createdAt: "desc" }
  }).catch(() => []);

  // Intern sees only meetings they are invited to
  if (!canManage) {
    meetings = meetings.filter(m => {
      let members = [];
      try {
        members = JSON.parse(m.members || "[]");
      } catch (e) {}
      return members.includes(currentUser.email);
    });
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" }
  }).catch(() => []);

  return (
    <div className="page-stack">
      <MeetingsList 
        initialMeetings={meetings}
        allUsers={users}
        canManage={canManage}
        currentUserEmail={currentUser.email}
      />
    </div>
  );
}
