-- AlterTable: lien optionnel Transaction → SavingsGoal
ALTER TABLE "Transaction" ADD COLUMN "goalId" TEXT;

-- AlterTable: lien optionnel GoalContribution → Transaction (unique car 1-to-1)
ALTER TABLE "GoalContribution" ADD COLUMN "transactionId" TEXT;
ALTER TABLE "GoalContribution" ADD CONSTRAINT "GoalContribution_transactionId_key" UNIQUE ("transactionId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "SavingsGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalContribution" ADD CONSTRAINT "GoalContribution_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
