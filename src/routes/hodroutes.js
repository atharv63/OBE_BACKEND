const express = require("express");

const {
  getDashboardStats,
  getAllCourses,
} = require("../controllers/hodController");

const { authenticate } = require("../middleware/auth");

const router = express.Router();

// HOD Dashboard statistics
router.get("/dashboard/stats", authenticate, getDashboardStats);

//Get all courses
router.get("/all-courses", authenticate, getAllCourses);

module.exports = router;
