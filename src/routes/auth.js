// backend/src/routes/auth.js
const express = require("express");
const { login, getProfile } = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.post("/login", login);
router.get("/profile", authenticate, getProfile);
console.log("Auth routes loaded");

module.exports = router;
