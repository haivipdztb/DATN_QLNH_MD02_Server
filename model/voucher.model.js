const db = require('./db');
const { softDeletePlugin } = require('../utils/softDelete');

// Định nghĩa schema cho voucher
const voucherSchema = new db.mongoose.Schema(
    {
        code: { type: String, required: true, unique: true }, // Mã voucher
        discountType: {
            type: String,
            required: true,
            enum: ['percentage', 'fixed'],
            default: 'percentage'
        }, // Loại giảm giá: phần trăm hoặc số tiền cố định
        discountValue: { type: Number, required: true }, // Giá trị giảm
        minOrderValue: { type: Number, default: 0 }, // Giá trị đơn hàng tối thiểu
        maxDiscount: { type: Number, default: 0 }, // Giảm tối đa (cho percentage)
        startDate: { type: Date, required: true }, // Ngày bắt đầu
        endDate: { type: Date, required: true }, // Ngày kết thúc
        usageLimit: { type: Number, default: 0 }, // Số lần sử dụng tối đa (0 = không giới hạn)
        usedCount: { type: Number, default: 0 }, // Đã sử dụng bao nhiêu lần
        isActive: { type: Boolean, default: true }, // Trạng thái kích hoạt
        description: { type: String, default: '' }, // Mô tả voucher
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    },
    {
        collection: 'vouchers'
    }
);

// Middleware để tự động cập nhật updatedAt
voucherSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Thêm soft delete plugin
voucherSchema.plugin(softDeletePlugin);

// Tạo model
let voucherModel = db.mongoose.model('voucherModel', voucherSchema);

module.exports = { voucherModel };
