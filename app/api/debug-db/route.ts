import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const dms = await prisma.chatMessage.findMany();
  const groups = await prisma.groupMessage.findMany();
  return NextResponse.json({ dms, groups });
}
