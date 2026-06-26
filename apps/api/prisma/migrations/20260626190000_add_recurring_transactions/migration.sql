-- Enum FrequencyType (idempotent)
DO $$ BEGIN
  CREATE TYPE "FrequencyType" AS ENUM ('DAILY', 'WEEKDAYS', 'WEEKLY', 'MONTHLY', 'YEARLY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Table RecurringTransaction (idempotent)
CREATE TABLE IF NOT EXISTS "RecurringTransaction" (
  "id"          TEXT NOT NULL,
  "label"       TEXT NOT NULL,
  "amount"      DOUBLE PRECISION NOT NULL,
  "frequency"   "FrequencyType" NOT NULL,
  "dayOfWeek"   INTEGER,
  "dayOfMonth"  INTEGER,
  "month"       INTEGER,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "lastRunDate" TIMESTAMP(3),
  "householdId" TEXT NOT NULL,
  "categoryId"  TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecurringTransaction_pkey" PRIMARY KEY ("id")
);

-- FK householdId
DO $$ BEGIN
  ALTER TABLE "RecurringTransaction"
    ADD CONSTRAINT "RecurringTransaction_householdId_fkey"
      FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- FK categoryId
DO $$ BEGIN
  ALTER TABLE "RecurringTransaction"
    ADD CONSTRAINT "RecurringTransaction_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- FK createdById
DO $$ BEGIN
  ALTER TABLE "RecurringTransaction"
    ADD CONSTRAINT "RecurringTransaction_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Lien Transaction → RecurringTransaction
ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "recurringId" TEXT;

DO $$ BEGIN
  ALTER TABLE "Transaction"
    ADD CONSTRAINT "Transaction_recurringId_fkey"
      FOREIGN KEY ("recurringId") REFERENCES "RecurringTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
