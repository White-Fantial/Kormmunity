-- AlterTable: Add flag for categories always included in user filters
ALTER TABLE "Category" ADD COLUMN "isAlwaysIncluded" BOOLEAN NOT NULL DEFAULT false;
