const express = require("express");

// Destructure only the functions directly used as handlers
const {
  getAllFaculty,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  getFacultyById,
  getFacultyByDepartment,
  assignCourseToFaculty,
  getCoursesByFaculty,
  removeCourseFromFaculty,
  getFacultyWithCourses,
  createCourse,
  createCourseCode,
  getCourses,
  getAllCourses,
  getCourseById,
  getCourseCategories,
  updateCourse,
  deleteCourse,
  createCLO,
  createMultipleCLOs,
  getCLOsByCourse,
  updateCLO,
  validateCLOCount,
  getCLOsList,
  getProgrammes,
  createProgramme,
  getProgrammeById,
  getCoursesByProgramme,
  updateProgramme,
  deleteProgramme,
  getPOs,
  getPSOs,
  mapCLOToPOPSO,
  getCLOMappings,
  getDashboardStats,
} = require("../controllers/hodController");

const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Get all faculty
router.get("/faculty", authenticate, getAllFaculty);

// Create faculty
router.post("/faculty", authenticate, createFaculty);

// Update faculty
router.put("/faculty/:id", authenticate, updateFaculty);

// Delete faculty
router.delete("/faculty/:id", authenticate, deleteFaculty);

// Get faculty by ID
router.get("/faculty/:id", authenticate, getFacultyById);

// Get faculty by department
router.get(
  "/faculty/department/:departmentId",
  authenticate,
  getFacultyByDepartment
);

// Get faculty along with assigned courses
router.get("/faculty/:id/courses", authenticate, getFacultyWithCourses);

// Assign course to faculty
router.post("/faculty/assign-course", authenticate, assignCourseToFaculty);

// Get courses assigned to a faculty
router.get(
  "/faculty/:facultyId/assigned-courses",
  authenticate,
  getCoursesByFaculty
);

// Remove assigned course from a faculty
router.delete("/faculty/remove-course", authenticate, removeCourseFromFaculty);

// Create course
router.post("/course", authenticate, createCourse);

// Create course code
router.get("/course-code/:programmeId", authenticate, createCourseCode);

// Get active courses
router.get("/courses", authenticate, getCourses);

//Get all courses
router.get("/all-courses", authenticate, getAllCourses);

// Get course by ID
router.get("/course/:id", authenticate, getCourseById);

// Get course categories
router.get("/course-categories", authenticate, getCourseCategories);

// Update course
router.put("/course/:id", authenticate, updateCourse);

// Delete course
router.delete("/course/:id", authenticate, deleteCourse);

// Create CLO
router.post("/clo", authenticate, createCLO);

// Create multiple CLOs
router.post("/courses/:courseId/clos", authenticate, createMultipleCLOs);

// Get CLOs by course
router.get("/clo/course/:courseId", authenticate, getCLOsByCourse);

// Update CLO
router.put("/clo/:id", authenticate, updateCLO);

// Map CLO to PO/PSO
router.post("/clo/map", authenticate, mapCLOToPOPSO);

// Validate CLO count before creation
router.post("/course/:courseId/clo-count", authenticate, validateCLOCount);

// Get CLOs for a course (list)
router.get("/course/:courseId/clos", authenticate, getCLOsList);

// Get CLO mappings for a course
router.get("/clo/mappings/:courseId", authenticate, getCLOMappings);

//GET PROGRAMMES
router.get("/programmes", authenticate, getProgrammes);

//CREATE PROGRAMME
router.post("/programmes", authenticate, createProgramme);

//GET PROGRAMME BY ID
router.get("/programmes/:id", authenticate, getProgrammeById);

// GET COURSES UNDER A PROGRAMME
router.get("/programmes/:id/courses", authenticate, getCoursesByProgramme);

//UPDATE PROGRAMME
router.put("/programmes/:id", authenticate, updateProgramme);

//DELETE PROGRAMME
router.delete("/programmes/:id", authenticate, deleteProgramme);

//GET POs
router.get("/po", authenticate, getPOs);

//GET PSOs
router.get("/pso", authenticate, getPSOs);

//GET DASHBOARD STATS
router.get("/dashboard/stats", authenticate, getDashboardStats);

module.exports = router;
