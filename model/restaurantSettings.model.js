const db = require('./db');
const { softDeletePlugin } = require('../utils/softDelete');

// Định nghĩa schema cho cài đặt nhà hàng
const restaurantSettingsSchema = new db.mongoose.Schema(
    {
        restaurantName: { type: String, required: true, default: 'Nhà Hàng' },
        address: { type: String, default: '' },
        phoneNumber: { type: String, default: '' },
        email: { type: String, default: '' },
        openingTime: { type: String, required: true, default: '10:00' }, // Format: HH:mm
        closingTime: { type: String, required: true, default: '22:00' }, // Format: HH:mm
        description: { type: String, default: '' },
        logo: { type: String, default: '' }, // URL hoặc đường dẫn logo
        taxRate: { type: Number, default: 0 }, // Thuế VAT (%)
        serviceCharge: { type: Number, default: 0 }, // Phí phục vụ (%)
        currency: { type: String, default: 'VND' },
        timezone: { type: String, default: 'Asia/Ho_Chi_Minh' },
        // Chỉ có 1 document duy nhất
        isSingleton: { type: Boolean, default: true, unique: true },
        createdAt: { type: Date, default: () => new Date() },
        updatedAt: { type: Date, default: () => new Date() }
    },
    {
        collection: 'restaurant_settings'
    }
);

// Middleware để tự động cập nhật updatedAt
restaurantSettingsSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Thêm soft delete plugin
restaurantSettingsSchema.plugin(softDeletePlugin);

// Tạo model
let restaurantSettingsModel = db.mongoose.model('restaurantSettingsModel', restaurantSettingsSchema);

module.exports = { restaurantSettingsModel };
