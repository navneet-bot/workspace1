import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { NotificationsList } from "@/components/features/notifications/NotificationsList";

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true, email: true, role: true, permissions: true }
  }).catch(() => null);

  if (!currentUser) {
    redirect("/login");
  }

  // Admins and super admins with send_notifications permission can send
  const canSend = currentUser.role === "admin" || (currentUser.role === "super_admin" && currentUser.permissions.includes("send_notifications"));

  const notifications = await prisma.notification.findMany({
    where: {
      OR: [
        { targetEmail: "ALL" },
        { targetEmail: currentUser.email }
      ]
    },
    select: { id: true, title: true, body: true, icon: true, targetEmail: true, read: true, seenBy: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 50
  }).catch(() => []);

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" }
  }).catch(() => []);

  // Calculate local read state (because read/seenBy is technically shared in this simple DB model)
  // In the legacy system, a notification is marked read globally when ANYONE reads it, or locally based on seenBy.
  // We'll update the `read` flag for the UI based on seenBy to make it user-specific.
  const userNotifs: {
    id: number;
    title: string;
    body: string;
    icon: string;
    targetEmail: string;
    read: boolean;
    seenBy: string;
    createdAt: string;
  }[] = notifications.map((n) => {
    let seenBy: string[] = [];
    try { seenBy = JSON.parse(n.seenBy || "[]"); } catch {}
    return {
      ...n,
      read: seenBy.includes(currentUser.email)
      ,
      createdAt: n.createdAt.toISOString()
    };
  });

  return (
    <div className="page-stack">
      <NotificationsList 
        initialNotifications={userNotifs}
        allUsers={users}
        currentUserEmail={currentUser.email}
        canSend={canSend}
      />
    </div>
  );
}
