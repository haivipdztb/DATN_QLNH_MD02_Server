// routes/orders.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');

const kitchenController = require('../controllers/kitchen.controller');

router.get('/revenue', orderController.getRevenueFromOrders);

// Thống kê doanh thu theo ngày (theo query ?fromDate&toDate)
router.get('/byDate', orderController.getRevenueByDate);

// Lịch sử đơn đã thanh toán
router.get('/historyod', orderController.getPaidOrders);

router.post('/pay', orderController.payOrder);

// GET - Lấy danh sách tất cả orders (hỗ trợ ?tableNumber=)
router.get('/', orderController.getAllOrders);

// GET - Lấy chi tiết một order theo ID
router.get('/:id', orderController.getOrderById);

// POST - Tạo order mới
router.post('/', orderController.createOrder);

// PUT - Cập nhật order theo ID
router.put('/:id', orderController.updateOrder);

// DELETE - Xóa order theo ID
router.delete('/:id', orderController.deleteOrder);

// POST - Yêu cầu tạm tính: chuyển order sang trạng thái "hóa đơn tạm tính" và gửi thông báo cho thu ngân
router.post('/:id/request-temp-calculation', orderController.requestTempCalculation);

// PATCH cập nhật trạng thái món (đã có)
router.patch('/:orderId/items/:itemId/status', kitchenController.updateItemStatus);

// NEW: route để phục vụ yêu cầu hủy món (phục vụ gửi yêu cầu lên bếp kèm lý do)
router.post('/:orderId/items/:itemId/request-cancel', kitchenController.requestCancelDish);

module.exports = router;