-- CreateEnum
CREATE TYPE "ReadonlyReason" AS ENUM ('wedding_completed', 'payment_failed');

-- AlterTable
ALTER TABLE "weddings" ADD COLUMN     "readonly_reason" "ReadonlyReason";
