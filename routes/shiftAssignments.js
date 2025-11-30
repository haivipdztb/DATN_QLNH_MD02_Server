const express = require('express');
const router = express.Router();
const shiftAssignmentController = require('../controllers/shiftAssignment.controller');

router.post('/', shiftAssignmentController.assignShift);
router.get('/', shiftAssignmentController.getAssignmentsByDate);

module.exports = router;
