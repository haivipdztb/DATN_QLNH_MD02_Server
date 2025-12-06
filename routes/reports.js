var express = require('express');
var router = express.Router();
const reportController = require('../controllers/report.controller');

// GET - Lấy danh sách tất cả báo cáo
router.get('/', reportController.getAllReports);

router.get('/byDate', reportController.getReportsByDate); // <-- Thêm ở đây

// GET - Thống kê doanh thu theo giờ
router.get('/hourly', reportController.getRevenueByHour);

// GET - Lấy giờ cao điểm
router.get('/peak-hours', reportController.getPeakHours);

// GET - Thống kê theo khoảng thời gian
router.get('/date-range', reportController.getRevenueByDateRange);

// GET - Lấy chi tiết một báo cáo theo ID
router.get('/:id', reportController.getReportById);

// POST - Tạo báo cáo theo ngày
router.post('/daily', reportController.createDailyReport);

// POST - Tạo báo cáo theo tuần
router.post('/weekly', reportController.createWeeklyReport);

// POST - Tạo báo cáo theo tháng
router.post('/monthly', reportController.createMonthlyReport);

// PUT - Cập nhật báo cáo theo ID
router.put('/:id', reportController.updateReport);

// DELETE - Xóa báo cáo theo ID
router.delete('/:id', reportController.deleteReport);

module.exports = router;

