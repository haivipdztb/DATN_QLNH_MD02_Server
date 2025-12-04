const db = require('./db');

const shiftAssignmentSchema = new db.mongoose.Schema({
  userId: { type: db.mongoose.Schema.Types.ObjectId, ref: 'userModel', required: true },
  shiftId: { type: db.mongoose.Schema.Types.ObjectId, ref: 'shiftModel', required: true },
  workDate: { type: String, required: true }, // YYYY-MM-DD
  assignedBy: { type: db.mongoose.Schema.Types.ObjectId, ref: 'userModel' },
  status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
  createdAt: { type: Date, default: () => new Date() }
}, {
  collection: 'shift_assignments'
});

const shiftAssignmentModel = db.mongoose.model('shiftAssignmentModel', shiftAssignmentSchema);
module.exports = { shiftAssignmentModel };
