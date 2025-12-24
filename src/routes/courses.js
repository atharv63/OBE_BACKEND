// backend/src/routes/courses.js
const express = require('express');
const { createCourse, getCourses, updateCourse, deleteCourse } = require('../controllers/courseController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.get('/', getCourses);
router.post('/', authorize('HOD', 'ADMIN'), createCourse);
router.put('/:id', authorize('HOD', 'ADMIN'), updateCourse);
router.delete('/:id', authorize('HOD', 'ADMIN'), deleteCourse);

module.exports = router;