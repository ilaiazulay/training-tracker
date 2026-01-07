// src/routes/setRoutes.js
const router = require("express").Router();
const auth = require("../middleware/auth");
const { upsertSet, deleteSet } = require("../controllers/setController");

router.post("/workouts/:id/sets", auth, upsertSet);
router.delete("/workouts/:id/sets/:setId", auth, deleteSet);

module.exports = router;
