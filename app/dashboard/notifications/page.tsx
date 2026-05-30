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
    where: { email: session.user.email }
  });

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
    orderBy: { createdAt: "desc" }
  });

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" }
  });

  // Calculate local read state (because read/seenBy is technically shared in this simple DB model)
  // In the legacy system, a notification is marked read globally when ANYONE reads it, or locally based on seenBy.
  // We'll update the `read` flag for the UI based on seenBy to make it user-specific.
  const userNotifs = notifications.map(n => {
    let seenBy: string[] = [];
    try { seenBy = JSON.parse(n.seenBy || "[]"); } catch {}
    return {
      ...n,
      read: seenBy.includes(currentUser.email)
    };
  });

  return (
    <div className="page-stack">
      <NotificationsList 
        initialNotifications={userNotifs as any} 
        allUsers={users}
        currentUserEmail={currentUser.email}
        canSend={canSend}
      />
    </div>
  );
}
