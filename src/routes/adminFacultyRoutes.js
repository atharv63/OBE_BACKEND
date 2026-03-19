const express = require("express");
const {
  getAllFaculty,
  getFacultyByDepartment,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  getFacultyDetails
} = require("../controllers/adminFacultyController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication and ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN'));

// Get all faculty
router.get("/", getAllFaculty);

// Get faculty by department
router.get("/department/:departmentId", getFacultyByDepartment);

// Create new faculty
router.post("/", createFaculty);

// Get faculty details
router.get("/:facultyId", getFacultyDetails);

// Update faculty
router.put("/:facultyId", updateFaculty);

// Delete faculty (soft delete)
router.delete("/:facultyId", deleteFaculty);

module.exports = router;