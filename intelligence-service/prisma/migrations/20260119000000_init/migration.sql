-- CreateTable
CREATE TABLE "log_checkpoints" (
    "id" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "lastCheckTime" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "log_checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detected_issues" (
    "id" TEXT NOT NULL,
    "githubIssueNumber" INTEGER NOT NULL,
    "errorSignature" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "firstSeen" TIMESTAMP(3) NOT NULL,
    "lastSeen" TIMESTAMP(3) NOT NULL,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "claudeAnalyzed" BOOLEAN NOT NULL DEFAULT false,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "detected_issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "log_checkpoints_serviceName_key" ON "log_checkpoints"("serviceName");

-- CreateIndex
CREATE UNIQUE INDEX "detected_issues_githubIssueNumber_key" ON "detected_issues"("githubIssueNumber");

-- CreateIndex
CREATE UNIQUE INDEX "detected_issues_errorSignature_key" ON "detected_issues"("errorSignature");
