// src/controllers/workoutSessionController.js
const prisma = require("../prisma");

// ... (Keep your helper functions: clampInt, clampFloat, formatBestSet) ...
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

function formatBestSet(bestSet, groupSets = []) {
  if (!bestSet) return null;
  if (!bestSet.dropGroupId) {
    return { kind: "NORMAL", weight: bestSet.weight, reps: bestSet.reps };
  }
  if (groupSets.length > 0) {
    const sorted = [...groupSets].sort((a, b) => a.setIndex - b.setIndex);
    const mainSet = sorted.find((x) => x.kind === "DROP_MAIN") || sorted[0];
    const drops = sorted
      .filter((x) => x.kind === "DROP_PART")
      .map((x) => ({ weight: x.weight, reps: x.reps }));
    let bestPart = null;
    let bestVal = -1;
    for(const s of sorted) {
        const val = s.weight * 1000 + s.reps;
        if(val > bestVal) {
            bestVal = val;
            bestPart = { weight: s.weight, reps: s.reps };
        }
    }
    return {
      kind: "DROPSET",
      main: mainSet ? { weight: mainSet.weight, reps: mainSet.reps } : null,
      drops,
      bestPart,
      dropGroupId: bestSet.dropGroupId,
    };
  }
  return { kind: "NORMAL", weight: bestSet.weight, reps: bestSet.reps };
}

// ... (Keep computeStatsForWorkout helper) ...
async function computeStatsForWorkout(userId, workoutId) {
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, userId },
    include: { exercises: { include: { exercise: true }, orderBy: { orderIndex: "asc" } } },
  });
  if (!workout) return {};

  const exerciseIds = workout.exercises.map((we) => we.exerciseId);
  const statsByExerciseId = {};

  await Promise.all(
    exerciseIds.map(async (exId) => {
      // 1. PR
      const prSet = await prisma.set.findFirst({
        where: {
          workoutExercise: { exerciseId: exId, workout: { userId, status: "COMPLETED" } },
        },
        orderBy: [{ weight: "desc" }, { reps: "desc" }],
      });
      let prFormatted = null;
      if (prSet) {
        let groupSets = [];
        if (prSet.dropGroupId) {
          groupSets = await prisma.set.findMany({ where: { dropGroupId: prSet.dropGroupId } });
        }
        prFormatted = formatBestSet(prSet, groupSets);
      }

      // 2. LAST
      const lastWe = await prisma.workoutExercise.findFirst({
        where: { exerciseId: exId, workout: { userId, status: "COMPLETED" } },
        orderBy: { workout: { date: "desc" } },
        include: { sets: true },
      });
      let lastFormatted = null;
      if (lastWe && lastWe.sets.length > 0) {
        const sorted = [...lastWe.sets].sort((a, b) => b.weight - a.weight || b.reps - a.reps);
        const bestInSession = sorted[0];
        const groupSets = bestInSession.dropGroupId
          ? lastWe.sets.filter((s) => s.dropGroupId === bestInSession.dropGroupId)
          : [];
        lastFormatted = formatBestSet(bestInSession, groupSets);
      }

      statsByExerciseId[String(exId)] = { pr: prFormatted, last: lastFormatted };
    })
  );
  return statsByExerciseId;
}

// ✅ UPDATED: Clean Read-Only Endpoint
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
            plannedExercise: true,   
            sets: true,
          },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!workout) return res.status(404).json({ message: "Workout not found" });

    // ❌ REMOVED: The logic that checked if (workout.exercises.length === 0) and inserted data.
    // Since startWorkout now handles creation, this function is purely for reading.

    return res.json({ workout: { ...workout, statsByExerciseId: {} } });
  } catch (err) {
    console.error("getWorkoutById error:", err);
    return res.status(500).json({ message: "Failed to load workout" });
  }
}

// ... (Keep the rest of your controllers exactly as they were: completeWorkout, getWorkoutStats, upsertNormalSet, etc.) ...
async function getWorkoutStats(req, res) {
  try {
    const userId = req.user.id;
    const workoutId = Number(req.params.id);
    if (!Number.isInteger(workoutId)) return res.status(400).json({ message: "Invalid id" });

    const stats = await computeStatsForWorkout(userId, workoutId);
    return res.json({ stats });
  } catch (err) {
    console.error("getWorkoutStats error:", err);
    return res.status(500).json({ message: "Failed to load stats" });
  }
}

async function upsertNormalSet(req, res) {
    // ... [Keep existing implementation] ...
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
    
        // Check workout active
        const workout = await prisma.workout.findFirst({
          where: { id: workoutId, userId },
          select: { id: true, status: true },
        });
    
        if (!workout) return res.status(404).json({ message: "Workout not found" });
        if (workout.status !== "PLANNED") {
          return res.status(400).json({ message: "Workout is already completed" });
        }
    
        // Check workoutExercise exists
        const we = await prisma.workoutExercise.findFirst({
          where: { id: weId, workoutId },
          select: { id: true },
        });
    
        if (!we) return res.status(404).json({ message: "Workout exercise not found" });
    
        // Upsert
        const existing = await prisma.set.findFirst({
          where: {
            workoutExerciseId: weId,
            setIndex: idx,
            kind: "NORMAL",
          },
          select: { id: true },
        });
    
        let savedSet;
        if (existing) {
          savedSet = await prisma.set.update({
            where: { id: existing.id },
            data: { weight: w, reps: r },
          });
        } else {
          savedSet = await prisma.set.create({
            data: {
              workoutExerciseId: weId,
              setIndex: idx,
              kind: "NORMAL",
              weight: w,
              reps: r,
            },
          });
        }
    
        return res.json({ set: savedSet });
      } catch (err) {
        console.error("upsertNormalSet error:", err);
        return res.status(500).json({ message: "Failed to save set" });
      }
}

async function updateSetById(req, res) {
    // ... [Keep existing implementation] ...
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

async function deleteSet(req, res) {
    // ... [Keep existing implementation] ...
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
          select: { id: true },
        });
    
        if (!setRow) return res.status(404).json({ message: "Set not found" });
    
        await prisma.set.delete({ where: { id: setRow.id } });
    
        return res.json({ ok: true });
      } catch (err) {
        console.error("deleteSet error:", err);
        return res.status(500).json({ message: "Failed to delete set" });
      }
}

async function createDropSetGroup(req, res) {
    // ... [Keep existing implementation] ...
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
        
        if (mainW === null || mainR === null) return res.status(400).json({ message: "Invalid main set" });
        const dropArr = Array.isArray(drops) ? drops : [];
        for(const d of dropArr) {
            if(clampFloat(d.weight, {min:0,max:999}) === null) return res.status(400).json({message: "Invalid drop weight"});
            if(clampInt(d.reps, {min:0,max:200}) === null) return res.status(400).json({message: "Invalid drop reps"});
        }
    
        const lastSet = await prisma.set.findFirst({
          where: { workoutExerciseId: weId },
          orderBy: { setIndex: "desc" },
          select: { setIndex: true },
        });
    
        let nextIndex = lastSet ? lastSet.setIndex + 1 : 0;
    
        const group = await prisma.dropSetGroup.create({
          data: { workoutExerciseId: weId },
          select: { id: true },
        });
    
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

async function deleteDropSetGroup(req, res) {
    // ... [Keep existing implementation] ...
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
    
        await prisma.dropSetGroup.delete({ where: { id: group.id } });
    
        return res.json({ ok: true });
      } catch (err) {
        console.error("deleteDropSetGroup error:", err);
        return res.status(500).json({ message: "Failed to delete drop set" });
      }
}

async function completeWorkout(req, res) {
    // ... [Keep existing implementation] ...
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

async function switchWorkoutExercise(req, res) {
    // ... [Keep existing implementation] ...
    try {
        const userId = req.user.id;
        const workoutExerciseId = Number(req.params.workoutExerciseId);
        const newExerciseId = Number(req.body?.newExerciseId);
    
        if (!Number.isInteger(workoutExerciseId) || !Number.isInteger(newExerciseId)) {
          return res.status(400).json({ message: "Invalid ids" });
        }
    
        const we = await prisma.workoutExercise.findFirst({
          where: {
            id: workoutExerciseId,
            workout: { userId },
          },
          include: {
            workout: { select: { id: true, status: true } },
            plannedExercise: { select: { id: true, muscleGroup: true, name: true } },
          },
        });
    
        if (!we) return res.status(404).json({ message: "Workout exercise not found" });
        if (we.workout.status !== "PLANNED") return res.status(400).json({ message: "Workout is already completed" });
    
        const newEx = await prisma.exercise.findFirst({
          where: {
            id: newExerciseId,
            OR: [{ isGlobal: true }, { createdByUserId: userId }],
          },
          select: { id: true, muscleGroup: true },
        });
    
        if (!newEx) return res.status(404).json({ message: "Exercise not found" });
    
        if (newEx.muscleGroup !== we.plannedExercise.muscleGroup) {
          return res.status(400).json({
            message: `Invalid exercise. Must be ${we.plannedExercise.muscleGroup}`,
          });
        }
    
        // Determine isSubstitution
        const isSubstitution = newExerciseId !== we.plannedExerciseId;
    
        await prisma.workoutExercise.update({
          where: { id: we.id },
          data: {
            exerciseId: newExerciseId,
            isSubstitution,
          },
        });
    
        return res.json({ ok: true });
      } catch (err) {
        console.error("switchWorkoutExercise error:", err);
        return res.status(500).json({ message: "Failed to switch exercise" });
      }
}


module.exports = {
  getWorkoutById,
  completeWorkout,
  getWorkoutStats,
  upsertNormalSet,
  deleteSet,
  createDropSetGroup,
  updateSetById,
  deleteDropSetGroup,
  switchWorkoutExercise,
};