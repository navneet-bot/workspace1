import { Resend } from "resend";
import { validateEmailConfig } from "./config";
import prisma from "@/lib/db"; // To fetch DB resend_key if needed, but we're moving to central ENV config

// Safe Error Message
const SAFE_ERROR_MESSAGE = "Email delivery is currently unavailable. Please contact the administrator.";

/**
 * Internal wrapper to handle sending emails with robust error handling and fallback logic.
 */
export async function dispatchEmail(to: string | string[], subject: string, html: string) {
  // Validate and get central config
  const config = validateEmailConfig();
  
  // Check DB first for dynamic config, then fallback to ENV
  const dbConfig = await prisma.config.findUnique({ where: { key: "resend_key" } });
  
  let apiKey = "";
  let keySource = "";
  if (dbConfig?.value) {
    apiKey = dbConfig.value;
    keySource = "Database (Settings UI)";
  } else if (config.apiKey) {
    apiKey = config.apiKey;
    keySource = "Environment Variable (.env)";
  }

  if (!apiKey) {
    console.error("❌ [Email Error] Missing Resend API Key. Cannot send email.");
    throw new Error(SAFE_ERROR_MESSAGE);
  }
  
  console.log(`ℹ️ [Email Config] Using Resend API Key from ${keySource} starting with: ${apiKey.substring(0, 8)}...`);

  const fromEmail = config.fromEmail || "noreply@jobjockey.in";

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: `Job Jockey <${fromEmail}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    if (error) {
      console.error(`❌ [Resend Error] Failed to send to ${to}:`, error.message);
      throw new Error(SAFE_ERROR_MESSAGE);
    }

    console.log(`✅ [Email Success] Sent email to ${to}. ID: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (err: any) {
    // If it's already the safe error message, rethrow it
    if (err.message === SAFE_ERROR_MESSAGE) {
      throw err;
    }
    
    // Log actual raw error server-side
    console.error(`❌ [Email Exception] Exception sending to ${to}:`, err);
    throw new Error(SAFE_ERROR_MESSAGE);
  }
}

import { buildInternInvitationEmail } from "./templates/intern-invitation";

// ── Email Service Functions ──

export async function sendInvitationEmail(toEmail: string, name: string, role: string, loginEmail?: string, tempPass?: string) {
  if (role !== "intern" || !loginEmail || !tempPass) {
    const html = `
      <div style="font-family:Arial,sans-serif;padding:20px;color:#333;">
        <h2>Hello ${name},</h2>
        <p>You have been invited to join the Job Jockey platform as a ${role}.</p>
        <p>Please contact your administrator for your login credentials.</p>
        <br/>
        <p>Best Regards,</p>
        <p><strong>The Job Jockey Team</strong></p>
      </div>`;
    return dispatchEmail(toEmail, "🎉 Welcome to Job Jockey", html);
  }

  const htmlBody = buildInternInvitationEmail({
    candidateName: name,
    candidateEmail: loginEmail,
    generatedPassword: tempPass,
  });
  
  return dispatchEmail(toEmail, "🎉 Welcome to Job Jockey – Your Intern Account is Ready", htmlBody);
}

export async function sendPasswordResetEmail(toEmail: string, resetLink: string) {
  const html = `
    <div style="font-family:Arial,sans-serif;padding:20px;color:#333;">
      <h2>Password Reset Request</h2>
      <p>We received a request to reset your password for your Job Jockey account.</p>
      <p>Click the link below to reset it:</p>
      <a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#f59e0b;color:#000;text-decoration:none;border-radius:5px;margin:20px 0;">Reset Password</a>
      <p>If you did not request this, please ignore this email.</p>
    </div>
  `;
  return dispatchEmail(toEmail, "🔑 Password Reset Request", html);
}

export async function sendTaskNotificationEmail(toEmail: string, taskTitle: string, priority: string, deadline: string) {
  const html = `
    <div style="font-family:Arial,sans-serif;padding:20px;color:#333;">
      <h2>New Task Assigned: ${taskTitle}</h2>
      <p>A new task has been assigned to you on Job Jockey.</p>
      <ul>
        <li><strong>Priority:</strong> ${priority}</li>
        <li><strong>Deadline:</strong> ${deadline || "TBD"}</li>
      </ul>
      <p>Please log in to the platform to view the details.</p>
    </div>
  `;
  return dispatchEmail(toEmail, `📋 New Task Assigned: ${taskTitle}`, html);
}

export async function sendAttendanceEmail(toEmail: string, date: string, status: string) {
  const html = `
    <div style="font-family:Arial,sans-serif;padding:20px;color:#333;">
      <h2>Attendance Update</h2>
      <p>Your attendance for <strong>${date}</strong> has been marked as <strong>${status}</strong>.</p>
    </div>
  `;
  return dispatchEmail(toEmail, `📅 Attendance Update: ${date}`, html);
}

export async function sendReportNotificationEmail(toEmail: string, reportTitle: string, submittedBy: string) {
  const html = `
    <div style="font-family:Arial,sans-serif;padding:20px;color:#333;">
      <h2>New Report Submitted</h2>
      <p><strong>${submittedBy}</strong> has submitted a new report:</p>
      <p><em>${reportTitle}</em></p>
      <p>Please log in to the dashboard to review it.</p>
    </div>
  `;
  return dispatchEmail(toEmail, `📄 New Report from ${submittedBy}`, html);
}

export async function sendGroupInvitationEmail(toEmail: string, groupName: string) {
  const html = `
    <div style="font-family:Arial,sans-serif;padding:20px;color:#333;">
      <h2>You've been added to a group!</h2>
      <p>You have been added to the group <strong>${groupName}</strong> on Job Jockey.</p>
      <p>Log in to view group messages and collaborate.</p>
    </div>
  `;
  return dispatchEmail(toEmail, `👥 Added to ${groupName}`, html);
}

export async function sendCustomEmail(toEmail: string, subject: string, body: string, name?: string) {
  const html = body
    ? `<div style="font-family: sans-serif; padding: 20px; color: #333;">${body.replace(/\\n/g, '<br/>')}</div>`
    : `<div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2>Hello ${name || "there"},</h2>
        <p>This is a custom message from the Job Jockey Team.</p>
      </div>`;
      
  return dispatchEmail(toEmail, subject, html);
}
