// routes/orders.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');

const kitchenController = require('../controllers/kitchen.controller');

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

router.patch('/:orderId/items/:itemId/status', kitchenController.updateItemStatus);


module.exports = router;