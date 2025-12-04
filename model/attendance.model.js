const db = require('./db');

const attendanceSchema = new db.mongoose.Schema({
  userId: { type: db.mongoose.Schema.Types.ObjectId, ref: 'userModel', required: true },
  shiftId: { type: db.mongoose.Schema.Types.ObjectId, ref: 'shiftModel', required: true },
  workDate: { type: String, required: true }, // YYYY-MM-DD
  checkIn: { type: Date },
  checkOut: { type: Date },
  checkInType: { type: String, enum: ['wifi', 'gps', 'offline', 'manual'], default: 'wifi' },
  checkOutType: { type: String, enum: ['wifi', 'gps', 'offline', 'manual'], default: 'wifi' },
  wifiBSSID: { type: String },
  deviceId: { type: String },
  status: { type: String, enum: ['normal', 'auto-checkout', 'pending'], default: 'normal' },
  createdAt: { type: Date, default: () => new Date() }
}, {
  collection: 'attendances'
});

const attendanceModel = db.mongoose.model('attendanceModel', attendanceSchema);
module.exports = { attendanceModel };
