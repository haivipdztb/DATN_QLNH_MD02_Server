const express = require('express');
const router = express.Router();
const cashierController = require('../controllers/cashier.controller');

// Lấy tất cả hóa đơn
router.get('/invoices', cashierController.getAllInvoices);

// Lấy hóa đơn theo trạng thái (pending, paid, cancelled)
router.get('/invoices/status/:status', cashierController.getInvoicesByStatus);

// Lấy chi tiết một hóa đơn
router.get('/invoices/:id', cashierController.getInvoiceById);

// Lấy hóa đơn theo số bàn
router.get('/invoices/table/:tableNumber', cashierController.getInvoiceByTable);

// Tính tổng tiền (có thể áp dụng giảm giá)
router.post('/invoices/:orderId/calculate', cashierController.calculateTotal);

// Thanh toán hóa đơn
router.post('/invoices/:orderId/payment', cashierController.processPayment);

// Lấy thông tin để in hóa đơn
router.get('/invoices/:orderId/print', cashierController.printInvoice);

// Hủy hóa đơn
router.post('/invoices/:orderId/cancel', cashierController.cancelInvoice);

// Thống kê doanh thu theo ngày
router.get('/sales/daily', cashierController.getDailySales);

// Tách hóa đơn (Split Bill)
router.post('/invoices/:orderId/split', cashierController.splitInvoice);

module.exports = router;
