"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { sendCustomEmail } from "@/lib/email/resend";

export async function createTutor(data: any) {
  try {
    const status = data.status || "Applied";
    const history = JSON.stringify([
      {
        status,
        timestamp: new Date().toISOString(),
        notes: "Tutor profile created manually"
      }
    ]);

    const tutor = await prisma.tutor.create({
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || "",
        gender: data.gender || "",
        dob: data.dob || "",
        location: data.location || "",
        profilePhoto: data.profilePhoto || "",
        qualification: data.qualification || "",
        university: data.university || "",
        degree: data.degree || "",
        specialization: data.specialization || "",
        gradYear: data.gradYear || "",
        subject: data.subject || "",
        experience: data.experience || "",
        mode: data.mode || "Online",
        occupation: data.occupation || "",
        prevInst: data.prevInst || "",
        certifications: data.certifications || "",
        portfolio: data.portfolio || "",
        linkedinUrl: data.linkedinUrl || "",
        resumeUrl: data.resumeUrl || "",
        status,
        interviewNotes: data.interviewNotes || "",
        statusHistory: history
      }
    });

    revalidatePath("/dashboard/tutors");
    return { success: true, tutor };
  } catch (error: any) {
    console.error("Error creating tutor:", error);
    return { success: false, error: error.message };
  }
}

export async function updateTutorDetails(id: number, data: any) {
  try {
    const existing = await prisma.tutor.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Tutor not found" };

    // If status changed in edit details, handle it with history
    let newHistory = existing.statusHistory;
    if (data.status && data.status !== existing.status) {
      let historyList = [];
      try {
        historyList = JSON.parse(existing.statusHistory || "[]");
      } catch (e) {}
      historyList.push({
        status: data.status,
        timestamp: new Date().toISOString(),
        notes: "Details updated"
      });
      newHistory = JSON.stringify(historyList);
    }

    const updated = await prisma.tutor.update({
      where: { id },
      data: {
        ...data,
        statusHistory: newHistory
      }
    });

    revalidatePath("/dashboard/tutors");
    revalidatePath(`/dashboard/tutors/${id}`);
    return { success: true, tutor: updated };
  } catch (error: any) {
    console.error("Error updating tutor details:", error);
    return { success: false, error: error.message };
  }
}

export async function updateTutorStatus(id: number, status: string, notes?: string) {
  try {
    const existing = await prisma.tutor.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Tutor not found" };

    let historyList = [];
    try {
      historyList = JSON.parse(existing.statusHistory || "[]");
    } catch (e) {}

    historyList.push({
      status,
      timestamp: new Date().toISOString(),
      notes: notes || `Status updated to ${status}`
    });

    const updated = await prisma.tutor.update({
      where: { id },
      data: {
        status,
        interviewNotes: notes !== undefined ? notes : existing.interviewNotes,
        statusHistory: JSON.stringify(historyList)
      }
    });

    // Notify tutor by email based on status triggers
    if (existing.email) {
      try {
        if (status === "Interview Scheduled") {
          await sendCustomEmail(
            existing.email,
            "👨‍🏫 Tutor Interview Invitation - Job Jockey",
            `Dear ${existing.name},\n\nWe are pleased to invite you for an interview for the Tutor position. Details of the schedule and link will follow soon.\n\nBest Regards,\nJob Jockey Team`,
            existing.name
          );
        } else if (status === "Selected") {
          await sendCustomEmail(
            existing.email,
            "🎉 Selected for Tutor Position - Job Jockey",
            `Dear ${existing.name},\n\nWe are delighted to inform you that you have been selected for the Tutor position at Job Jockey.\n\nBest Regards,\nJob Jockey Team`,
            existing.name
          );
        } else if (status === "Onboarded") {
          await sendCustomEmail(
            existing.email,
            "🤝 Tutor Onboarding Invitation - Job Jockey",
            `Dear ${existing.name},\n\nWelcome to our team! We have marked you as successfully onboarded. Please check in with your administrator to complete any remaining documentation.\n\nBest Regards,\nJob Jockey Team`,
            existing.name
          );
        }
      } catch (mailErr) {
        console.error("Failed to send tutor status update email:", mailErr);
      }
    }

    // In-app Notification for Admins/Super Admins
    try {
      await prisma.notification.create({
        data: {
          title: `👨‍🏫 Tutor Status: ${status}`,
          body: `${existing.name}'s status changed to ${status}`,
          icon: "👨‍🏫",
          targetEmail: "ALL" // Alert all admins
        }
      });
      revalidatePath("/dashboard/notifications");
    } catch (notifErr) {
      console.error("Failed to create tutor in-app notification:", notifErr);
    }

    revalidatePath("/dashboard/tutors");
    revalidatePath(`/dashboard/tutors/${id}`);
    return { success: true, tutor: updated };
  } catch (error: any) {
    console.error("Error updating tutor status:", error);
    return { success: false, error: error.message };
  }
}

export async function bulkUpdateTutorStatus(ids: number[], status: string) {
  try {
    for (const id of ids) {
      await updateTutorStatus(id, status, `Bulk status update to ${status}`);
    }
    revalidatePath("/dashboard/tutors");
    return { success: true };
  } catch (error: any) {
    console.error("Error bulk updating tutor status:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteTutors(ids: number[]) {
  try {
    await prisma.tutor.deleteMany({
      where: { id: { in: ids } }
    });
    revalidatePath("/dashboard/tutors");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting tutors:", error);
    return { success: false, error: error.message };
  }
}

export async function bulkImportTutors(tutors: any[]) {
  let imported = 0;
  let dupes = 0;
  let errors = 0;

  for (const t of tutors) {
    try {
      if (t.email) {
        const existing = await prisma.tutor.findFirst({
          where: { email: t.email }
        });
        if (existing) {
          dupes++;
          continue;
        }
      }

      const status = t.status || "Applied";
      const history = JSON.stringify([
        {
          status,
          timestamp: new Date().toISOString(),
          notes: "Imported via CSV file"
        }
      ]);

      await prisma.tutor.create({
        data: {
          name: t.name,
          email: t.email || null,
          phone: t.phone || "",
          gender: t.gender || "",
          dob: t.dob || "",
          location: t.location || "",
          profilePhoto: t.profilePhoto || "",
          qualification: t.qualification || "",
          university: t.university || "",
          degree: t.degree || "",
          specialization: t.specialization || "",
          gradYear: t.gradYear || "",
          subject: t.subject || "",
          experience: t.experience || "",
          mode: t.mode || "Online",
          occupation: t.occupation || "",
          prevInst: t.prevInst || "",
          certifications: t.certifications || "",
          portfolio: t.portfolio || "",
          linkedinUrl: t.linkedinUrl || "",
          resumeUrl: t.resumeUrl || "",
          status,
          interviewNotes: "",
          statusHistory: history
        }
      });
      imported++;
    } catch (e) {
      console.error("Error importing tutor:", e);
      errors++;
    }
  }

  revalidatePath("/dashboard/tutors");
  return {
    imported,
    dupes,
    errors
  };
}
