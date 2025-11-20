// model/order.model.js
const db = require('./db');

// định nghĩa khuôn mẫu cho model (bao gồm các trường snapshot để lưu name/image/price tại thời điểm order)
const orderSchema = new db.mongoose.Schema(
  {
    tableNumber: { type: Number, required: true },
    server: { type: db.mongoose.Schema.Types.ObjectId, ref: 'userModel', required: true },
    cashier: { type: db.mongoose.Schema.Types.ObjectId, ref: 'userModel', required: true },
    items: [
      {
        // tham chiếu tới menuModel (nếu có)
        menuItem: { type: db.mongoose.Schema.Types.ObjectId, ref: 'menuModel', default: null },

        // Snapshot fields: lưu name, image và price tại thời điểm tạo order
        menuItemName: { type: String, default: '' },
        imageUrl: { type: String, default: '' },

        quantity: { type: Number, default: 1 },
        price: { type: Number, default: 0 },

        status: {
          type: String,
          enum: ['pending', 'preparing', 'ready', 'soldout'],
          default: 'pending'
        }, // Trạng thái món: chờ, đang làm, sẵn sàng, hết món

        note: { type: String, default: '' } // Ghi chú đặc biệt cho món
      }
    ],
    totalAmount: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    finalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    change: { type: Number, default: 0 },
    paymentMethod: { type: String, required: true },
    orderStatus: { type: String, required: true, default: 'pending' },
    cancelReason: { type: String }, // Lý do hủy đơn
    cancelledAt: { type: Date }, // Thời gian hủy
    mergedFrom: [{ type: db.mongoose.Schema.Types.ObjectId, ref: 'orderModel' }],
    splitTo: [{ type: db.mongoose.Schema.Types.ObjectId, ref: 'orderModel' }],
    createdAt: { type: Date, default: Date.now },
    paidAt: { type: Date }
  },
  {
    collection: 'orders' // tên bảng dữ liệu
  }
);

// tạo model
let orderModel = db.mongoose.model('orderModel', orderSchema);
module.exports = { orderModel };