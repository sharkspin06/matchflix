-- Beta waitlist from the website

-- CreateTable
CREATE TABLE "beta_signups" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beta_signups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "beta_signups_email_key" ON "beta_signups"("email");

-- Block access through Supabase's public API; the backend connects as the table owner
ALTER TABLE "beta_signups" ENABLE ROW LEVEL SECURITY;
