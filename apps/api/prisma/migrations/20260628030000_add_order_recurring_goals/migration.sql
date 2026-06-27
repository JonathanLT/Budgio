-- AlterTable: ajout du champ order pour le tri des mouvements fixes
ALTER TABLE "RecurringTransaction" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: ajout du champ order pour le tri des objectifs
ALTER TABLE "SavingsGoal" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
