import { NextResponse } from "next/server";
import { validateEmailConfig } from "@/lib/email/config";
import prisma from "@/lib/db";

export async function GET() {
  const config = validateEmailConfig();

  // Optionally check DB fallback if ENV is not set
  let isDbFallback = false;
  let finalApiKey = config.apiKey;

  if (!finalApiKey) {
    try {
      const dbConfig = await prisma.config.findUnique({ where: { key: "resend_key" } });
      if (dbConfig?.value) {
        finalApiKey = dbConfig.value;
        isDbFallback = true;
      }
    } catch (e) {
      console.error("DB check failed:", e);
    }
  }

  const isConfigured = !!finalApiKey && !!config.fromEmail;

  return NextResponse.json({
    status: isConfigured ? "healthy" : "unconfigured",
    resendConfigured: !!finalApiKey,
    dbFallbackUsed: isDbFallback,
    senderAddressValid: config.fromEmail.includes("@"),
    senderAddress: config.fromEmail || "Not Set",
    message: isConfigured 
      ? "Email infrastructure is ready." 
      : "Email infrastructure is missing required configuration.",
  }, { status: isConfigured ? 200 : 503 });
}
