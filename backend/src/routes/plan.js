const express = require("express");
const authenticate = require("../middleware/auth");
const {
  generateDefaultPlan,
  saveCustomPlan,
  getMyPlan,
  getCurrentPlan,
} = require("../controllers/planController");

const router = express.Router();

router.get("/me", authenticate, getMyPlan);
router.post("/default", authenticate, generateDefaultPlan);
router.post("/custom", authenticate, saveCustomPlan);
// router.get("/current", authenticate, getCurrentPlan);

module.exports = router;
