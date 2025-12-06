const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'order', required: false },
  tableNumber: { type: Number, required: false },
  action: { type: String, required: true }, // 'create', 'update', 'delete', 'pay'
  performedBy: { type: String, required: false }, // tên server/cashier
  details: { type: mongoose.Schema.Types.Mixed }, // chi tiết hành động (items, amount, status,...)
  createdAt: { type: Date, default: Date.now }
});

const History = mongoose.model('History', historySchema);

module.exports = { History };
