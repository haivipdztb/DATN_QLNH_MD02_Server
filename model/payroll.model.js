const db = require('./db');

const payrollSchema = new db.mongoose.Schema({
  userId: { type: db.mongoose.Schema.Types.ObjectId, ref: 'userModel', required: true },
  month: { type: String, required: true }, // YYYY-MM
  totalHours: { type: Number, default: 0 },
  totalSalary: { type: Number, default: 0 },
  details: { type: Object }, // salaryDetails object
  createdAt: { type: Date, default: Date.now }
}, {
  collection: 'payrolls'
});

const payrollModel = db.mongoose.model('payrollModel', payrollSchema);
module.exports = { payrollModel };
