// src/controllers/workoutController.js
const prisma = require("../prisma");

function getDayKeys(planType) {
  if (planType === "AB") return ["A", "B"];
  if (planType === "ABC") return ["A", "B", "C"];
  if (planType === "ABCD") return ["A", "B", "C", "D"];
  return ["FULL"]; // FULL_BODY
}

function getNextDayKey({ planType, lastDayKey }) {
  const keys = getDayKeys(planType);
  if (!lastDayKey) return keys[0];

  const idx = keys.indexOf(lastDayKey);
  if (idx === -1) return keys[0];

  return keys[(idx + 1) % keys.length];
}

/**
 * GET /workout/today
 */
async function getTodayWorkout(req, res) {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        planType: true,
        hasConfiguredPlan: true,
      },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.hasConfiguredPlan) {
      return res.status(400).json({ message: "User has no configured plan yet" });
    }

    const dayKeys = getDayKeys(user.planType);

    const lastCompleted = await prisma.workout.findFirst({
      where: { userId, status: "COMPLETED" },
      orderBy: { date: "desc" },
      select: { planDay: true },
    });

    const recommendedDayKey = getNextDayKey({
      planType: user.planType,
      lastDayKey: lastCompleted?.planDay || null,
    });

    const active = await prisma.workout.findFirst({
      where: {
        userId,
        status: "PLANNED",
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, planDay: true, date: true, status: true, createdAt: true },
    });

    return res.json({
      planType: user.planType,
      dayKeys,
      recommendedDayKey,
      lastCompletedDayKey: lastCompleted?.planDay || null,
      activeWorkout: active || null,
    });
  } catch (err) {
    console.error("getTodayWorkout error:", err);
    return res.status(500).json({ message: "Failed to load today workout" });
  }
}

/**
 * POST /workout/start
 * ✅ UPDATED: Populates exercises IMMEDIATELY to prevent race conditions.
 */
async function startWorkout(req, res) {
  try {
    const userId = req.user.id;
    const { dayKey } = req.body || {};

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { planType: true, hasConfiguredPlan: true },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.hasConfiguredPlan) {
      return res.status(400).json({ message: "User has no configured plan yet" });
    }

    const dayKeys = getDayKeys(user.planType);

    // Check for active workout
    const active = await prisma.workout.findFirst({
      where: { userId, status: "PLANNED" },
      orderBy: { createdAt: "desc" },
      select: { id: true, planDay: true, date: true, status: true, createdAt: true },
    });

    if (active) {
      return res.status(409).json({
        message: "You already have a workout in progress",
        workout: active,
      });
    }

    const lastCompleted = await prisma.workout.findFirst({
      where: { userId, status: "COMPLETED" },
      orderBy: { date: "desc" },
      select: { planDay: true },
    });

    const recommendedDayKey = getNextDayKey({
      planType: user.planType,
      lastDayKey: lastCompleted?.planDay || null,
    });

    const chosen = dayKey ?? recommendedDayKey;

    if (!dayKeys.includes(chosen)) {
      return res.status(400).json({
        message: `Invalid dayKey. Must be one of: ${dayKeys.join(", ")}`,
      });
    }

    // ✅ 1. FETCH THE PLAN FIRST
    const trainingDay = await prisma.userTrainingDay.findFirst({
      where: { userId, dayKey: chosen },
      include: {
        exercises: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!trainingDay) {
      return res.status(400).json({ message: `No plan found for Day ${chosen}. Please configure your plan.` });
    }

    // ✅ 2. CREATE WORKOUT + EXERCISES IN ONE TRANSACTION
    const workout = await prisma.workout.create({
      data: {
        userId,
        date: new Date(),
        planDay: chosen,
        status: "PLANNED",
        // Magic happens here:
        exercises: {
          create: trainingDay.exercises.map((row) => ({
            exerciseId: row.exerciseId,
            plannedExerciseId: row.exerciseId,
            orderIndex: row.orderIndex,
            targetSets: 0,
            isSubstitution: false,
          })),
        },
      },
      select: {
        id: true,
        planDay: true,
        status: true,
        date: true,
        createdAt: true,
      }
    });

    return res.status(201).json({ workout });
  } catch (err) {
    console.error("startWorkout error:", err);
    return res.status(500).json({ message: "Failed to start workout" });
  }
}

/**
 * POST /workout/abandon
 */
async function abandonActiveWorkout(req, res) {
  try {
    const userId = req.user.id;

    const active = await prisma.workout.findFirst({
      where: { userId, status: "PLANNED" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (!active) {
      return res.status(404).json({
        message: "No workout in progress to discard",
      });
    }

    // Cleanup (Cascading deletes usually handle this, but manual safety here)
    await prisma.set.deleteMany({
      where: { workoutExercise: { workoutId: active.id } },
    });
    
    await prisma.dropSetGroup.deleteMany({
        where: { workoutExercise: { workoutId: active.id } },
    });

    await prisma.workoutExercise.deleteMany({
      where: { workoutId: active.id },
    });

    await prisma.workout.delete({
      where: { id: active.id },
    });

    return res.json({ message: "Workout in progress discarded" });
  } catch (err) {
    console.error("abandonActiveWorkout error:", err);
    return res.status(500).json({ message: "Failed to discard workout" });
  }
}

module.exports = {
  getTodayWorkout,
  startWorkout,
  abandonActiveWorkout,
};