-- AlterTable: Add restriction and city-scope columns to Category
ALTER TABLE "Category" ADD COLUMN "minRole" "UserRole" NOT NULL DEFAULT 'USER';
ALTER TABLE "Category" ADD COLUMN "ignoreCity" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Category" ADD COLUMN "supportsAllCities" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Make Post.cityId optional (null = visible to all cities)
ALTER TABLE "Post" ALTER COLUMN "cityId" DROP NOT NULL;
