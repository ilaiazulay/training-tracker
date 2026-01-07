const express = require("express");
const authenticate = require("../middleware/auth");
const { listExercises, createExercise } = require("../controllers/exerciseController");

const router = express.Router();

router.get("/", authenticate, listExercises);
router.post("/", authenticate, createExercise);

module.exports = router;
