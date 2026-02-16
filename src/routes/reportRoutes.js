
const express = require("express");
const { authenticate } = require("../middleware/auth.js");
const {
  getProgramReport,
  getCourseContributionDetails
} = require("../controllers/reportController.js");

const router = express.Router();

router.use(authenticate);

router.get("/program-report", getProgramReport);

router.get("/course/:courseId/contributions", getCourseContributionDetails);

module.exports = router;