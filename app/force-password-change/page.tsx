import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import ForcePasswordChangeClient from "./ForcePasswordChangeClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Update Password | Job Jockey",
};

export default async function ForcePasswordChangePage() {
  try {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect("/login");
  }

  // If they don't actually need to change their password, send them back to the dashboard
  if (!user.mustChangePassword) {
    redirect("/dashboard");
  }

  return <ForcePasswordChangeClient userEmail={user.email} />;
  } catch (error: any) {
    if (error?.digest === "DYNAMIC_SERVER_USAGE" || error?.message?.includes("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("SERVER COMPONENT ERROR:", error);
    throw error;
  }
}
