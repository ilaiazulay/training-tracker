const router = require("express").Router();
const auth = require("../middleware/auth");

const {
  getTodayWorkout,
  startWorkout,
  abandonActiveWorkout,
} = require("../controllers/workoutController");

router.get("/today", auth, getTodayWorkout);
router.post("/start", auth, startWorkout);
router.post("/abandon", auth, abandonActiveWorkout);

module.exports = router;
