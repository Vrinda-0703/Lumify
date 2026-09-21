const express = require("express");
const { signup, login } = require("../controllers/authController");
const { loginRateLimit } = require("../middleware/rateLimitMiddleware");

const router = express.Router();
router.post("/signup", signup);
router.post("/register", signup);
router.post("/login", loginRateLimit(), login);
module.exports = router;
