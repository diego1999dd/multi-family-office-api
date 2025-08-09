-- CreateTable
CREATE TABLE "public"."InsuranceProfile" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "policyNumber" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "coverageAmount" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceProfile_policyNumber_key" ON "public"."InsuranceProfile"("policyNumber");

-- AddForeignKey
ALTER TABLE "public"."InsuranceProfile" ADD CONSTRAINT "InsuranceProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
