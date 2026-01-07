const express = require("express");
const authenticate = require("../middleware/auth");
const { completeOnboarding } = require("../controllers/userController");

const router = express.Router();

router.post("/onboarding", authenticate, completeOnboarding);

module.exports = router;
