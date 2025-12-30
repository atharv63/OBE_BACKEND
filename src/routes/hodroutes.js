const express = require("express");

const {
  getDashboardStats,
  getAllCourses,
  createCourse,
  getPrograms,
  getAutoCode,
  createClo,
  getClosByCourse,
  getPosPsosByProgram,
  mapClosToPosPsos,
} = require("../controllers/hodController");

const { authenticate } = require("../middleware/auth");

const router = express.Router();

// HOD Dashboard statistics
router.get("/dashboard/stats", authenticate, getDashboardStats);

//Get all courses
router.get("/all-courses", authenticate, getAllCourses);

//Get programs linked to HOD's department
router.get("/programmes", authenticate, getPrograms);

//Get auto-generated course code
router.get("/program/:programmeId/auto-code", authenticate, getAutoCode);

//Create a course
router.post("/course", authenticate, createCourse);

//Create CLO for a course
router.post("/clo/createClo/:courseId", authenticate, createClo);

//Get CLOs by course
router.get("/course/:courseId/clos", authenticate, getClosByCourse);

//Get POs and PSOs by program
router.get("/course/:courseId/po-pso", authenticate, getPosPsosByProgram);

//Map CLOs to POs and PSOs
router.post("/course/:courseId/map-clos", authenticate, mapClosToPosPsos);

module.exports = router;
