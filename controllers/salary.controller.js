const { salaryConfigModel, salaryLogModel } = require('../model/salary.model');
const { shiftModel } = require('../model/shift.model');
const { userModel } = require('../model/user.model');
const mongoose = require('mongoose');

// Lấy cấu hình lương của nhân viên
exports.getSalaryConfig = async (req, res) => {
    try {
        const { userId } = req.params;

        // Sử dụng findOneAndUpdate với upsert để tránh duplicate key error
        const config = await salaryConfigModel.findOneAndUpdate(
            { userId },
            {
                $setOnInsert: {
                    userId,
                    baseSalary: 0,
                    hourlyRate: 0,
                    dailyRate: 0,
                    allowance: 0,
                    deductions: 0
                }
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true
            }
        );

        return res.status(200).json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error('getSalaryConfig error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy cấu hình lương',
            error: error.message
        });
    }
};

// Cập nhật cấu hình lương
exports.updateSalaryConfig = async (req, res) => {
    try {
        const { userId } = req.params;
        const updateData = req.body;

        const config = await salaryConfigModel.findOneAndUpdate(
            { userId },
            updateData,
            { new: true, upsert: true }
        );

        return res.status(200).json({
            success: true,
            message: 'Cập nhật cấu hình lương thành công',
            data: config
        });
    } catch (error) {
        console.error('updateSalaryConfig error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật cấu hình lương',
            error: error.message
        });
    }
};

// Helper function để tính lương cho 1 nhân viên
const calculateEmployeeSalary = async (userId, month, year) => {
    console.log('calculateEmployeeSalary called with:', { userId, month, year, userIdType: typeof userId });

    // Convert string to ObjectId if needed
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    console.log('User ObjectId:', userObjectId);
    // 1. Lấy cấu hình lương
    // get all
    const allConfigs = await salaryConfigModel.find({}).limit(5);
    console.log('All configs:', allConfigs.map(c => ({ userId: c.userId, id: c._id })));
    const config = await salaryConfigModel.findOne({ userId: userObjectId });
    console.log('Config found:', config ? 'Yes' : 'No', config?._id);
    console.log('Config details:', config);

    if (!config) {
        console.log('No salary config found for userId:', userId);
        const allConfigs = await salaryConfigModel.find({}).limit(5);
        console.log('Sample configs in DB:', allConfigs.map(c => ({ userId: c.userId, id: c._id })));

        // Also try direct query to the collection
        const directConfigs = await mongoose.connection.db.collection('salaryconfigmodels').find({}).limit(2).toArray();
        console.log('Direct query to salaryconfigmodels:', directConfigs.length, 'configs found');

        return null;
    }

    // 2. Lấy thông tin user
    const user = await userModel.findById(userObjectId);
    console.log('User found:', user ? user.name || user.username : 'No');

    if (!user) {
        console.log('No user found for userId:', userId);
        return null;
    }

    // 3. Lấy dữ liệu chấm công (Shifts)
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const shifts = await shiftModel.find({
        date: { $gte: startDate, $lte: endDate },
        'employees.employeeId': userObjectId,
        status: { $in: ['completed', 'in_progress'] }
    });

    // 4. Tính tổng giờ làm và số ngày làm
    let totalHours = 0;
    let totalDays = 0;
    const workDays = new Set();

    shifts.forEach(shift => {
        const emp = shift.employees.find(e =>
            (e.employeeId._id || e.employeeId).toString() === userObjectId.toString()
        );

        if (emp && emp.checkinTime && emp.checkoutTime) {
            // Tính giờ làm
            const duration = (new Date(emp.checkoutTime) - new Date(emp.checkinTime)) / (1000 * 60 * 60);
            totalHours += duration;

            // Đếm số ngày làm (unique days)
            const workDate = new Date(shift.date).toDateString();
            workDays.add(workDate);
        }
    });

    totalDays = workDays.size;

    // 5. Tính lương
    const hourlyPay = totalHours * (config.hourlyRate || 0);
    const dailyPay = totalDays * (config.dailyRate || 0);
    const monthlyPay = config.baseSalary || 0;
    const totalSalary = monthlyPay + hourlyPay + dailyPay + (config.allowance || 0) - (config.deductions || 0);

    return {
        userId: user._id,
        employeeName: user.name || user.username,
        username: user.username,
        role: user.role,
        month,
        year,
        totalHours: parseFloat(totalHours.toFixed(2)),
        totalDays,
        hourlyRate: config.hourlyRate || 0,
        dailyRate: config.dailyRate || 0,
        baseSalary: config.baseSalary || 0,
        hourlyPay: parseFloat(hourlyPay.toFixed(0)),
        dailyPay: parseFloat(dailyPay.toFixed(0)),
        monthlyPay: parseFloat(monthlyPay.toFixed(0)),
        allowance: config.allowance || 0,
        deductions: config.deductions || 0,
        totalSalary: parseFloat(totalSalary.toFixed(0)),
        shiftsCount: shifts.length
    };
};

// Tính lương cho 1 nhân viên (API)
exports.calculateSalary = async (req, res) => {
    try {
        const { employeeId, startDate, endDate } = req.body;

        if (!employeeId || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin: employeeId, startDate, endDate'
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const month = start.getMonth() + 1;
        const year = start.getFullYear();

        const calculation = await calculateEmployeeSalary(employeeId, month, year);

        if (!calculation) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy cấu hình lương cho nhân viên này'
            });
        }

        return res.status(200).json({
            success: true,
            data: calculation
        });

    } catch (error) {
        console.error('calculateSalary error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi tính lương',
            error: error.message
        });
    }
};

// Lấy báo cáo lương tháng (Danh sách lương của tất cả nhân viên)
exports.getMonthlyReport = async (req, res) => {
    try {
        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu tham số month hoặc year'
            });
        }

        const users = await userModel.find({
            isDeleted: { $ne: true },
            role: { $ne: 'admin' }
        });

        const report = [];

        for (const user of users) {
            const calculation = await calculateEmployeeSalary(user._id, parseInt(month), parseInt(year));
            if (calculation) {
                // Kiểm tra xem đã chốt lương chưa
                const salaryLog = await salaryLogModel.findOne({
                    userId: user._id,
                    month: parseInt(month),
                    year: parseInt(year)
                });

                calculation.status = salaryLog ? salaryLog.status : 'pending';
                calculation.isPaid = salaryLog?.status === 'paid';
                calculation.salaryLogId = salaryLog?._id;

                report.push(calculation);
            }
        }

        return res.status(200).json({
            success: true,
            data: report
        });

    } catch (error) {
        console.error('getMonthlyReport error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy báo cáo lương',
            error: error.message
        });
    }
};

// Chốt lương (Lưu vào salary log)
exports.finalizeSalary = async (req, res) => {
    try {
        const { employeeId, month, year, bonus, deductions, note } = req.body;

        if (!employeeId || !month || !year) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin: employeeId, month, year'
            });
        }

        // Tính lương
        const calculation = await calculateEmployeeSalary(employeeId, month, year);
        if (!calculation) {
            return res.status(404).json({
                success: false,
                message: 'Không thể tính lương cho nhân viên này'
            });
        }

        // Kiểm tra đã chốt chưa
        const existing = await salaryLogModel.findOne({
            userId: employeeId,
            month,
            year
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Lương tháng này đã được chốt'
            });
        }

        // Tính tổng lương cuối cùng (có thể có bonus/deduction thêm)
        const finalSalary = calculation.totalSalary + (bonus || 0) - (deductions || 0);

        // Lưu vào salary log
        const salaryLog = new salaryLogModel({
            userId: employeeId,
            month,
            year,
            totalHours: calculation.totalHours,
            totalDays: calculation.totalDays,
            baseSalary: calculation.baseSalary,
            totalSalary: finalSalary,
            bonus: bonus || 0,
            deductions: deductions || 0,
            note: note || '',
            status: 'pending'
        });

        await salaryLog.save();

        return res.status(201).json({
            success: true,
            message: 'Chốt lương thành công',
            data: salaryLog
        });

    } catch (error) {
        console.error('finalizeSalary error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi chốt lương',
            error: error.message
        });
    }
};

// Đánh dấu đã thanh toán
exports.markAsPaid = async (req, res) => {
    try {
        const { salaryLogId } = req.params;

        const salaryLog = await salaryLogModel.findByIdAndUpdate(
            salaryLogId,
            { status: 'paid' },
            { new: true }
        );

        if (!salaryLog) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bản ghi lương'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Đã đánh dấu thanh toán',
            data: salaryLog
        });

    } catch (error) {
        console.error('markAsPaid error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật trạng thái',
            error: error.message
        });
    }
};

// Lấy lịch sử lương của nhân viên
exports.getSalaryHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 12 } = req.query;

        const history = await salaryLogModel.find({ userId })
            .sort({ year: -1, month: -1 })
            .limit(parseInt(limit));

        return res.status(200).json({
            success: true,
            data: history
        });

    } catch (error) {
        console.error('getSalaryHistory error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy lịch sử lương',
            error: error.message
        });
    }
};
