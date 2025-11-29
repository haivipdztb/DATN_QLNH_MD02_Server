const express = require('express');
const router = express.Router();
const historyController = require('../controllers/history.controller');

// Lấy danh sách history, có filter query
router.get('/', historyController.getHistory);

// Lấy chi tiết 1 history
router.get('/:id', historyController.getHistoryById);

module.exports = router;
