"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { dispatchEmail } from "@/lib/email/resend";

export async function updateCandidateInfo(email: string, data: any) {
  try {
    // Only update if candidate exists for this email
    const candidate = await prisma.candidate.findFirst({ where: { email } });
    if (!candidate) {
      // Create if it doesn't exist for intern tracking
      await prisma.candidate.create({
        data: {
          email,
          name: data.name || "Intern",
          phone: data.phone || "",
          skill: data.skill || "",
          state: data.state || "",
          college: data.college || "",
          eduDomain: data.edu_domain || "",
          resumeLink: data.resume_link || "",
        }
      });
    } else {
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          phone: data.phone || "",
          skill: data.skill || "",
          state: data.state || "",
          college: data.college || "",
          eduDomain: data.edu_domain || "",
          resumeLink: data.resume_link || "",
        }
      });
    }
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update info" };
  }
}

export async function saveEmailConfig(resendKey: string) {
  try {
    if (resendKey && resendKey !== "********") {
      await prisma.config.upsert({
        where: { key: "resend_key" },
        update: { value: resendKey },
        create: { key: "resend_key", value: resendKey }
      });
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to save config" };
  }
}

export async function changePassword(email: string, currentPass: string, newPass: string) {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { success: false, error: "User not found" };
    }

    const isCorrectPassword = await bcrypt.compare(currentPass, user.password);
    if (!isCorrectPassword && currentPass !== user.password) {
      return { success: false, error: "Current password is incorrect" };
    }

    const hashedNewPassword = await bcrypt.hash(newPass, 10);
    await prisma.user.update({
      where: { email },
      data: { 
        password: hashedNewPassword,
        mustChangePassword: false
      },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to change password" };
  }
}

export async function sendCustomEmail(data: {
  toEmail: string;
  toName: string;
  subject: string;
  message: string;
}) {
  try {
    const toEmail = data.toEmail.trim();
    const toName = data.toName.trim() || toEmail.split("@")[0];
    const subject = data.subject.trim();
    const message = data.message.trim();

    if (!toEmail || !toEmail.includes("@")) {
      return { success: false, error: "Invalid recipient email" };
    }
    if (!subject) {
      return { success: false, error: "Subject is required" };
    }

    const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:12px;overflow:hidden">
      <div style="background:#f59e0b;padding:20px 24px;text-align:center">
        <h1 style="margin:0;color:#000;font-size:22px">Job Jockey</h1>
        <p style="margin:4px 0 0;color:#1e293b;font-size:12px">Intern Management Platform</p>
      </div>
      <div style="padding:28px 32px">
        <p style="margin:0 0 8px;color:#94a3b8;font-size:13px">Hi <strong style="color:#f59e0b">${toName}</strong>,</p>
        <div style="font-size:14px;line-height:1.7;white-space:pre-wrap;color:#e2e8f0">${message}</div>
        <p style="margin:24px 0 0;color:#64748b;font-size:12px">— Job Jockey Team</p>
      </div>
    </div>`;

    const res = await dispatchEmail(toEmail, subject, htmlBody);
    return { success: true, id: res.id };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to send email" };
  }
}

export async function sendTestEmailAction() {
  try {
    const smtpEmailConfig = await prisma.config.findUnique({ where: { key: "smtp_email" } });
    const toAddr = smtpEmailConfig?.value || "admin@jobjockey.in";

    const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:12px;padding:28px">
      <h2 style="color:#f59e0b;margin-top:0">✅ Test Email Successful</h2>
      <p style="color:#94a3b8">Job Jockey email is working.</p>
    </div>`;

    const res = await dispatchEmail(toAddr, "✅ Job Jockey — Email Test", htmlBody);
    return { success: true, to: toAddr, id: res.id };
  } catch (error: any) {
    return { success: false, error: error.message || "Test email failed" };
  }
}
