const db = require('./db');
// const { softDeletePlugin } = require('../utils/softDelete'); // Không cần soft delete cho salary

const salaryConfigSchema = new db.mongoose.Schema({
    userId: { type: db.mongoose.Schema.Types.ObjectId, ref: 'userModel', required: true, unique: true },
    baseSalary: { type: Number, default: 0 }, // Lương cứng
    hourlyRate: { type: Number, default: 0 }, // Lương theo giờ
    dailyRate: { type: Number, default: 0 }, // Lương theo ngày
    allowance: { type: Number, default: 0 }, // Phụ cấp
    deductions: { type: Number, default: 0 }, // Khấu trừ mặc định
}, {
    collection: 'salaryconfigmodels',
    timestamps: true
});

const salaryLogSchema = new db.mongoose.Schema({
    userId: { type: db.mongoose.Schema.Types.ObjectId, ref: 'userModel', required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    totalHours: { type: Number, default: 0 },
    totalDays: { type: Number, default: 0 },
    baseSalary: { type: Number, default: 0 },
    totalSalary: { type: Number, required: true },
    bonus: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    note: { type: String },
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' }
}, {
    collection: 'salarylogmodels',
    timestamps: true
});

// Không sử dụng soft delete plugin cho salary models
// salaryConfigSchema.plugin(softDeletePlugin);
// salaryLogSchema.plugin(softDeletePlugin);

const salaryConfigModel = db.mongoose.model('salaryConfigModel', salaryConfigSchema);
const salaryLogModel = db.mongoose.model('salaryLogModel', salaryLogSchema);

module.exports = { salaryConfigModel, salaryLogModel };
