const express = require('express');
const {
  createAssessment,
  getCourseAssessments,
  getAssessment,
  updateAssessment,
  deleteAssessment,
  getAvailableMarks,
  finalizeAssessmentMarks,
  getFinalizationStatus
} = require('../controllers/assesmentcontroller');

const {
  mapClosToAssessment,
  getAssessmentClos,
  getCourseClos
} = require('../controllers/assesmentCloController');

const {
  enterBulkMarks,
  getAssessmentMarks,
  getStudentMarks,
  getCourseStudents
} = require('../controllers/marksController');

const {
  checkPracticalAssessment,
  validateAssessment,
  validateMarksEntry
} = require('../controllers/validationController');

const { authenticate } = require('../middleware/auth');

const router = express.Router();

console.log('Assessment routes loaded');

// Apply auth middleware to all routes
router.use(authenticate);

// Assessment routes
router.post('/', createAssessment);
router.patch('/:id/finalize-marks', finalizeAssessmentMarks);
router.get('/:id/finalization-status', getFinalizationStatus);
router.get('/course/:courseId',  getCourseAssessments);
router.get('/:id', getAssessment);
router.put('/:id', updateAssessment);

router.delete('/:id', deleteAssessment);
router.get('/:courseId/available-marks', getAvailableMarks);



// Assessment-CLO routes
router.post('/:assessmentId/clos', mapClosToAssessment);
router.get('/assess/:assessmentId/clos', getAssessmentClos);
router.get('/:courseId/clos', getCourseClos);

// Marks routes
router.post('/:assessmentId/marks/bulk', enterBulkMarks);
router.get('/:assessmentId/marks', getAssessmentMarks);
router.get('/:assessmentId/students/:studentId/marks', getStudentMarks);
router.get('/:courseId/students', getCourseStudents);

// Validation routes
router.get('/validation/course/:courseId/has-practical', checkPracticalAssessment);
router.post('/validation/assessment', validateAssessment);
router.post('/validation/marks', validateMarksEntry);



module.exports = router;