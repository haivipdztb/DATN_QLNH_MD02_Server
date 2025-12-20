const express = require('express');
const router = express.Router();
const tableController = require('../controllers/table.controller');
// Tách bàn từ tables: POST /tables/:id/split-table-only
const { splitTable } = require('../controllers/order.controller');
router.post('/:id/split-table-only', async (req, res) => {
  // :id là orderId, body cần có toTableNumber
  const orderId = req.params.id;
  const { toTableNumber } = req.body;
  // Gọi lại logic splitTable của order.controller.js
  req.body.orderId = orderId;
  req.body.toTableNumber = toTableNumber;
  return splitTable(req, res);
});

// Lấy danh sách tất cả các bàn
router.get('/', tableController.getAllTables);

// Lấy danh sách bàn theo trạng thái (available, occupied, reserved)
router.get('/status/:status', tableController.getTablesByStatus);

// Lấy chi tiết một bàn theo ID
router.get('/:id', tableController.getTableById);

// Thêm bàn mới
router.post('/', tableController.createTable);

// Cập nhật thông tin bàn
router.put('/:id', tableController.updateTable);

// Cập nhật trạng thái bàn
router.patch('/:id/status', tableController.updateTableStatus);

// Xóa bàn
router.delete('/:id', tableController.deleteTable);

// Đặt trước bàn và tự động hủy sau 20s nếu chưa có ai nhận
router.post('/:id/reserve', tableController.reserveTable);

module.exports = router;
