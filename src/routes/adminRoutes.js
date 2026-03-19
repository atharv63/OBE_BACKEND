const express = require("express");
const {
  getProgramTypesWithCounts,
  getProgramsByLevel,
  getDepartmentsByProgram,
  getCoursesByDepartment,
  getProgramLevels,
  getProgramDetails,
  getDepartmentDetails,
  getCourseDetails
} = require("../controllers/adminController");
const { authenticate, authorize } = require("../middleware/auth");
const { checkUserDependencies } = require("../controllers/adminUserController");

const router = express.Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN'));

// Dashboard endpoint
router.get("/dashboard", getProgramTypesWithCounts);

// Program levels (simplified)
router.get("/program-levels", getProgramLevels);

// Programs by level (UG, PG, etc.)
router.get("/programs/level/:level", getProgramsByLevel);

// Departments under a program
router.get("/programs/:programId/departments", getDepartmentsByProgram);

// Courses under a department
router.get("/departments/:departmentId/courses", getCoursesByDepartment);

// Single item details
router.get("/programs/:programId", getProgramDetails);
router.get("/departments/:departmentId", getDepartmentDetails);
router.get("/courses/:courseId", getCourseDetails);


module.exports = router;