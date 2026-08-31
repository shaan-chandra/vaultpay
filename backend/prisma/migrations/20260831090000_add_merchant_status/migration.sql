-- CreateEnum
CREATE TYPE "MerchantStatus" AS ENUM ('ACTIVE', 'UNDER_REVIEW', 'BLOCKED');

-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "status" "MerchantStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "statusReason" TEXT,
ADD COLUMN     "statusUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "MerchantStatusEvent" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "fromStatus" "MerchantStatus" NOT NULL,
    "toStatus" "MerchantStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MerchantStatusEvent_merchantId_createdAt_idx" ON "MerchantStatusEvent"("merchantId", "createdAt");

-- CreateIndex
CREATE INDEX "Merchant_status_idx" ON "Merchant"("status");

-- AddForeignKey
ALTER TABLE "MerchantStatusEvent" ADD CONSTRAINT "MerchantStatusEvent_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
