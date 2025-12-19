// PATCH - Thu ngân gửi yêu cầu kiểm tra bàn
router.patch('/:orderId/request-check-items', orderController.requestCheckItems);

// PATCH - Phục vụ xác nhận đã kiểm tra bàn
router.patch('/:orderId/complete-check-items', orderController.completeCheckItems);

// PATCH - Thu ngân xác nhận đã nhận kết quả kiểm tra
router.patch('/:orderId/acknowledge-check-items', orderController.acknowledgeCheckItems);
// routes/orders.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const kitchenController = require('../controllers/kitchen.controller');

// ========================================
// SPECIAL ROUTES (phải đặt TRƯỚC các routes có : id)
// ========================================

// Revenue routes
router.get('/revenue', orderController.getRevenueFromOrders);
router.get('/byDate', orderController.getRevenueByDate);
router.get('/historyod', orderController.getPaidOrders);

// Payment route
router.post('/pay', orderController.payOrder);

// ✨ MỚI:  Di chuyển TẤT CẢ orders sang bàn khác (không tách hóa đơn)
router.post('/move-to-table', orderController.moveOrdersToTable);

// CŨ:  Tách bàn (giữ lại cho tương thích)
router.post('/split-table', orderController.splitTable);

// ========================================
// CRUD ROUTES
// ========================================

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

// ========================================
// ITEM-SPECIFIC ROUTES (phải có :id trong path)
// ========================================

// POST - Yêu cầu tạm tính
router.post('/:id/request-temp-calculation', orderController.requestTempCalculation);

// PATCH - Cập nhật trạng thái món
router.patch('/:orderId/items/:itemId/status', kitchenController.updateItemStatus);

// PATCH - Phục vụ xác nhận kiểm tra bàn (toàn bộ order)
router.patch('/:orderId/check-items', orderController.checkOrderItems);


// POST - Yêu cầu hủy món (phục vụ gửi yêu cầu lên bếp kèm lý do)
router.post('/:orderId/items/:itemId/request-cancel', kitchenController.requestCancelDish);

module.exports = router;