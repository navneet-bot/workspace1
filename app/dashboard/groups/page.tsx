import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { GroupsGrid } from "@/components/features/groups/GroupsGrid";

export default async function GroupsPage() {
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

  let groups = await prisma.group.findMany({
    orderBy: { createdAt: "desc" }
  }).catch(() => []);

  // Intern sees only groups they are in
  if (!canManage) {
    groups = groups.filter(g => {
      let members = [];
      try {
        members = JSON.parse(g.members || "[]");
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
      <GroupsGrid 
        initialGroups={groups}
        allUsers={users}
        canManage={canManage}
        currentUserEmail={currentUser.email}
      />
    </div>
  );
}
