import { PrismaClient } from '@prisma/client'
import { Pool, neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

async function main() {
  const connectionString = "postgresql://neondb_owner:npg_Ot2Hh4GFaVQS@ep-shy-band-aqfbltvm-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require"
  const adapter = new PrismaNeon({ connectionString })
  const prisma = new PrismaClient({ adapter })
  
  try {
    const count = await prisma.user.count()
    console.log("Users count:", count)
    const users = await prisma.user.findMany({ take: 1 })
    console.log("First user:", users)
  } catch (e) {
    console.error("DB Error:", e)
  } finally {
    await prisma.$disconnect()
  }
}
main()
