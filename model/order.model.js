// model/order.model.js
const db = require('./db');
const { softDeletePlugin } = require('../utils/softDelete');

// định nghĩa khuôn mẫu cho model (bao gồm các trường snapshot để lưu name/image/price tại thời điểm order)
const orderSchema = new db.mongoose.Schema(
  {
    tableNumber: { type: Number, required: true },
    // Danh sách các bàn chia sẻ order này
    tableNumbers: {
      type: [Number],
      default: function() {
        return [this.tableNumber]; // Mặc định chỉ có bàn gốc
      }
    },
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
          enum: ['pending', 'preparing', 'ready', 'soldout', 'cancel_requested', 'served'],
          default: 'pending'
        }, // Trạng thái món: chờ, đang làm, sẵn sàng, hết món, yêu cầu hủy

        cancelRequestedBy: { type: db.mongoose.Schema.Types.ObjectId, ref: 'userModel', default: null }, // Người yêu cầu hủy
        cancelRequestedAt: { type: Date }, // Thời gian yêu cầu hủy
        cancelReason: { type: String, default: '' }, // Lý do yêu cầu hủy
        note: { type: String, default: '' } // Ghi chú đặc biệt cho món
      }
    ],
    totalAmount: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    finalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    change: { type: Number, default: 0 },
    paymentMethod: { type: String, required: true },
    orderStatus: { 
      type: String, 
      required: true, 
      default: 'pending',
      enum: ['pending', 'temp_calculation', 'confirmed', 'paid', 'cancelled']
    }, // pending: chờ xử lý, temp_calculation: tạm tính, confirmed: đã xác nhận, paid: đã thanh toán, cancelled: đã hủy
    tempCalculationRequestedBy: { type: db.mongoose.Schema.Types.ObjectId, ref: 'userModel', default: null }, // Người yêu cầu tạm tính
    tempCalculationRequestedAt: { type: Date }, // Thời gian yêu cầu tạm tính
    checkItemsRequestedAt: { type: Date, default: null }, // Thời gian yêu cầu kiểm tra bàn
    checkItemsRequestedBy: { type: db.mongoose.Schema.Types.ObjectId, ref: 'userModel', default: null }, // Người yêu cầu kiểm tra bàn
    checkItemStatus: { 
      type: String, 
      enum: ['request_inspection', 'inspection_requested', 'pending', 'in_progress', 'completed', 'cancelled'], 
      default: null 
    }, // Trạng thái kiểm tra bàn: yêu cầu kiểm tra (chưa gửi), đã yêu cầu kiểm tra, chờ xử lý, đang kiểm tra, đã hoàn thành, đã hủy
    cancelReason: { type: String }, // Lý do hủy đơn
    cancelledAt: { type: Date }, // Thời gian hủy
    mergedFrom: [{ type: db.mongoose.Schema.Types.ObjectId, ref: 'orderModel' }],
    splitTo: [{ type: db.mongoose.Schema.Types.ObjectId, ref: 'orderModel' }],
    createdAt: { type: Date, default: () => new Date() },
    paidAt: { type: Date }
    ,
    // --- Kiểm tra món (cấp order) ---
    checkItemsStatus: {
      type: String,
      enum: ['pending', 'completed', 'acknowledged'],
      default: 'pending'
    },
    checkItemsCompletedAt: { type: Date },
    checkItemsCompletedBy: { type: db.mongoose.Schema.Types.ObjectId, ref: 'userModel', default: null },
    checkItemsNote: { type: String, default: '' }
    ,
  },
  {
    collection: 'orders' // tên bảng dữ liệu
  }
);


// Pre-save hook: Tự động set checkItemStatus thành 'pending' nếu có checkItemsRequestedAt nhưng checkItemStatus là null
orderSchema.pre('save', function(next) {
  // Nếu có checkItemsRequestedAt nhưng checkItemStatus là null hoặc undefined, set mặc định là 'pending' (Đã gửi yêu cầu)
  if (this.checkItemsRequestedAt && (this.checkItemStatus === null || this.checkItemStatus === undefined || this.checkItemStatus === '')) {
    this.checkItemStatus = 'pending';
  }
  // Nếu không có checkItemsRequestedAt, set checkItemStatus về null
  if (!this.checkItemsRequestedAt && this.checkItemStatus) {
    this.checkItemStatus = null;
  }
  next();
});

// Thêm soft delete plugin
orderSchema.plugin(softDeletePlugin);

// tạo model
let orderModel = db.mongoose.model('orderModel', orderSchema);
module.exports = { orderModel };