-- CreateTable
CREATE TABLE "UserRedmineConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "username" TEXT NOT NULL DEFAULT '',
    "password" TEXT NOT NULL DEFAULT '',
    "apiKey" TEXT NOT NULL DEFAULT '',
    "firstname" TEXT NOT NULL DEFAULT '',
    "lastname" TEXT NOT NULL DEFAULT '',
    "redmineUserId" INTEGER NOT NULL DEFAULT 0,
    "redmineEmail" TEXT NOT NULL DEFAULT '',
    "redmineCreatedOn" TIMESTAMP(3) NOT NULL DEFAULT '1970-01-01 00:00:00 +00:00',
    "redmineLastLoginOn" TIMESTAMP(3) NOT NULL DEFAULT '1970-01-01 00:00:00 +00:00',
    "maxProjectLevels" INTEGER NOT NULL DEFAULT 2,
    "projects" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "deleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRedmineConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserRedmineConnection_userId_url_deleted_key" ON "UserRedmineConnection"("userId", "url", "deleted");
