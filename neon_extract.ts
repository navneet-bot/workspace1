/**
 * Emergency data extraction script for Neon → Supabase migration.
 * Uses standard PrismaClient (no Neon adapter) to extract all data as JSON.
 * Run with: npx tsx neon_extract.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_Ot2Hh4GFaVQS@ep-shy-band-aqfbltvm-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function main() {
  console.log("Connecting to Neon...")
  
  try {
    // Test connection first
    const testResult = await prisma.$queryRaw`SELECT 1 as ok`
    console.log("✅ Connected to Neon:", testResult)
  } catch (e: any) {
    console.error("❌ Cannot connect to Neon:", e.message)
    console.error("\nNeon has exceeded its data transfer quota.")
    console.error("Options:")
    console.error("  1. Upgrade Neon plan temporarily to allow data transfer")
    console.error("  2. Wait for quota reset (usually monthly)")  
    console.error("  3. Use Neon dashboard to export data manually")
    process.exit(1)
  }

  const data: Record<string, any> = {}
  
  console.log("\nExtracting data from all tables...")
  
  data.users = await prisma.user.findMany()
  console.log(`  users: ${data.users.length} records`)
  
  data.tasks = await prisma.task.findMany()
  console.log(`  tasks: ${data.tasks.length} records`)
  
  data.projects = await prisma.project.findMany()
  console.log(`  projects: ${data.projects.length} records`)
  
  data.candidates = await prisma.candidate.findMany()
  console.log(`  candidates: ${data.candidates.length} records`)
  
  data.attendance = await prisma.attendance.findMany()
  console.log(`  attendance: ${data.attendance.length} records`)
  
  data.reports = await prisma.report.findMany()
  console.log(`  reports: ${data.reports.length} records`)
  
  data.groups = await prisma.group.findMany()
  console.log(`  groups: ${data.groups.length} records`)
  
  data.meetings = await prisma.meeting.findMany()
  console.log(`  meetings: ${data.meetings.length} records`)
  
  data.notifications = await prisma.notification.findMany()
  console.log(`  notifications: ${data.notifications.length} records`)
  
  data.workLogs = await prisma.workLog.findMany()
  console.log(`  work_logs: ${data.workLogs.length} records`)
  
  data.groupMessages = await prisma.groupMessage.findMany()
  console.log(`  group_messages: ${data.groupMessages.length} records`)
  
  data.chatMessages = await prisma.chatMessage.findMany()
  console.log(`  chat_messages: ${data.chatMessages.length} records`)
  
  data.config = await prisma.config.findMany()
  console.log(`  config: ${data.config.length} records`)
  
  data.tutors = await prisma.tutor.findMany()
  console.log(`  tutors: ${data.tutors.length} records`)
  
  data.breakRequests = await prisma.breakRequest.findMany()
  console.log(`  break_requests: ${data.breakRequests.length} records`)

  // Write to file
  const fs = await import('fs')
  fs.writeFileSync('neon_data_export.json', JSON.stringify(data, null, 2))
  console.log("\n✅ Data exported to neon_data_export.json")
  
  // Print summary
  const totalRecords = Object.values(data).reduce((sum: number, arr: any[]) => sum + arr.length, 0)
  console.log(`\n📊 Total: ${Object.keys(data).length} tables, ${totalRecords} records`)
  
  await prisma.$disconnect()
}

main().catch(console.error)
