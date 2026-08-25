-- CreateEnum
CREATE TYPE "FraudDecision" AS ENUM ('ALLOW', 'REVIEW', 'BLOCK');

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'BLOCKED';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "cardFingerprint" TEXT,
ADD COLUMN     "cardLast4" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "FraudScore" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "decision" "FraudDecision" NOT NULL,
    "reasons" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraudScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FraudScore_paymentId_key" ON "FraudScore"("paymentId");

-- CreateIndex
CREATE INDEX "FraudScore_decision_createdAt_idx" ON "FraudScore"("decision", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_cardFingerprint_createdAt_idx" ON "Payment"("cardFingerprint", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_merchantId_status_createdAt_idx" ON "Payment"("merchantId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "FraudScore" ADD CONSTRAINT "FraudScore_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
