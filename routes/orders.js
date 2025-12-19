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

// GET - Đếm số lượng yêu cầu kiểm tra bàn (phải đặt trước /:id)
router.get('/check-items-requests/count', orderController.getCheckItemsRequestsCount);

// GET - Lấy danh sách yêu cầu kiểm tra bàn (phải đặt trước /:id)
router.get('/check-items-requests', orderController.getCheckItemsRequests);

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

// POST - Tạo yêu cầu kiểm tra bàn cho một order
router.post('/:id/request-check-items', orderController.requestCheckItems);

// PUT - Cập nhật trạng thái kiểm tra bàn
router.put('/:id/check-items-status', orderController.updateCheckItemsStatus);

// DELETE - Xóa yêu cầu kiểm tra bàn
router.delete('/:id/check-items-request', orderController.clearCheckItemsRequest);

module.exports = router;