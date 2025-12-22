var express = require('express');
var router = express.Router();
const reportController = require('../controllers/report.controller');

// ===== QUAN TRỌNG: Các route cụ thể phải được định nghĩa TRƯỚC route động /:id =====

// GET - Lấy danh sách tất cả báo cáo
router.get('/', reportController.getAllReports);

router.get('/byDate', reportController.getReportsByDate); // <-- Thêm ở đây

// GET - Thống kê doanh thu theo giờ
router.get('/hourly', reportController.getRevenueByHour);

// GET - Lấy giờ cao điểm
router.get('/peak-hours', reportController.getPeakHours);

// GET - Thống kê theo khoảng thời gian
router.get('/date-range', reportController.getRevenueByDateRange);

// GET - Lấy báo cáo chi tiết với biểu đồ (PHẢI ĐẶT TRƯỚC /:id)
router.get('/detailed', reportController.getDetailedReport);

// POST - Tạo báo cáo theo ngày
router.post('/daily', reportController.createDailyReport);

// POST - Tạo báo cáo theo tuần
router.post('/weekly', reportController.createWeeklyReport);

// POST - Tạo báo cáo theo tháng
router.post('/monthly', reportController.createMonthlyReport);

// ===== Route động với :id phải được đặt CUỐI CÙNG =====

// GET - Lấy chi tiết một báo cáo theo ID
router.get('/:id', reportController.getReportById);

// PUT - Cập nhật báo cáo theo ID
router.put('/:id', reportController.updateReport);

// DELETE - Xóa báo cáo theo ID
router.delete('/:id', reportController.deleteReport);

module.exports = router;

