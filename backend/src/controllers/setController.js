// src/controllers/setController.js
const prisma = require("../prisma");

// POST /workouts/:id/sets
// body: { workoutExerciseId, setIndex, weight, reps }
async function upsertSet(req, res) {
  try {
    const userId = req.user.id;
    const workoutId = Number(req.params.id);

    const { workoutExerciseId, setIndex, weight, reps } = req.body || {};

    if (!Number.isInteger(workoutId)) {
      return res.status(400).json({ message: "Invalid workout id" });
    }
    if (!Number.isInteger(Number(workoutExerciseId))) {
      return res.status(400).json({ message: "workoutExerciseId is required" });
    }
    if (!Number.isInteger(Number(setIndex)) || Number(setIndex) < 0) {
      return res.status(400).json({ message: "setIndex must be a non-negative integer" });
    }

    const wExId = Number(workoutExerciseId);

    // Verify workout belongs to user and workoutExercise belongs to workout
    const wex = await prisma.workoutExercise.findFirst({
      where: { id: wExId, workoutId },
      include: { workout: true },
    });

    if (!wex || wex.workout.userId !== userId) {
      return res.status(404).json({ message: "Workout exercise not found" });
    }

    const weightNum = Number(weight);
    const repsNum = Number(reps);

    if (!Number.isFinite(weightNum) || weightNum < 0 || weightNum > 500) {
      return res.status(400).json({ message: "weight must be a number between 0 and 500" });
    }
    if (!Number.isInteger(repsNum) || repsNum < 0 || repsNum > 200) {
      return res.status(400).json({ message: "reps must be an integer between 0 and 200" });
    }

    // We don't have unique constraint, so we update if exists (same workoutExerciseId+setIndex)
    const existing = await prisma.set.findFirst({
      where: { workoutExerciseId: wExId, setIndex: Number(setIndex) },
    });

    let saved;
    if (existing) {
      saved = await prisma.set.update({
        where: { id: existing.id },
        data: { weight: weightNum, reps: repsNum },
      });
    } else {
      saved = await prisma.set.create({
        data: {
          workoutExerciseId: wExId,
          setIndex: Number(setIndex),
          weight: weightNum,
          reps: repsNum,
        },
      });
    }

    return res.json({ set: saved });
  } catch (err) {
    console.error("upsertSet error:", err);
    return res.status(500).json({ message: "Failed to save set" });
  }
}

// DELETE /workouts/:id/sets/:setId
async function deleteSet(req, res) {
  try {
    const userId = req.user.id;
    const workoutId = Number(req.params.id);
    const setId = Number(req.params.setId);

    if (!Number.isInteger(workoutId) || !Number.isInteger(setId)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const setRow = await prisma.set.findFirst({
      where: { id: setId },
      include: {
        workoutExercise: {
          include: { workout: true },
        },
      },
    });

    if (!setRow) return res.status(404).json({ message: "Set not found" });

    if (
      setRow.workoutExercise.workoutId !== workoutId ||
      setRow.workoutExercise.workout.userId !== userId
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await prisma.set.delete({ where: { id: setId } });
    return res.json({ ok: true });
  } catch (err) {
    console.error("deleteSet error:", err);
    return res.status(500).json({ message: "Failed to delete set" });
  }
}

module.exports = {
  upsertSet,
  deleteSet,
};
