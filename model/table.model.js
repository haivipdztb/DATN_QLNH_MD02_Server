const db = require('./db');
const { softDeletePlugin } = require('../utils/softDelete');

// Định nghĩa schema cho table (bàn ăn)
const tableSchema = new db.mongoose.Schema(
    {
        tableNumber: { type: Number, required: true, unique: true }, // Số bàn
        capacity: { type: Number, required: true }, // Số người có thể ngồi
        status: {
            type: String,
            required: true,
            enum: ['available', 'occupied', 'reserved'], // Trạng thái: trống, đang sử dụng, đã đặt
            default: 'available'
        },
        currentOrder: {
            type: db.mongoose.Schema.Types.ObjectId,
            ref: 'orderModel',
            default: null
        }, // ID của order hiện tại (nếu có)
<<<<<<< Updated upstream
        location: {type: String, required: false}, // Vị trí bàn (tầng 1, tầng 2, ngoài trời...)
        createdAt: {type: Date, default: () => new Date()},
        updatedAt: {type: Date, default: () => new Date()}
=======
        location: { type: String, required: false }, // Vị trí bàn (tầng 1, tầng 2, ngoài trời...)
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
>>>>>>> Stashed changes
    },
    {
        collection: 'tables' // Tên collection trong database
    }
);

// Middleware để tự động cập nhật updatedAt
tableSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Thêm soft delete plugin
tableSchema.plugin(softDeletePlugin);

// Tạo model
let tableModel = db.mongoose.model('tableModel', tableSchema);

module.exports = { tableModel };
