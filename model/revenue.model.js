const mongoose = require('mongoose');

const revenueSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  tableNumber: { type: Number },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['Tiền mặt', 'QR', 'Thẻ','Card'], default: 'Tiền mặt' },
  paidAt: { type: Date, default: Date.now },
}, { timestamps: true });

const Revenue = mongoose.model('Revenue', revenueSchema);

module.exports = { Revenue };
