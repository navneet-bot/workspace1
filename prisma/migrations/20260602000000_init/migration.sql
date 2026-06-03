-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'intern',
    "permissions" TEXT NOT NULL DEFAULT '',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "feedbackRating" TEXT NOT NULL DEFAULT 'Good',
    "feedbackComment" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "assignedTo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "deadline" TEXT NOT NULL DEFAULT 'TBD',
    "project" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'In Progress',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "members" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL DEFAULT '',
    "skill" TEXT NOT NULL DEFAULT '',
    "resume" TEXT NOT NULL DEFAULT '',
    "resumeLink" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "state" TEXT NOT NULL DEFAULT '',
    "college" TEXT NOT NULL DEFAULT '',
    "eduDomain" TEXT NOT NULL DEFAULT '',
    "duration" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "extraData" TEXT NOT NULL DEFAULT '',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" SERIAL NOT NULL,
    "email" TEXT,
    "date" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Present',
    "breakStartTime" TEXT,
    "breakEndTime" TEXT,
    "totalBreakDuration" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "taskRef" TEXT NOT NULL DEFAULT '',
    "fileName" TEXT NOT NULL DEFAULT '',
    "fileData" TEXT NOT NULL DEFAULT '',
    "submittedBy" TEXT,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT '📁',
    "members" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "date" TEXT,
    "time" TEXT,
    "meetLink" TEXT NOT NULL DEFAULT '',
    "members" TEXT NOT NULL DEFAULT '[]',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT '🔔',
    "targetEmail" TEXT NOT NULL DEFAULT 'ALL',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "seenBy" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_logs" (
    "id" SERIAL NOT NULL,
    "email" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "loginTime" TEXT NOT NULL DEFAULT '',
    "logoutTime" TEXT NOT NULL DEFAULT '',
    "workAssigned" TEXT NOT NULL DEFAULT '',
    "workDid" TEXT NOT NULL DEFAULT '',
    "hoursWorked" TEXT NOT NULL DEFAULT '',
    "issues" TEXT NOT NULL DEFAULT '',
    "resolved" TEXT NOT NULL DEFAULT '',
    "startedAt" TEXT NOT NULL DEFAULT '',
    "completedAt" TEXT NOT NULL DEFAULT '',
    "date" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_messages" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "sender" TEXT,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readBy" TEXT NOT NULL DEFAULT '[]',

    CONSTRAINT "group_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" SERIAL NOT NULL,
    "senderId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "config_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "tutors" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL DEFAULT '',
    "gender" TEXT NOT NULL DEFAULT '',
    "dob" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "profilePhoto" TEXT NOT NULL DEFAULT '',
    "qualification" TEXT NOT NULL DEFAULT '',
    "university" TEXT NOT NULL DEFAULT '',
    "degree" TEXT NOT NULL DEFAULT '',
    "specialization" TEXT NOT NULL DEFAULT '',
    "gradYear" TEXT NOT NULL DEFAULT '',
    "subject" TEXT NOT NULL DEFAULT '',
    "experience" TEXT NOT NULL DEFAULT '',
    "mode" TEXT NOT NULL DEFAULT 'Online',
    "occupation" TEXT NOT NULL DEFAULT '',
    "prevInst" TEXT NOT NULL DEFAULT '',
    "certifications" TEXT NOT NULL DEFAULT '',
    "portfolio" TEXT NOT NULL DEFAULT '',
    "linkedinUrl" TEXT NOT NULL DEFAULT '',
    "resumeUrl" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Applied',
    "interviewNotes" TEXT NOT NULL DEFAULT '',
    "statusHistory" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tutors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "break_requests" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "userEmail" TEXT NOT NULL DEFAULT '',
    "userName" TEXT NOT NULL DEFAULT '',
    "duration" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejectComment" TEXT NOT NULL DEFAULT '',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" INTEGER,
    "approvedByName" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "break_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

