var express = require('express');
var router = express.Router();
const salaryController = require('../controllers/salary.controller');

// GET - Lấy cấu hình lương
router.get('/config/:userId', salaryController.getSalaryConfig);

// PUT - Cập nhật cấu hình lương
router.put('/config/:userId', salaryController.updateSalaryConfig);

// POST - Tính lương
router.post('/calculate', salaryController.calculateSalary);

// GET - Báo cáo lương tháng
router.get('/monthly-report', salaryController.getMonthlyReport);

module.exports = router;
