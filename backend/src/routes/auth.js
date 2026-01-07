const express = require("express");
const { signup, login, refresh, loginWithGoogle } = require("../controllers/authController");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/google", loginWithGoogle);

module.exports = router;
