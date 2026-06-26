-- DropForeignKey
ALTER TABLE "MonthlyIncome" DROP CONSTRAINT "MonthlyIncome_createdById_fkey";

-- DropForeignKey
ALTER TABLE "MonthlyIncome" DROP CONSTRAINT "MonthlyIncome_householdId_fkey";

-- AlterTable
ALTER TABLE "Household" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "category",
ADD COLUMN "attachmentUrl" TEXT,
ADD COLUMN "categoryId" TEXT;

-- DropTable
DROP TABLE "MonthlyIncome";

-- DropEnum
DROP TYPE "TransactionCategory";

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
