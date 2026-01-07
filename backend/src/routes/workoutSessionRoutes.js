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
} = require("../controllers/workoutSessionController");

router.get("/:id", auth, getWorkoutById);
router.post("/:id/complete", auth, completeWorkout);

// Normal sets (your current flow)
router.post("/:id/sets", auth, upsertNormalSet);
router.delete("/:id/sets/:setId", auth, deleteSet);

// Drop sets (new)
router.post("/:id/dropsets", auth, createDropSetGroup);
router.patch("/:id/sets/:setId", auth, updateSetById); // edit any set (drop or normal)
router.delete("/:id/dropsets/:groupId", auth, deleteDropSetGroup);

module.exports = router;
