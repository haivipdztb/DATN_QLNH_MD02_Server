// routes/shifts.js
const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shift.controller');

// GET - Lấy danh sách ca làm việc (có filter theo date, status, employeeId)
router.get('/', shiftController.getAllShifts);

// GET - Lấy lịch sử ca làm việc của nhân viên
router.get('/employee/:employeeId', shiftController.getEmployeeShiftHistory);

// GET - Lấy chi tiết ca làm việc
router.get('/:id', shiftController.getShiftById);

// POST - Tạo ca làm việc mới
router.post('/', shiftController.createShift);

// POST - Nhân viên check-in
router.post('/:id/checkin', shiftController.checkin);

// POST - Nhân viên check-out
router.post('/:id/checkout', shiftController.checkout);

// PUT - Cập nhật ca làm việc
router.put('/:id', shiftController.updateShift);

// DELETE - Xóa ca làm việc
router.delete('/:id', shiftController.deleteShift);

module.exports = router;
