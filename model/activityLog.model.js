const db = require('./db');

const activityLogSchema = new db.mongoose.Schema({
    userId: { type: db.mongoose.Schema.Types.ObjectId, ref: 'userModel', required: false },
    userName: { type: String, required: false },
    userRole: { type: String, required: false },
    action: {
        type: String,
        required: true,
        enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', 'EXPORT', 'IMPORT', 'PAY', 'CANCEL', 'APPROVE', 'REJECT']
    },
    resource: {
        type: String,
        required: true,
        enum: ['USER', 'ORDER', 'MENU', 'INGREDIENT', 'TABLE', 'VOUCHER', 'REPORT', 'SHIFT', 'SALARY', 'RECIPE', 'CUSTOMER']
    },
    resourceId: { type: String, required: false },
    details: { type: db.mongoose.Schema.Types.Mixed }, // Chi tiết hành động
    ipAddress: { type: String, required: false },
    userAgent: { type: String, required: false },
    timestamp: { type: Date, default: Date.now },
    // Thêm các field từ history model cũ để tương thích
    orderId: { type: db.mongoose.Schema.Types.ObjectId, ref: 'order', required: false },
    tableNumber: { type: Number, required: false },
    performedBy: { type: String, required: false },
}, {
    collection: 'histories', // Sử dụng collection cũ để tương thích
    timestamps: true
});

// Index để tăng tốc query
activityLogSchema.index({ userId: 1, timestamp: -1 });
activityLogSchema.index({ action: 1, timestamp: -1 });
activityLogSchema.index({ resource: 1, timestamp: -1 });
activityLogSchema.index({ timestamp: -1 });

const activityLogModel = db.mongoose.model('activityLogModel', activityLogSchema);

module.exports = { activityLogModel };
