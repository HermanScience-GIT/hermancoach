-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('eligible', 'disqualified', 'removed');

-- CreateEnum
CREATE TYPE "AccessEventAction" AS ENUM ('view_coach', 'rescore', 'copy_prompt');

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email_confirmed_at" TIMESTAMP(3),
    "email_confirmation_token_hash" TEXT,
    "email_confirmation_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "unsubscribed_at" TIMESTAMP(3),

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_submissions" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "prompt_text" TEXT NOT NULL,
    "prompt_hash" TEXT NOT NULL,
    "overall_score" INTEGER NOT NULL,
    "who_score" INTEGER NOT NULL,
    "task_score" INTEGER NOT NULL,
    "context_score" INTEGER NOT NULL,
    "output_score" INTEGER NOT NULL,
    "feedback_summary" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'eligible',
    "disqualified_reason" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_hash" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "prompt_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_tokens" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token_prefix" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "first_ip_hash" TEXT,
    "last_ip_hash" TEXT,
    "ip_mismatch_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "access_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_access_events" (
    "id" TEXT NOT NULL,
    "access_token_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_hash" TEXT,
    "user_agent" TEXT,
    "action" "AccessEventAction" NOT NULL,

    CONSTRAINT "token_access_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_sessions" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "access_token_id" TEXT NOT NULL,
    "current_prompt" TEXT NOT NULL,
    "draft_version" INTEGER NOT NULL DEFAULT 1,
    "overall_score" INTEGER NOT NULL,
    "who_score" INTEGER NOT NULL,
    "task_score" INTEGER NOT NULL,
    "context_score" INTEGER NOT NULL,
    "output_score" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contest_winners" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "prompt_submission_id" TEXT NOT NULL,
    "selected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "selected_by" TEXT NOT NULL,
    "prize_label" TEXT NOT NULL DEFAULT 'weekly prize',
    "notes" TEXT,

    CONSTRAINT "contest_winners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_login_codes" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_login_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contacts_email_key" ON "contacts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_email_confirmation_token_hash_key" ON "contacts"("email_confirmation_token_hash");

-- CreateIndex
CREATE INDEX "prompt_submissions_created_at_idx" ON "prompt_submissions"("created_at");

-- CreateIndex
CREATE INDEX "prompt_submissions_status_idx" ON "prompt_submissions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_submissions_contact_id_key" ON "prompt_submissions"("contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "access_tokens_token_hash_key" ON "access_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "access_tokens_contact_id_idx" ON "access_tokens"("contact_id");

-- CreateIndex
CREATE INDEX "token_access_events_access_token_id_created_at_idx" ON "token_access_events"("access_token_id", "created_at");

-- CreateIndex
CREATE INDEX "coach_sessions_contact_id_idx" ON "coach_sessions"("contact_id");

-- CreateIndex
CREATE INDEX "coach_sessions_access_token_id_idx" ON "coach_sessions"("access_token_id");

-- CreateIndex
CREATE INDEX "contest_winners_selected_at_idx" ON "contest_winners"("selected_at");

-- CreateIndex
CREATE UNIQUE INDEX "contest_winners_contact_id_key" ON "contest_winners"("contact_id");

-- CreateIndex
CREATE INDEX "admin_login_codes_email_created_at_idx" ON "admin_login_codes"("email", "created_at");

-- AddForeignKey
ALTER TABLE "prompt_submissions" ADD CONSTRAINT "prompt_submissions_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_tokens" ADD CONSTRAINT "access_tokens_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_access_events" ADD CONSTRAINT "token_access_events_access_token_id_fkey" FOREIGN KEY ("access_token_id") REFERENCES "access_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_sessions" ADD CONSTRAINT "coach_sessions_access_token_id_fkey" FOREIGN KEY ("access_token_id") REFERENCES "access_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_sessions" ADD CONSTRAINT "coach_sessions_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_winners" ADD CONSTRAINT "contest_winners_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_winners" ADD CONSTRAINT "contest_winners_prompt_submission_id_fkey" FOREIGN KEY ("prompt_submission_id") REFERENCES "prompt_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
