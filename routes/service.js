const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.controller');

// Waiter endpoints
router.get('/waiter/serving-tables', serviceController.getServingTables);
router.get('/waiter/waiting-payment', serviceController.getWaitingPaymentTables);

// Cashier endpoints
router.get('/cashier/serving-invoices', serviceController.getServingInvoices);
router.get('/cashier/paid-invoices', serviceController.getPaidInvoices);

// Kitchen endpoints
router.get('/kitchen/cooking-dishes', serviceController.getCookingDishes);
router.get('/kitchen/overdue-dishes', serviceController.getOverdueDishes);

// Dashboard
router.get('/dashboard', serviceController.getServiceDashboard);

module.exports = router;
