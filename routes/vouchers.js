// routes/vouchers.js
const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucher.controller');

// GET - Lấy danh sách tất cả voucher
router.get('/', voucherController.getAllVouchers);

// GET - Lấy chi tiết voucher theo ID
router.get('/:id', voucherController.getVoucherById);

// POST - Tạo voucher mới
router.post('/', voucherController.createVoucher);

// POST - Validate voucher
router.post('/validate', voucherController.validateVoucher);

// POST - Áp dụng voucher (tăng usedCount)
router.post('/apply', voucherController.applyVoucher);

// PUT - Cập nhật voucher
router.put('/:id', voucherController.updateVoucher);

// DELETE - Xóa voucher
router.delete('/:id', voucherController.deleteVoucher);

module.exports = router;
