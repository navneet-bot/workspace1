import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { SettingsView } from "@/components/features/settings/SettingsView";

export default async function SettingsPage() {
  try {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email }
  }).catch(() => null);

  if (!currentUser) {
    redirect("/login");
  }

  // Get candidate info for interns
  let candidateInfo = null;
  if (currentUser.role === "intern") {
    const candidate = await prisma.candidate.findFirst({ where: { email: currentUser.email } }).catch(() => null);
    if (candidate) {
      candidateInfo = {
        phone: candidate.phone || "",
        skill: candidate.skill || "",
        state: candidate.state || "",
        college: candidate.college || "",
        edu_domain: candidate.eduDomain || "",
        resume_link: candidate.resumeLink || "",
      };
    }
  }

  // Get Email config for admins
  const config = await prisma.config.findMany({
    where: { key: "resend_key" }
  }).catch(() => []);
  
  const emailConfig = {
    resendKey: config.find(c => c.key === "resend_key")?.value || ""
  };

  return (
    <div className="page-stack">
      <SettingsView 
        userRole={currentUser.role}
        userEmail={currentUser.email}
        userName={currentUser.name}
        candidateInfo={candidateInfo}
        emailConfig={emailConfig}
      />
    </div>
  );
  } catch (error) {
    console.error("SERVER COMPONENT ERROR:", error);
    throw error;
  }
}
