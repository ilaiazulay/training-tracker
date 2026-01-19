const express = require("express");
const authenticate = require("../middleware/auth");
const { completeOnboarding, updatePlanType } = require("../controllers/userController");

const router = express.Router();

router.post("/onboarding", authenticate, completeOnboarding);
router.patch("/me/plan-type", authenticate, updatePlanType);

module.exports = router;
