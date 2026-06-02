import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { TutorProfileView } from "@/components/features/tutors/TutorProfileView";

export default async function TutorDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect("/login");
  }

  const role = (session.user as any).role || "intern";
  const permissions = (session.user as any).permissions || "";
  const permList = permissions.split(",").map((p: string) => p.trim());

  if (role === "intern" || (role === "super_admin" && !permList.includes("view_tutors"))) {
    redirect("/dashboard");
  }

  const id = parseInt(params.id);
  if (isNaN(id)) {
    notFound();
  }

  const tutor = await prisma.tutor.findUnique({
    where: { id }
  });

  if (!tutor) {
    notFound();
  }

  const serializedTutor = {
    ...tutor,
    createdAt: tutor.createdAt.toISOString(),
    updatedAt: tutor.updatedAt.toISOString()
  };

  return (
    <div className="page-stack">
      <TutorProfileView tutor={serializedTutor as any} />
    </div>
  );
}
