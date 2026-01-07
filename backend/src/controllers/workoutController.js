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

function hoursAgoDate(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

/**
 * GET /workout/today
 * Returns:
 * - planType
 * - dayKeys
 * - recommendedDayKey
 * - lastCompletedDayKey
 * - activeWorkout (PLANNED and created within last 24 hours only)
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

    const cutoff = hoursAgoDate(24);

    const active = await prisma.workout.findFirst({
      where: {
        userId,
        status: "PLANNED",
        createdAt: { gte: cutoff },
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
 * Body: { dayKey?: "A"|"B"|"C"|"D"|"FULL" }
 *
 * If there is an active workout (PLANNED, created within last 24h) -> 409 and return it.
 * Else create new PLANNED workout.
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

    const cutoff = hoursAgoDate(24);

    const active = await prisma.workout.findFirst({
      where: { userId, status: "PLANNED", createdAt: { gte: cutoff } },
      orderBy: { createdAt: "desc" },
      select: { id: true, planDay: true, date: true, status: true, createdAt: true },
    });

    if (active) {
      return res.status(409).json({
        message: "You already have a workout in progress today",
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

    const workout = await prisma.workout.create({
      data: {
        userId,
        date: new Date(),
        planDay: chosen,
        status: "PLANNED",
      },
    });

    return res.status(201).json({
      workout: {
        id: workout.id,
        planDay: workout.planDay,
        status: workout.status,
        date: workout.date,
        createdAt: workout.createdAt,
      },
    });
  } catch (err) {
    console.error("startWorkout error:", err);
    return res.status(500).json({ message: "Failed to start workout" });
  }
}

/**
 * POST /workout/abandon
 * Deletes the active workout ONLY if:
 * - status=PLANNED
 * - createdAt within last 24 hours
 *
 * This matches: "workout started today in progress"
 */
async function abandonActiveWorkout(req, res) {
  try {
    const userId = req.user.id;
    const cutoff = hoursAgoDate(24);

    const active = await prisma.workout.findFirst({
      where: { userId, status: "PLANNED", createdAt: { gte: cutoff } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (!active) {
      return res.status(404).json({
        message: "No workout in progress today to discard",
      });
    }

    // delete sets -> workoutExercises -> workout
    await prisma.set.deleteMany({
      where: {
        workoutExercise: {
          workoutId: active.id,
        },
      },
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
