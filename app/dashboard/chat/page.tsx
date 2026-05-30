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

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!currentUser) {
    redirect("/login");
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" }
  });

  const groups = await prisma.group.findMany({
    orderBy: { name: "asc" }
  });

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
