// src/routes/workoutSessionRoutes.js
const router = require("express").Router();
const auth = require("../middleware/auth");

const {
  getWorkoutById,
  completeWorkout,

  upsertNormalSet,
  deleteSet,

  createDropSetGroup,
  updateSetById,
  deleteDropSetGroup,
  switchWorkoutExercise,
} = require("../controllers/workoutSessionController");

// ✅ Switch exercise (must be authenticated)
router.patch("/exercises/:workoutExerciseId/switch", auth, switchWorkoutExercise);

// Workout
router.get("/:id", auth, getWorkoutById);
router.post("/:id/complete", auth, completeWorkout);

// Normal sets
router.post("/:id/sets", auth, upsertNormalSet);
router.delete("/:id/sets/:setId", auth, deleteSet);

// Drop sets
router.post("/:id/dropsets", auth, createDropSetGroup);
router.patch("/:id/sets/:setId", auth, updateSetById);
router.delete("/:id/dropsets/:groupId", auth, deleteDropSetGroup);

module.exports = router;
