// src/controllers/workoutSessionController.js
const prisma = require("../prisma");

/**
 * A simple score that works for "best set" comparisons:
 * Epley-ish estimator: weight * (1 + reps/30)
 */
function setScore(weight, reps) {
  const w = Number(weight) || 0;
  const r = Number(reps) || 0;
  return w * (1 + r / 30);
}

function clampInt(x, { min, max }) {
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (i < min || i > max) return null;
  return i;
}

function clampFloat(x, { min, max }) {
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

function formatBestCandidate(candidate) {
  // candidate can be:
  // { kind: "NORMAL", weight, reps }
  // { kind: "DROPSET", main: {weight,reps}, drops:[...], bestPart:{weight,reps} }
  return candidate || null;
}

async function computeStatsForWorkout(userId, workoutId) {
  // For each exercise in THIS workout:
  // - pr: best ever (completed workouts)
  // - last: best from most recent completed workout that includes this exercise (not including current planned)
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, userId },
    include: {
      exercises: {
        include: {
          exercise: true,
        },
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!workout) return {};

  const exerciseIds = workout.exercises.map((we) => we.exerciseId);
  const statsByExerciseId = {};

  // Helper: find best candidate from a list of sets grouped by dropGroupId
  function bestFromSets(sets) {
    // Group drop sets
    const dropsByGroup = new Map();
    const normalSets = [];

    for (const s of sets) {
      if (s.kind === "NORMAL" || !s.dropGroupId) {
        normalSets.push(s);
      } else {
        if (!dropsByGroup.has(s.dropGroupId)) dropsByGroup.set(s.dropGroupId, []);
        dropsByGroup.get(s.dropGroupId).push(s);
      }
    }

    let best = null;
    let bestScore = -Infinity;

    // normal candidates
    for (const s of normalSets) {
      const sc = setScore(s.weight, s.reps);
      if (sc > bestScore) {
        bestScore = sc;
        best = { kind: "NORMAL", weight: s.weight, reps: s.reps };
      }
    }

    // drop candidates (best part inside group, but return full chain)
    for (const [groupId, items] of dropsByGroup.entries()) {
      const sorted = [...items].sort((a, b) => a.setIndex - b.setIndex);
      let bestPart = null;
      let bestPartScore = -Infinity;

      for (const s of sorted) {
        const sc = setScore(s.weight, s.reps);
        if (sc > bestPartScore) {
          bestPartScore = sc;
          bestPart = { weight: s.weight, reps: s.reps };
        }
      }

      // main is the DROP_MAIN if exists, else first
      const mainSet =
        sorted.find((x) => x.kind === "DROP_MAIN") || sorted[0] || null;

      const drops = sorted
        .filter((x) => x.kind === "DROP_PART")
        .map((x) => ({ weight: x.weight, reps: x.reps }));

      const groupCandidate = {
        kind: "DROPSET",
        main: mainSet ? { weight: mainSet.weight, reps: mainSet.reps } : null,
        drops,
        bestPart,
        dropGroupId: groupId,
      };

      if (bestPartScore > bestScore) {
        bestScore = bestPartScore;
        best = groupCandidate;
      }
    }

    return best ? formatBestCandidate(best) : null;
  }

  // PR: best ever across ALL completed workouts
  // LAST: best from most recent completed workout that contains that exercise
  for (const exId of exerciseIds) {
    // PR
    const allCompletedSets = await prisma.set.findMany({
      where: {
        workoutExercise: {
          workout: { userId, status: "COMPLETED" },
          exerciseId: exId,
        },
      },
      select: {
        id: true,
        kind: true,
        weight: true,
        reps: true,
        dropGroupId: true,
        setIndex: true,
      },
    });

    const prBest = bestFromSets(allCompletedSets);

    // LAST completed workout that includes exercise
    const lastWorkout = await prisma.workout.findFirst({
      where: {
        userId,
        status: "COMPLETED",
        exercises: { some: { exerciseId: exId } },
      },
      orderBy: { date: "desc" },
      select: { id: true },
    });

    let lastBest = null;
    if (lastWorkout) {
      const lastSets = await prisma.set.findMany({
        where: {
          workoutExercise: {
            workoutId: lastWorkout.id,
            exerciseId: exId,
          },
        },
        select: {
          id: true,
          kind: true,
          weight: true,
          reps: true,
          dropGroupId: true,
          setIndex: true,
        },
      });

      lastBest = bestFromSets(lastSets);
    }

    statsByExerciseId[String(exId)] = {
      pr: prBest,
      last: lastBest,
    };
  }

  return statsByExerciseId;
}

// GET /workouts/:id
// Returns workout + exercises + sets + statsByExerciseId
async function getWorkoutById(req, res) {
  try {
    const userId = req.user.id;
    const workoutId = Number(req.params.id);

    if (!Number.isInteger(workoutId)) {
      return res.status(400).json({ message: "Invalid workout id" });
    }

    const workout = await prisma.workout.findFirst({
      where: { id: workoutId, userId },
      include: {
        exercises: {
          include: {
            exercise: true,
            sets: true,
          },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!workout) return res.status(404).json({ message: "Workout not found" });

    // Create WorkoutExercise rows if missing (from plan)
    if (workout.exercises.length === 0) {
      const trainingDay = await prisma.userTrainingDay.findFirst({
        where: { userId, dayKey: workout.planDay },
        include: {
          exercises: {
            orderBy: { orderIndex: "asc" },
            include: { exercise: true },
          },
        },
      });

      if (!trainingDay) {
        return res.status(400).json({
          message: `No plan found for dayKey ${workout.planDay}.`,
        });
      }

      await prisma.workoutExercise.createMany({
        data: trainingDay.exercises.map((row) => ({
          workoutId: workout.id,
          exerciseId: row.exerciseId,
          orderIndex: row.orderIndex,
          targetSets: 0,
        })),
      });

      const updatedWorkout = await prisma.workout.findFirst({
        where: { id: workoutId, userId },
        include: {
          exercises: {
            include: {
              exercise: true,
              sets: true,
            },
            orderBy: { orderIndex: "asc" },
          },
        },
      });

      const statsByExerciseId = await computeStatsForWorkout(userId, workoutId);
      return res.json({ workout: { ...updatedWorkout, statsByExerciseId } });
    }

    const statsByExerciseId = await computeStatsForWorkout(userId, workoutId);
    return res.json({ workout: { ...workout, statsByExerciseId } });
  } catch (err) {
    console.error("getWorkoutById error:", err);
    return res.status(500).json({ message: "Failed to load workout" });
  }
}

// POST /workouts/:id/sets
// Upsert ONLY NORMAL sets by (workoutExerciseId + setIndex)
// Body: { workoutExerciseId, setIndex, weight, reps }
async function upsertNormalSet(req, res) {
  try {
    const userId = req.user.id;
    const workoutId = Number(req.params.id);

    const { workoutExerciseId, setIndex, weight, reps } = req.body || {};

    if (!Number.isInteger(workoutId)) {
      return res.status(400).json({ message: "Invalid workout id" });
    }

    const weId = Number(workoutExerciseId);
    const idx = clampInt(setIndex, { min: 0, max: 200 });
    const w = clampFloat(weight, { min: 0, max: 999 });
    const r = clampInt(reps, { min: 0, max: 200 });

    if (!Number.isInteger(weId) || idx === null || w === null || r === null) {
      return res.status(400).json({ message: "Invalid set payload" });
    }

    // Make sure workout belongs to user and workoutExercise belongs to workout
    const workout = await prisma.workout.findFirst({
      where: { id: workoutId, userId },
      select: { id: true, status: true },
    });

    if (!workout) return res.status(404).json({ message: "Workout not found" });
    if (workout.status !== "PLANNED") {
      return res.status(400).json({ message: "Workout is already completed" });
    }

    const we = await prisma.workoutExercise.findFirst({
      where: { id: weId, workoutId },
      select: { id: true },
    });

    if (!we) return res.status(404).json({ message: "Workout exercise not found" });

    // Find existing NORMAL set for this (weId, idx)
    const existing = await prisma.set.findFirst({
      where: {
        workoutExerciseId: weId,
        setIndex: idx,
        kind: "NORMAL",
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.set.update({
        where: { id: existing.id },
        data: { weight: w, reps: r },
      });
    } else {
      await prisma.set.create({
        data: {
          workoutExerciseId: weId,
          setIndex: idx,
          kind: "NORMAL",
          weight: w,
          reps: r,
        },
      });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("upsertNormalSet error:", err);
    return res.status(500).json({ message: "Failed to save set" });
  }
}

// PATCH /workouts/:id/sets/:setId
// Update any set by id (NORMAL or DROP parts)
async function updateSetById(req, res) {
  try {
    const userId = req.user.id;
    const workoutId = Number(req.params.id);
    const setId = Number(req.params.setId);

    const { weight, reps } = req.body || {};

    if (!Number.isInteger(workoutId) || !Number.isInteger(setId)) {
      return res.status(400).json({ message: "Invalid ids" });
    }

    const w = clampFloat(weight, { min: 0, max: 999 });
    const r = clampInt(reps, { min: 0, max: 200 });
    if (w === null || r === null) {
      return res.status(400).json({ message: "Invalid weight or reps" });
    }

    // Verify the set belongs to this user+workout
    const setRow = await prisma.set.findFirst({
      where: {
        id: setId,
        workoutExercise: {
          workoutId,
          workout: { userId },
        },
      },
      select: { id: true },
    });

    if (!setRow) return res.status(404).json({ message: "Set not found" });

    await prisma.set.update({
      where: { id: setId },
      data: { weight: w, reps: r },
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("updateSetById error:", err);
    return res.status(500).json({ message: "Failed to update set" });
  }
}

// DELETE /workouts/:id/sets/:setId
async function deleteSet(req, res) {
  try {
    const userId = req.user.id;
    const workoutId = Number(req.params.id);
    const setId = Number(req.params.setId);

    if (!Number.isInteger(workoutId) || !Number.isInteger(setId)) {
      return res.status(400).json({ message: "Invalid ids" });
    }

    const setRow = await prisma.set.findFirst({
      where: {
        id: setId,
        workoutExercise: {
          workoutId,
          workout: { userId },
        },
      },
      select: { id: true, dropGroupId: true, kind: true },
    });

    if (!setRow) return res.status(404).json({ message: "Set not found" });

    // If someone deletes DROP_MAIN or DROP_PART manually, we allow it,
    // but ideally you delete the whole group via /dropsets/:groupId.
    await prisma.set.delete({ where: { id: setRow.id } });

    return res.json({ ok: true });
  } catch (err) {
    console.error("deleteSet error:", err);
    return res.status(500).json({ message: "Failed to delete set" });
  }
}

// POST /workouts/:id/dropsets
// Body:
// {
//   workoutExerciseId,
//   main: { weight, reps },
//   drops: [{weight,reps}, ...]
// }
async function createDropSetGroup(req, res) {
  try {
    const userId = req.user.id;
    const workoutId = Number(req.params.id);

    const { workoutExerciseId, main, drops } = req.body || {};
    const weId = Number(workoutExerciseId);

    if (!Number.isInteger(workoutId) || !Number.isInteger(weId)) {
      return res.status(400).json({ message: "Invalid ids" });
    }

    const workout = await prisma.workout.findFirst({
      where: { id: workoutId, userId },
      select: { id: true, status: true },
    });

    if (!workout) return res.status(404).json({ message: "Workout not found" });
    if (workout.status !== "PLANNED") {
      return res.status(400).json({ message: "Workout is already completed" });
    }

    const we = await prisma.workoutExercise.findFirst({
      where: { id: weId, workoutId },
      select: { id: true },
    });

    if (!we) return res.status(404).json({ message: "Workout exercise not found" });

    const mainW = clampFloat(main?.weight, { min: 0, max: 999 });
    const mainR = clampInt(main?.reps, { min: 0, max: 200 });
    if (mainW === null || mainR === null) {
      return res.status(400).json({ message: "Invalid main set" });
    }

    const dropArr = Array.isArray(drops) ? drops : [];
    for (const d of dropArr) {
      const dw = clampFloat(d?.weight, { min: 0, max: 999 });
      const dr = clampInt(d?.reps, { min: 0, max: 200 });
      if (dw === null || dr === null) {
        return res.status(400).json({ message: "Invalid drop set" });
      }
    }

    // Choose next setIndex range:
    const lastSet = await prisma.set.findFirst({
      where: { workoutExerciseId: weId },
      orderBy: { setIndex: "desc" },
      select: { setIndex: true },
    });

    let nextIndex = lastSet ? lastSet.setIndex + 1 : 0;

    // Create group
    const group = await prisma.dropSetGroup.create({
      data: { workoutExerciseId: weId },
      select: { id: true },
    });

    // Create main + drops
    const data = [];

    data.push({
      workoutExerciseId: weId,
      setIndex: nextIndex++,
      kind: "DROP_MAIN",
      weight: mainW,
      reps: mainR,
      dropGroupId: group.id,
    });

    for (const d of dropArr) {
      data.push({
        workoutExerciseId: weId,
        setIndex: nextIndex++,
        kind: "DROP_PART",
        weight: Number(d.weight),
        reps: Number(d.reps),
        dropGroupId: group.id,
      });
    }

    await prisma.set.createMany({ data });

    return res.status(201).json({ ok: true, dropGroupId: group.id });
  } catch (err) {
    console.error("createDropSetGroup error:", err);
    return res.status(500).json({ message: "Failed to create drop set" });
  }
}

// DELETE /workouts/:id/dropsets/:groupId
async function deleteDropSetGroup(req, res) {
  try {
    const userId = req.user.id;
    const workoutId = Number(req.params.id);
    const groupId = Number(req.params.groupId);

    if (!Number.isInteger(workoutId) || !Number.isInteger(groupId)) {
      return res.status(400).json({ message: "Invalid ids" });
    }

    const group = await prisma.dropSetGroup.findFirst({
      where: {
        id: groupId,
        workoutExercise: {
          workoutId,
          workout: { userId },
        },
      },
      select: { id: true },
    });

    if (!group) return res.status(404).json({ message: "Drop set not found" });

    // cascade deletes sets due to relation on Set.dropGroup -> DropSetGroup
    await prisma.dropSetGroup.delete({ where: { id: group.id } });

    return res.json({ ok: true });
  } catch (err) {
    console.error("deleteDropSetGroup error:", err);
    return res.status(500).json({ message: "Failed to delete drop set" });
  }
}

// POST /workouts/:id/complete
async function completeWorkout(req, res) {
  try {
    const userId = req.user.id;
    const workoutId = Number(req.params.id);

    if (!Number.isInteger(workoutId)) {
      return res.status(400).json({ message: "Invalid workout id" });
    }

    const workout = await prisma.workout.findFirst({
      where: { id: workoutId, userId },
      select: { id: true, status: true },
    });

    if (!workout) return res.status(404).json({ message: "Workout not found" });
    if (workout.status === "COMPLETED") {
      return res.json({ message: "Already completed" });
    }

    const updated = await prisma.workout.update({
      where: { id: workoutId },
      data: { status: "COMPLETED" },
    });

    return res.json({
      workout: {
        id: updated.id,
        status: updated.status,
        planDay: updated.planDay,
        date: updated.date,
      },
    });
  } catch (err) {
    console.error("completeWorkout error:", err);
    return res.status(500).json({ message: "Failed to complete workout" });
  }
}

module.exports = {
  getWorkoutById,
  completeWorkout,

  upsertNormalSet,
  deleteSet,

  createDropSetGroup,
  updateSetById,
  deleteDropSetGroup,
};
