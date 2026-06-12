import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import ForcePasswordChangeClient from "./ForcePasswordChangeClient";

export const metadata = {
  title: "Update Password | Job Jockey",
};

export default async function ForcePasswordChangePage() {
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
}
