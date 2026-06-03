import { Pool, neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

console.log("Database URL exists:", !!process.env.DATABASE_URL);
console.log("Direct URL exists:", !!process.env.DIRECT_URL);
console.log("NextAuth URL exists:", !!process.env.NEXTAUTH_URL);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing");
}
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET is missing");
}

const connectionString = process.env.DATABASE_URL

const poolConfig = { connectionString }
const adapter = new PrismaNeon(poolConfig)
const prisma = new PrismaClient({ adapter })

// Touched to reload the Prisma Client with updated schema
export default prisma;
