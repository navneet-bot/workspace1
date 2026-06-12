import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { MobileOverlay } from "@/components/layout/MobileOverlay";
import { PageBody } from "@/components/layout/PageBody";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  // FORCE PASSWORD CHANGE CHECK
  let dbUser = null;
  try {
    const prisma = (await import("@/lib/db")).default;
    dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { mustChangePassword: true }
    });
  } catch (error) {
    console.error("Database connection error in layout:", error);
  }

  if (dbUser?.mustChangePassword) {
    redirect("/force-password-change");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-jj-bg text-jj-text font-sans">
      <Sidebar userRole={(session?.user as any)?.role} />
      <MobileOverlay />
      
      <div className="flex min-w-0 flex-1 flex-col bg-jj-bg overflow-hidden">
        <DashboardHeader userEmail={session.user.email} />
        <div className="flex min-h-0 flex-1 flex-col">
          <PageBody>
          {children}
          </PageBody>
        </div>
      </div>
    </div>
  );
  } catch (error) {
    console.error("SERVER COMPONENT ERROR:", error);
    throw error;
  }
}
