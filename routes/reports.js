var express = require('express');
var router = express.Router();
const reportController = require('../controllers/report.controller');

// GET - Lấy danh sách tất cả báo cáo
router.get('/', reportController.getAllReports);

router.get('/byDate', reportController.getReportsByDate); // <-- Thêm ở đây

// GET - Lấy chi tiết một báo cáo theo ID
router.get('/:id', reportController.getReportById);

// POST - Tạo báo cáo theo ngày
router.post('/daily', reportController.createDailyReport);

// POST - Tạo báo cáo theo tuần
router.post('/weekly', reportController.createWeeklyReport);

// PUT - Cập nhật báo cáo theo ID
router.put('/:id', reportController.updateReport);

// DELETE - Xóa báo cáo theo ID
router.delete('/:id', reportController.deleteReport);

module.exports = router;
