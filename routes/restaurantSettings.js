const express = require('express');
const router = express.Router();
const {
    getRestaurantSettings,
    updateRestaurantSettings,
    changePassword,
    adminResetPassword
} = require('../controllers/restaurantSettings.controller');

// Lấy thông tin cài đặt nhà hàng
router.get('/', getRestaurantSettings);

// Cập nhật thông tin cài đặt nhà hàng
router.put('/', updateRestaurantSettings);

// Đổi mật khẩu (yêu cầu mật khẩu cũ)
router.post('/change-password', changePassword);

// Admin reset mật khẩu (không cần mật khẩu cũ)
router.post('/admin-reset-password', adminResetPassword);

module.exports = router;
