// src/controllers/statsController.js
const prisma = require("../prisma");

function fmtDate(d) {
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return "";
  }
}

// We define "best set" as: highest weight, tie -> highest reps.
// (Works for NORMAL and dropsets too because they are all stored as rows in Set.)
function betterSet(a, b) {
  if (!a) return b;
  if (!b) return a;

  if (b.weight > a.weight) return b;
  if (b.weight < a.weight) return a;

  // same weight -> more reps wins
  if (b.reps > a.reps) return b;
  return a;
}

/**
 * GET /stats/overview
 * Returns:
 * - totals
 * - top PRs (best set per exercise across COMPLETED workouts)
 * - recent workouts list
 */
async function getOverview(req, res) {
  try {
    const userId = req.user.id;

    // total workouts (completed only)
    const totalWorkouts = await prisma.workout.count({
      where: { userId, status: "COMPLETED" },
    });

    // total sets (completed only)
    const totalSets = await prisma.set.count({
      where: {
        workoutExercise: {
          workout: { userId, status: "COMPLETED" },
        },
      },
    });

    // total exercises logged = count distinct workoutExercise rows in completed workouts
    const totalExercises = await prisma.workoutExercise.count({
      where: {
        workout: { userId, status: "COMPLETED" },
      },
    });

    // training days configured
    const trainingDays = await prisma.userTrainingDay.count({
      where: { userId },
    });

    // PRs: best set per exercise across all COMPLETED workouts
    const allCompletedSets = await prisma.set.findMany({
      where: {
        workoutExercise: {
          workout: { userId, status: "COMPLETED" },
        },
      },
      select: {
        weight: true,
        reps: true,
        workoutExercise: {
          select: {
            exerciseId: true,
            exercise: { select: { name: true } },
          },
        },
      },
    });

    const prMap = new Map(); // exerciseId -> { exerciseId, exerciseName, weight, reps }
    for (const s of allCompletedSets) {
      const exId = s.workoutExercise.exerciseId;
      const current = prMap.get(exId) || null;
      const candidate = {
        exerciseId: exId,
        exerciseName: s.workoutExercise.exercise.name,
        weight: s.weight,
        reps: s.reps,
      };

      const best = betterSet(current, candidate);
      prMap.set(exId, best);
    }

    // sort PRs: higher weight first
    const prs = Array.from(prMap.values())
      .sort((a, b) => (b.weight - a.weight) || (b.reps - a.reps))
      .slice(0, 10); // top 10 for MVP

    // Recent workouts
    const recent = await prisma.workout.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { date: "desc" },
      take: 8,
      select: { id: true, planDay: true, date: true },
    });

    const recentWorkouts = recent.map((w) => ({
      id: w.id,
      label: w.planDay === "FULL" ? "Workout Full Body" : `Workout ${w.planDay}`,
      date: fmtDate(w.date),
    }));

    return res.json({
      totalWorkouts,
      totalExercises,
      totalSets,
      trainingDays,
      prs,
      recentWorkouts,
    });
  } catch (err) {
    console.error("getOverview error:", err);
    return res.status(500).json({ message: "Failed to load stats" });
  }
}

module.exports = { getOverview };
