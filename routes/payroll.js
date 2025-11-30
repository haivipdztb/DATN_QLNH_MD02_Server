const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payroll.controller');

router.get('/', payrollController.getPayroll);

module.exports = router;
