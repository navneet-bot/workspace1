import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { CandidatesTable } from "@/components/features/candidates/CandidatesTable";

export default async function CandidatesPage() {
  try {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role === "intern") {
    redirect("/dashboard");
  }

  const candidates = await prisma.candidate.findMany({
    orderBy: { appliedAt: "desc" }
  }).catch(() => []);

  return (
    <div className="page-stack">
      <CandidatesTable initialCandidates={candidates} />
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
