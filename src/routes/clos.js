// backend/src/routes/clos.js
const express = require('express');
const { createCLO, getCLOsByCourse, updateCLO, mapCLOToPOPSO } = require('../controllers/cloController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.get('/course/:courseId', getCLOsByCourse);
router.post('/', authorize('HOD', 'FACULTY'), createCLO);
router.put('/:id', authorize('HOD', 'FACULTY'), updateCLO);
router.post('/mapping', authorize('HOD', 'FACULTY'), mapCLOToPOPSO);

module.exports = router;