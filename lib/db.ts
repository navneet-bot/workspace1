import { PrismaClient } from '@prisma/client'

console.log("Database URL exists:", !!process.env.DATABASE_URL);
console.log("Direct URL exists:", !!process.env.DIRECT_URL);
console.log("NextAuth URL exists:", !!process.env.NEXTAUTH_URL);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing");
}
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET is missing");
}

// Global PrismaClient definition to prevent hot reloading issues in development
const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
