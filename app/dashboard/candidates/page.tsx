import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { CandidatesTable } from "@/components/features/candidates/CandidatesTable";

export default async function CandidatesPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role === "intern") {
    redirect("/dashboard");
  }

  const candidates = await prisma.candidate.findMany({
    orderBy: { appliedAt: "desc" }
  });

  return (
    <div className="page-stack">
      <CandidatesTable initialCandidates={candidates} />
    </div>
  );
}
