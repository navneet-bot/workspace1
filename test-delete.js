const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const candidate = await prisma.candidate.create({
    data: {
      name: 'Test Delete Candidate',
      email: 'testdelete@example.com',
      resume: 'LOGIN:testdelete@jobjockey.in|PASS:ABC123'
    }
  });
  
  const user = await prisma.user.create({
    data: {
      name: 'Test Delete User',
      email: 'testdelete@jobjockey.in',
      password: 'hash'
    }
  });

  await prisma.task.create({
    data: {
      title: 'Test Task',
      assignedTo: 'testdelete@jobjockey.in'
    }
  });

  console.log("Setup complete. Candidate ID:", candidate.id, "User ID:", user.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
