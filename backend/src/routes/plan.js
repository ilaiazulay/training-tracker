const express = require("express");
const authenticate = require("../middleware/auth");
const { generateDefaultPlan, saveCustomPlan } = require("../controllers/planController");

const router = express.Router();

// POST /plan/default
router.post("/default", authenticate, generateDefaultPlan);

router.post("/custom", authenticate, saveCustomPlan);

module.exports = router;
