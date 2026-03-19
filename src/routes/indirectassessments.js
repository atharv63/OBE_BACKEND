const express = require("express");
const { authenticate } = require("../middleware/auth.js");
const {
    importIndirectAssessments,
    getIndirectAssessments,
    getIndirectAssessmentMetadata,
    deleteIndirectAssessments,
    getImportTemplate
} = require("../controllers/indirectAssessmentController.js");

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Import routes
router.post("/:courseId/indirect-assessments/import", importIndirectAssessments);
router.get("/:courseId/indirect-assessments/template", getImportTemplate);

// Data retrieval routes
router.get("/:courseId/indirect-assessments", getIndirectAssessments);
router.get("/:courseId/indirect-assessments/metadata", getIndirectAssessmentMetadata);

// Delete route
router.delete("/:courseId/indirect-assessments", deleteIndirectAssessments);

module.exports = router;