const express = require("express");

const {
  getDashboardStats,
  getAllCourses,
  getCoursesByAcademicPeriod,
  createCourse,
  updateCourse,
  deleteCourse,
  getPrograms,
  getAutoCode,
  getCourseById,
  createClo,
  getClosByCourse,
  updateClo,
  getPosPsosByProgram,
  mapClosToPosPsos,
  getMappings,
  getDepartmentFaculties,
  getAvailableFacultiesForCourse,
  getCourseAssignments,
  assignFacultyToCourse,
  updateAssignment,
  removeFacultyAssignment,
  getFacultyWorkload,
  getAllDepartmentAssignments,
  getAssignmentsStats,
  getCourseAttainment,
} = require("../controllers/hodController");

const {
  getCourseContributionDetails,
  getCourseAttainmentReport,
} = require("../controllers/reportController");

const { authenticate } = require("../middleware/auth");

const router = express.Router();
console.log("HOD routes loaded");

// HOD Dashboard statistics
router.get("/dashboard/stats", authenticate, getDashboardStats);

//Get all courses
router.get("/all-courses", authenticate, getAllCourses);

// Get courses by academic period (year and semester) with query params
router.get("/courses", authenticate, getCoursesByAcademicPeriod);
// Get courses by academic period with path params
router.get("/courses", authenticate, getCoursesByAcademicPeriod);

//Get course by ID
router.get("/course/:courseId", authenticate, getCourseById);

//Get programs linked to HOD's department
router.get("/programmes", authenticate, getPrograms);

//Get auto-generated course code
router.get("/program/:programmeId/auto-code", authenticate, getAutoCode);

//Create a course
router.post("/course", authenticate, createCourse);

//Update a course
router.put("/course/:courseId", authenticate, updateCourse);

//Delete a course
router.delete("/course/:courseId", authenticate, deleteCourse);

//Create CLO for a course
router.post("/clo/createClo/:courseId", authenticate, createClo);

//Get CLOs by course
router.get("/course/:courseId/clos", authenticate, getClosByCourse);

//Update CLO
router.put("/clo/:cloId", authenticate, updateClo);

//Get POs and PSOs by program
router.get("/course/:courseId/po-pso", authenticate, getPosPsosByProgram);

//Map CLOs to POs and PSOs
router.post("/course/:courseId/map-clos", authenticate, mapClosToPosPsos);

//Get mappings for a course
router.get("/course/:courseId/map-clos", authenticate, getMappings);

// Get all faculties in department
router.get("/faculties", authenticate, getDepartmentFaculties);

// Get available faculties for a course
router.get(
  "/courses/:courseId/available-faculties",
  authenticate,
  getAvailableFacultiesForCourse,
);

// Get course assignments
console.log("Registering route for getting course assignments");
router.get(
  "/courses/:courseId/assignments",
  authenticate,
  getCourseAssignments,
);

// Assign faculty to course
router.post("/courses/:courseId/assign", authenticate, assignFacultyToCourse);

// Update assignment
router.put(
  "/courses/:courseId/assignments/:facultyId/:semester/:year",
  authenticate,
  updateAssignment,
);

// Remove assignment
router.delete(
  "/courses/:courseId/assignments/:facultyId/:semester/:year",
  authenticate,
  removeFacultyAssignment,
);

// Get faculty workload
router.get("/faculties/:facultyId/workload", authenticate, getFacultyWorkload);

// HOD reports (from performance_reports submitted by faculty)
router.get(
  "/reports/course/:courseId/contributions",
  authenticate,
  getCourseContributionDetails,
);
router.get(
  "/reports/course/:courseId/attainment",
  authenticate,
  getCourseAttainmentReport,
);

// router.get("/courses/:courseId", authenticate, getCourseById);
router.get("/assignments", authenticate, getAllDepartmentAssignments);
router.get("/assignments/stats", authenticate, getAssignmentsStats);

router.get(
  "/course/:courseId/attainment/:year/:semester",
  authenticate,
  getCourseAttainment,
);
module.exports = router;
