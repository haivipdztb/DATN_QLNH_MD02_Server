const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');

router.post('/create-card', paymentController.createCardPayment);
router.get('/vnpay-return', paymentController.vnpayReturn);

module.exports = router;
