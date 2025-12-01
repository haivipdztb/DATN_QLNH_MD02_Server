const db = require('./db');


// Định nghĩa schema cho shift (ca làm việc)
const shiftSchema = new db.mongoose.Schema(
    {
        name: { type: String, required: true }, // Tên ca (Ca sáng, Ca chiều, Ca tối)
        startTime: { type: String, required: true }, // Giờ bắt đầu "08:00"
        endTime: { type: String, required: true }, // Giờ kết thúc "16:00"
        date: { type: Date, required: true }, // Ngày làm việc
        employees: [
            {
                employeeId: {
                    type: db.mongoose.Schema.Types.ObjectId,
                    ref: 'userModel',
                    required: true
                },
                checkinTime: { type: Date }, // Thời gian check-in
                checkoutTime: { type: Date }, // Thời gian check-out
                actualHours: { type: Number, default: 0 }, // Số giờ làm thực tế
                status: {
                    type: String,
                    enum: ['scheduled', 'present', 'absent', 'late'],
                    default: 'scheduled'
                }, // Trạng thái: đã lên lịch, có mặt, vắng mặt, đi muộn
                note: { type: String, default: '' } // Ghi chú
            }
        ],
        status: {
            type: String,
            enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
            default: 'scheduled'
        }, // Trạng thái ca: đã lên lịch, đang diễn ra, hoàn thành, hủy
        notes: { type: String, default: '' }, // Ghi chú chung
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    },
    {
        collection: 'shifts'
    }
);

// Middleware để tự động cập nhật updatedAt
shiftSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});


const shiftModel = db.mongoose.model('shiftModel', shiftSchema);
module.exports = { shiftModel };
