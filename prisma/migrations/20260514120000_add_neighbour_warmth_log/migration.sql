-- CreateTable NeighbourWarmthLog
CREATE TABLE "NeighbourWarmthLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "baseDelta" DOUBLE PRECISION NOT NULL,
    "actualDelta" DOUBLE PRECISION NOT NULL,
    "previousWarmth" DOUBLE PRECISION NOT NULL,
    "newWarmth" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NeighbourWarmthLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NeighbourWarmthLog_userId_createdAt_idx" ON "NeighbourWarmthLog"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "NeighbourWarmthLog" ADD CONSTRAINT "NeighbourWarmthLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
