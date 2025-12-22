const db = require('./db');
// const { softDeletePlugin } = require('../utils/softDelete'); // Không cần soft delete cho shifts

// Định nghĩa schema cho shift (ca làm việc)
const shiftSchema = new db.mongoose.Schema(
  {
    name: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    date: { type: Date, required: true },
    employees: [
      {
        employeeId: {
          type: db.mongoose.Schema.Types.ObjectId,
          ref: 'userModel',
          required: true,
        },
        checkinTime: { type: Date },
        checkoutTime: { type: Date },
        actualHours: { type: Number, default: 0 },
        status: {
          type: String,
          enum: ['scheduled', 'present', 'absent', 'late'],
          default: 'scheduled',
        },
        note: { type: String, default: '' },
      },
    ],
    status: {
      type: String,
      enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    notes: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: 'shifts',
  }
);

shiftSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Không sử dụng soft delete plugin cho shifts (dữ liệu chấm công lịch sử)
// shiftSchema.plugin(softDeletePlugin);

const shiftModel = db.mongoose.model('shiftModel', shiftSchema);
module.exports = { shiftModel };
