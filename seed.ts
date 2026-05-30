import prisma from "./lib/db";
import bcrypt from "bcryptjs";
async function main() {
  const passwordHash = await bcrypt.hash("123", 10);

  // Upsert Admin
  const admin = await prisma.user.upsert({
    where: { email: "navneet@jobjockey.in" },
    update: {
      password: passwordHash,
      role: "admin",
      name: "Navneet (Admin)",
    },
    create: {
      email: "navneet@jobjockey.in",
      password: passwordHash,
      role: "admin",
      name: "Navneet (Admin)",
    },
  });

  console.log("Upserted admin user:", admin.email);

  // Upsert Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@jobjockey.in" },
    update: {
      password: passwordHash,
      role: "super_admin",
      name: "Navneet (Super Admin)",
    },
    create: {
      email: "superadmin@jobjockey.in",
      password: passwordHash,
      role: "super_admin",
      name: "Navneet (Super Admin)",
    },
  });

  console.log("Upserted super admin user:", superAdmin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
