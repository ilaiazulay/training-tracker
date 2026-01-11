// src/routes/statsRoutes.js
const router = require("express").Router();
const auth = require("../middleware/auth");
const { getOverview } = require("../controllers/statsController");

router.get("/overview", auth, getOverview);

module.exports = router;
