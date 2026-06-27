-- AlterTable: ajout du champ order pour le tri des catégories
ALTER TABLE "Category" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
