-- CreateTable
CREATE TABLE "DropSetGroup" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workoutExerciseId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DropSetGroup_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "WorkoutExercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Set" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workoutExerciseId" INTEGER NOT NULL,
    "setIndex" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'NORMAL',
    "weight" REAL NOT NULL,
    "reps" INTEGER NOT NULL,
    "dropGroupId" INTEGER,
    CONSTRAINT "Set_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "WorkoutExercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Set_dropGroupId_fkey" FOREIGN KEY ("dropGroupId") REFERENCES "DropSetGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Set" ("id", "reps", "setIndex", "weight", "workoutExerciseId") SELECT "id", "reps", "setIndex", "weight", "workoutExerciseId" FROM "Set";
DROP TABLE "Set";
ALTER TABLE "new_Set" RENAME TO "Set";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
