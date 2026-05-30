import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { ChatView } from "@/components/features/chat/ChatView";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ select?: string }> | { select?: string };
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect("/login");
  }

  const resolvedParams = await searchParams;
  const select = resolvedParams?.select || null;

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

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" }
  }).catch(() => []);

  const groups = await prisma.group.findMany({
    orderBy: { name: "asc" }
  }).catch(() => []);

  // Serialize group dates and convert structure
  const serializedGroups = groups.map(g => ({
    id: g.id,
    name: g.name,
    description: g.description,
    icon: g.icon,
    members: g.members,
    createdBy: g.createdBy,
    createdAt: g.createdAt.toISOString()
  }));

  return (
    <div className="h-full">
      <ChatView 
        currentUser={{ id: currentUser.id, role: currentUser.role, email: currentUser.email }} 
        users={users} 
        groups={serializedGroups}
        initialSelectedContactId={select}
      />
    </div>
  );
}
