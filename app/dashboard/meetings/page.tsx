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

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!currentUser) {
    redirect("/login");
  }

  const role = currentUser.role;
  const canManage = role !== "intern";

  let meetings = await prisma.meeting.findMany({
    orderBy: { createdAt: "desc" }
  });

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
  });

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
