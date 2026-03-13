const express = require("express");
const {
  getFacultyProfile,
  getCurrentAssignments,
  getDashboardStats,
  getAllAssignments,
  getDepartmentInfo,
  getCourseDetails,
  submitReportToHOD,
  checkReportSubmission,
} = require("../controllers/facultyController");

const { authenticate } = require("../middleware/auth");

const router = express.Router();
console.log("Faculty routes loaded");

// Faculty Dashboard statistics
router.get("/dashboard/stats", authenticate, getDashboardStats);

// Get faculty profile
router.get("/profile", authenticate, getFacultyProfile);

// Get current semester assignments
router.get("/assignments/current", authenticate, getCurrentAssignments);

// Get all assignments (historical)
router.get("/assignments", authenticate, getAllAssignments);

// Get department info
router.get("/department", authenticate, getDepartmentInfo);

// Get course details with CLOs
router.get("/courses/:courseId", authenticate, getCourseDetails);

// In your facultyRoutes.js
router.post("/reports/submit-to-hod",authenticate, submitReportToHOD);

// In your faculty routes file
router.get('/reports/check-submission', authenticate, checkReportSubmission);

module.exports = router;