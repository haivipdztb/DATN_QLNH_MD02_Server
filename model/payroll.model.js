const db = require('./db');
const { softDeletePlugin } = require('../utils/softDelete');

const payrollSchema = new db.mongoose.Schema({
  userId: { type: db.mongoose.Schema.Types.ObjectId, ref: 'userModel', required: true },
  month: { type: String, required: true }, // YYYY-MM
  totalHours: { type: Number, default: 0 },
  totalSalary: { type: Number, default: 0 },
  details: { type: Object }, // salaryDetails object
  createdAt: { type: Date, default: () => new Date() }
}, {
  collection: 'payrolls'
});

// Thêm soft delete plugin
payrollSchema.plugin(softDeletePlugin);

const payrollModel = db.mongoose.model('payrollModel', payrollSchema);
module.exports = { payrollModel };
