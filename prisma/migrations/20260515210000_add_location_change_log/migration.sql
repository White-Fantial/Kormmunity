-- CreateEnum
CREATE TYPE "LocationChangeType" AS ENUM ('CITY_CHANGED', 'COUNTRY_CHANGED_CITY_RESET', 'ADMIN_OVERRIDE');

-- CreateTable
CREATE TABLE "LocationChangeLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "changeType" "LocationChangeType" NOT NULL,
    "beforeCountryId" TEXT,
    "afterCountryId" TEXT,
    "beforeCityId" TEXT,
    "afterCityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LocationChangeLog_userId_createdAt_idx" ON "LocationChangeLog"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "LocationChangeLog_actorId_createdAt_idx" ON "LocationChangeLog"("actorId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "LocationChangeLog" ADD CONSTRAINT "LocationChangeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationChangeLog" ADD CONSTRAINT "LocationChangeLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
