import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { UsersView } from "@/components/features/users/UsersView";

export default async function UsersPage() {
  try {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!currentUser || currentUser.role !== "admin") {
    redirect("/dashboard"); // Only admin can access this route
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" }
  }).catch(() => []);

  return (
    <div className="page-stack">
      <UsersView initialUsers={users} />
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
