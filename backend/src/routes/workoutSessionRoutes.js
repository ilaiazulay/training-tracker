// src/routes/workoutSessionRoutes.js
const router = require("express").Router();
const auth = require("../middleware/auth");

const {
  getWorkoutById,
  getWorkoutStats, // ✅ Import this
  completeWorkout,
  upsertNormalSet,
  deleteSet,
  createDropSetGroup,
  updateSetById,
  deleteDropSetGroup,
  switchWorkoutExercise,
} = require("../controllers/workoutSessionController");

router.patch("/exercises/:workoutExerciseId/switch", auth, switchWorkoutExercise);

// ✅ Add this line BEFORE /:id
router.get("/:id/stats", auth, getWorkoutStats);

router.get("/:id", auth, getWorkoutById);
router.post("/:id/complete", auth, completeWorkout);
router.post("/:id/sets", auth, upsertNormalSet);
router.delete("/:id/sets/:setId", auth, deleteSet);
router.post("/:id/dropsets", auth, createDropSetGroup);
router.patch("/:id/sets/:setId", auth, updateSetById);
router.delete("/:id/dropsets/:groupId", auth, deleteDropSetGroup);

module.exports = router;