import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { ProjectsGrid } from "@/components/features/projects/ProjectsGrid";

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role === "intern") {
    redirect("/dashboard");
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email || "" }
  });

  const canManage = currentUser?.role === "admin" || currentUser?.role === "super_admin";
  const userEmail = session.user.email || "";

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" }
  }).catch(() => []);

  return (
    <div className="page-stack">
      <ProjectsGrid 
        initialProjects={projects} 
        canManage={canManage}
        currentUserEmail={userEmail}
      />
    </div>
  );
}
