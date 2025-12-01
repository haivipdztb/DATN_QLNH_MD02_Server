const { salaryConfigModel, salaryLogModel } = require('../model/salary.model');
const { shiftModel } = require('../model/shift.model');
const { userModel } = require('../model/user.model');

// Lấy cấu hình lương của nhân viên
exports.getSalaryConfig = async (req, res) => {
    try {
        const { userId } = req.params;
        let config = await salaryConfigModel.findOne({ userId });

        if (!config) {
            // Nếu chưa có, tạo mặc định
            config = new salaryConfigModel({ userId });
            await config.save();
        }

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

// Tính lương (Preview)
exports.calculateSalary = async (req, res) => {
    try {
        const { userId, month, year } = req.body;

        // 1. Lấy cấu hình lương
        const config = await salaryConfigModel.findOne({ userId });
        if (!config) {
            return res.status(404).json({ success: false, message: 'Chưa cấu hình lương cho nhân viên này' });
        }

        // 2. Lấy dữ liệu chấm công (Shifts)
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const shifts = await shiftModel.find({
            'employees.userId': userId,
            startTime: { $gte: startDate, $lte: endDate },
            status: 'completed' // Chỉ tính ca đã hoàn thành
        });

        // 3. Tính tổng giờ làm
        let totalHours = 0;
        shifts.forEach(shift => {
            const emp = shift.employees.find(e => e.userId.toString() === userId);
            if (emp && emp.checkIn && emp.checkOut) {
                const duration = (new Date(emp.checkOut) - new Date(emp.checkIn)) / (1000 * 60 * 60); // Giờ
                totalHours += duration;
            }
        });

        // 4. Tính lương
        const hourlyWage = totalHours * config.hourlyRate;
        const totalSalary = config.baseSalary + hourlyWage + config.allowance - config.deductions;

        const calculation = {
            userId,
            month,
            year,
            baseSalary: config.baseSalary,
            hourlyRate: config.hourlyRate,
            totalHours: parseFloat(totalHours.toFixed(2)),
            hourlyWage: parseFloat(hourlyWage.toFixed(0)),
            allowance: config.allowance,
            deductions: config.deductions,
            totalSalary: parseFloat(totalSalary.toFixed(0))
        };

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

// Lấy báo cáo lương tháng (Danh sách lương dự kiến của tất cả nhân viên)
exports.getMonthlyReport = async (req, res) => {
    try {
        const { month, year } = req.query;
        const users = await userModel.find({});
        const report = [];

        for (const user of users) {
            // Reuse logic tính lương (có thể tách hàm riêng để tối ưu)
            const config = await salaryConfigModel.findOne({ userId: user._id });
            if (config) {
                const startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 0, 23, 59, 59);

                const shifts = await shiftModel.find({
                    'employees.userId': user._id,
                    startTime: { $gte: startDate, $lte: endDate },
                    status: 'completed'
                });

                let totalHours = 0;
                shifts.forEach(shift => {
                    const emp = shift.employees.find(e => e.userId.toString() === user._id.toString());
                    if (emp && emp.checkIn && emp.checkOut) {
                        const duration = (new Date(emp.checkOut) - new Date(emp.checkIn)) / (1000 * 60 * 60);
                        totalHours += duration;
                    }
                });

                const hourlyWage = totalHours * config.hourlyRate;
                const totalSalary = config.baseSalary + hourlyWage + config.allowance - config.deductions;

                report.push({
                    userId: user._id,
                    userName: user.username,
                    fullName: user.fullname,
                    totalHours: parseFloat(totalHours.toFixed(2)),
                    totalSalary: parseFloat(totalSalary.toFixed(0)),
                    status: 'pending' // Mặc định, có thể check trong salaryLogModel nếu đã chốt
                });
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
