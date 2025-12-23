var express = require('express');
var router = express.Router();
const menuController = require('../controllers/menu.controller');
const menuAvailabilityController = require('../controllers/menuAvailability.controller');

// GET - Lấy danh sách tất cả menu items
router.get('/', menuController.getAllMenuItems);

// GET - Cập nhật trạng thái tất cả món ăn
router.get('/update-availability', menuAvailabilityController.updateAllAvailability);

// GET - Lấy chi tiết một menu item theo ID
router.get('/:id', menuController.getMenuItemById);

// GET - Cập nhật trạng thái một món ăn cụ thể
router.get('/:id/update-availability', menuAvailabilityController.updateMenuAvailability);

// POST - Tạo menu item mới
router.post('/', menuController.createMenuItem);

// PUT - Cập nhật menu item theo ID
router.put('/:id', menuController.updateMenuItem);

// DELETE - Xóa menu item theo ID
router.delete('/:id', menuController.deleteMenuItem);

module.exports = router;
