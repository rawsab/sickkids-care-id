-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PH_USER');

-- CreateEnum
CREATE TYPE "Virus" AS ENUM ('INF_A', 'INF_B', 'INF_ANY', 'COVID19', 'RSV');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('FEMALE', 'MALE', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('ACTIVE', 'ROLLED_BACK');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'PH_USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSha256" TEXT NOT NULL,
    "uploadedById" TEXT,
    "rowCount" INTEGER NOT NULL,
    "acceptedCount" INTEGER NOT NULL,
    "rejectedCount" INTEGER NOT NULL,
    "minDate" DATE,
    "maxDate" DATE,
    "status" "UploadStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rolledBackAt" TIMESTAMP(3),

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyAggregate" (
    "id" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "fsa" CHAR(3) NOT NULL,
    "region" TEXT NOT NULL,
    "virus" "Virus" NOT NULL,
    "ageBand" TEXT NOT NULL,
    "sex" "Sex" NOT NULL,
    "nDetected" INTEGER NOT NULL,
    "nNotDetected" INTEGER NOT NULL,
    "nIndeterminate" INTEGER NOT NULL,

    CONSTRAINT "WeeklyAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FsaLookup" (
    "fsa" CHAR(3) NOT NULL,
    "region" TEXT NOT NULL,
    "phu" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FsaLookup_pkey" PRIMARY KEY ("fsa")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Upload_fileSha256_idx" ON "Upload"("fileSha256");

-- CreateIndex
CREATE INDEX "WeeklyAggregate_weekStart_virus_fsa_idx" ON "WeeklyAggregate"("weekStart", "virus", "fsa");

-- CreateIndex
CREATE INDEX "WeeklyAggregate_region_weekStart_idx" ON "WeeklyAggregate"("region", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyAggregate_uploadId_weekStart_fsa_virus_ageBand_sex_key" ON "WeeklyAggregate"("uploadId", "weekStart", "fsa", "virus", "ageBand", "sex");

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyAggregate" ADD CONSTRAINT "WeeklyAggregate_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

