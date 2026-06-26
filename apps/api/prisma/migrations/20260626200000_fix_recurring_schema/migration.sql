-- Drop old FKs
ALTER TABLE "HouseholdEvent" DROP CONSTRAINT IF EXISTS "HouseholdEvent_householdId_fkey";
ALTER TABLE "HouseholdEvent" DROP CONSTRAINT IF EXISTS "HouseholdEvent_userId_fkey";
ALTER TABLE "Transaction"    DROP CONSTRAINT IF EXISTS "Transaction_recurringTransactionId_fkey";

-- Fix RecurringTransaction : remplacer les anciennes colonnes par la nouvelle structure
ALTER TABLE "RecurringTransaction"
  DROP COLUMN IF EXISTS "lastRunAt",
  DROP COLUMN IF EXISTS "monthOfYear",
  DROP COLUMN IF EXISTS "startDate",
  ADD COLUMN IF NOT EXISTS "lastRunDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "month" INTEGER;

-- Changer le type de frequency (old RecurringFrequency → FrequencyType)
-- On utilise un passage par TEXT pour contourner l'incompatibilité d'enum
ALTER TABLE "RecurringTransaction" DROP COLUMN IF EXISTS "frequency";
ALTER TABLE "RecurringTransaction" ADD COLUMN "frequency" "FrequencyType" NOT NULL DEFAULT 'MONTHLY';
ALTER TABLE "RecurringTransaction" ALTER COLUMN "frequency" DROP DEFAULT;

-- Nettoyer Transaction : supprimer l'ancienne colonne recurringTransactionId
ALTER TABLE "Transaction" DROP COLUMN IF EXISTS "recurringTransactionId";

-- Supprimer la table HouseholdEvent si elle existe
DROP TABLE IF EXISTS "HouseholdEvent";

-- Supprimer l'ancien enum
DROP TYPE IF EXISTS "RecurringFrequency";
