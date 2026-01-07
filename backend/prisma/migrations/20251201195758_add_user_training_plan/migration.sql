-- CreateTable
CREATE TABLE "UserTrainingDay" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "dayKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserTrainingDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserTrainingDayExercise" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "trainingDayId" INTEGER NOT NULL,
    "exerciseId" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    CONSTRAINT "UserTrainingDayExercise_trainingDayId_fkey" FOREIGN KEY ("trainingDayId") REFERENCES "UserTrainingDay" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserTrainingDayExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "name" TEXT NOT NULL,
    "planType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gender" TEXT,
    "age" INTEGER,
    "heightCm" INTEGER,
    "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false,
    "hasConfiguredPlan" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_User" ("age", "createdAt", "email", "gender", "googleId", "hasCompletedOnboarding", "heightCm", "id", "name", "passwordHash", "planType") SELECT "age", "createdAt", "email", "gender", "googleId", "hasCompletedOnboarding", "heightCm", "id", "name", "passwordHash", "planType" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
