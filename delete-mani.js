const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteCandidateCompletely(id) {
  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) return { success: false, error: "Candidate not found" };

  const txOps = [];
  
  txOps.push(prisma.candidate.delete({ where: { id } }));

  if (candidate.resume && candidate.resume.startsWith("LOGIN:")) {
    const parts = candidate.resume.replace("LOGIN:", "").split("|PASS:");
    const jjEmail = parts[0];

    const user = await prisma.user.findUnique({ where: { email: jjEmail } });
    if (user) {
      txOps.push(prisma.user.delete({ where: { id: user.id } }));
      txOps.push(prisma.task.deleteMany({ where: { OR: [{ assignedTo: jjEmail }, { createdBy: jjEmail }] } }));
      txOps.push(prisma.attendance.deleteMany({ where: { email: jjEmail } }));
      txOps.push(prisma.workLog.deleteMany({ where: { email: jjEmail } }));
      txOps.push(prisma.report.deleteMany({ where: { submittedBy: jjEmail } }));
      txOps.push(prisma.chatMessage.deleteMany({ where: { OR: [{ senderId: user.id }, { receiverId: user.id }] } }));
      txOps.push(prisma.groupMessage.deleteMany({ where: { sender: jjEmail } }));
      txOps.push(prisma.project.deleteMany({ where: { createdBy: jjEmail } }));
      txOps.push(prisma.meeting.deleteMany({ where: { createdBy: jjEmail } }));
      txOps.push(prisma.group.deleteMany({ where: { createdBy: jjEmail } }));
      txOps.push(prisma.notification.deleteMany({ where: { targetEmail: jjEmail } }));
      
      console.log(`[Activity Log] Deleted candidate ${candidate.name} and user ${jjEmail}`);
    } else {
      console.log(`[Activity Log] Deleted candidate ${candidate.name} (no user found)`);
    }
  } else {
    console.log(`[Activity Log] Deleted candidate ${candidate.name} (never approved)`);
  }

  await prisma.$transaction(txOps);
  return { success: true };
}

async function main() {
  const candidates = await prisma.candidate.findMany({
    where: { name: { contains: "Maniarasan" } }
  });

  if (candidates.length === 0) {
    console.log("No candidate found named Maniarasan.");
    return;
  }

  for (const c of candidates) {
    console.log(`Deleting candidate ID ${c.id}: ${c.name}...`);
    const res = await deleteCandidateCompletely(c.id);
    if (res.success) {
      console.log(`Successfully deleted ${c.name}`);
    } else {
      console.error(`Failed to delete ${c.name}: ${res.error}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
