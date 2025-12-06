const { reportModel } = require('../model/report.model');
const { orderModel } = require('../model/order.model');

// Xem danh sách tất cả báo cáo
exports.getAllReports = async (req, res) => {
    try {
        const reports = await reportModel.find().sort({ date: -1 });
        res.status(200).json({
            success: true,
            data: reports
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách báo cáo',
            error: error.message
        });
    }
};

// Xem chi tiết một báo cáo theo ID
exports.getReportById = async (req, res) => {
    try {
        const report = await reportModel.findById(req.params.id);
        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy báo cáo'
            });
        }
        res.status(200).json({
            success: true,
            data: report
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy chi tiết báo cáo',
            error: error.message
        });
    }
};

// Tạo báo cáo theo ngày
exports.createDailyReport = async (req, res) => {
    try {
        const { date, reportDate } = req.body; // Nhận cả 2
        const dateString = date || reportDate; // Ưu tiên date

        if (!dateString) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu tham số date hoặc reportDate'
            });
        }

        const startDate = new Date(dateString);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(dateString);
        endDate.setHours(23, 59, 59, 999);

        // Kiểm tra ngày hợp lệ
        if (isNaN(startDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Định dạng ngày không hợp lệ'
            });
        }

        // Lấy tất cả orders trong ngày
        const orders = await orderModel.find({
            createdAt: { $gte: startDate, $lte: endDate },
            orderStatus: 'paid'
        });

        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + order.finalAmount, 0);
        const totalDiscountGiven = orders.reduce((sum, order) => sum + order.discount, 0);
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        const newReport = new reportModel({
            reportType: 'daily_sales',
            date: startDate,
            timeFrame: 'Day',
            totalRevenue,
            totalOrders,
            totalDiscountGiven,
            averageOrderValue,
            details: {
                orders: orders.map(o => o._id)
            }
        });

        await newReport.save();
        res.status(201).json({
            success: true,
            message: 'Tạo báo cáo ngày thành công',
            data: newReport
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo báo cáo',
            error: error.message
        });
    }
};

// Tạo báo cáo theo tuần
exports.createWeeklyReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.body;
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const orders = await orderModel.find({
            createdAt: { $gte: start, $lte: end },
            orderStatus: 'paid'
        });

        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + order.finalAmount, 0);
        const totalDiscountGiven = orders.reduce((sum, order) => sum + order.discount, 0);
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        const newReport = new reportModel({
            reportType: 'weekly_sales',
            date: start,
            timeFrame: 'Week',
            totalRevenue,
            totalOrders,
            totalDiscountGiven,
            averageOrderValue,
            details: {
                startDate: start,
                endDate: end,
                orders: orders.map(o => o._id)
            }
        });

        await newReport.save();
        res.status(201).json({
            success: true,
            message: 'Tạo báo cáo tuần thành công',
            data: newReport
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo báo cáo tuần',
            error: error.message
        });
    }
};

// Cập nhật báo cáo theo ID
exports.updateReport = async (req, res) => {
    try {
        const updatedReport = await reportModel.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedReport) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy báo cáo'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Cập nhật báo cáo thành công',
            data: updatedReport
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật báo cáo',
            error: error.message
        });
    }
};

// Xóa báo cáo theo ID
exports.deleteReport = async (req, res) => {
    try {
        const deletedReport = await reportModel.findByIdAndDelete(req.params.id);
        if (!deletedReport) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy báo cáo'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Xóa báo cáo thành công',
            data: deletedReport
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa báo cáo',
            error: error.message
        });
    }
};

// Lấy báo cáo theo khoảng ngày
exports.getReportsByDate = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ 
                success: false, 
                message: "Cần cung cấp startDate và endDate" 
            });
        }
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0); // bắt đầu ngày
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // kết thúc ngày
        const reports = await reportModel.find({
            date: { $gte: start, $lte: end }
        }).sort({ date: 1 });
        return res.status(200).json({
            success: true,
            data: reports
        });

    } catch (error) {
        console.error("getReportsByDate error:", error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy báo cáo theo ngày',
            error: error.message
        });
    }
};



// Tạo báo cáo theo tháng
exports.createMonthlyReport = async (req, res) => {
    try {
        const { month, year } = req.body;

        if (!month || !year) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu tham số month hoặc year'
            });
        }

        // Tạo khoảng thời gian cho tháng
        const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        const orders = await orderModel.find({
            createdAt: { $gte: startDate, $lte: endDate },
            orderStatus: 'paid'
        });

        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + order.finalAmount, 0);
        const totalDiscountGiven = orders.reduce((sum, order) => sum + order.discount, 0);
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        const newReport = new reportModel({
            reportType: 'monthly_sales',
            date: startDate,
            timeFrame: 'Month',
            totalRevenue,
            totalOrders,
            totalDiscountGiven,
            averageOrderValue,
            details: {
                month,
                year,
                startDate,
                endDate,
                orders: orders.map(o => o._id)
            }
        });

        await newReport.save();
        res.status(201).json({
            success: true,
            message: 'Tạo báo cáo tháng thành công',
            data: newReport
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo báo cáo tháng',
            error: error.message
        });
    }
};

// Thống kê doanh thu theo giờ
exports.getRevenueByHour = async (req, res) => {
    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu tham số date'
            });
        }

        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        const orders = await orderModel.find({
            createdAt: { $gte: startDate, $lte: endDate },
            orderStatus: 'paid'
        });

        // Nhóm theo giờ
        const hourlyStats = {};
        for (let hour = 0; hour < 24; hour++) {
            hourlyStats[hour] = {
                hour: hour,
                revenue: 0,
                orders: 0,
                discount: 0
            };
        }

        orders.forEach(order => {
            const hour = new Date(order.createdAt).getHours();
            hourlyStats[hour].revenue += order.finalAmount;
            hourlyStats[hour].orders += 1;
            hourlyStats[hour].discount += order.discount || 0;
        });

        const result = Object.values(hourlyStats);

        res.status(200).json({
            success: true,
            data: result,
            date: date
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi thống kê theo giờ',
            error: error.message
        });
    }
};

// Lấy giờ cao điểm
exports.getPeakHours = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu tham số startDate hoặc endDate'
            });
        }

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const orders = await orderModel.find({
            createdAt: { $gte: start, $lte: end },
            orderStatus: 'paid'
        });

        // Nhóm theo giờ
        const hourlyStats = {};
        for (let hour = 0; hour < 24; hour++) {
            hourlyStats[hour] = {
                hour: hour,
                revenue: 0,
                orders: 0
            };
        }

        orders.forEach(order => {
            const hour = new Date(order.createdAt).getHours();
            hourlyStats[hour].revenue += order.finalAmount;
            hourlyStats[hour].orders += 1;
        });

        // Sắp xếp theo doanh thu giảm dần
        const sortedHours = Object.values(hourlyStats).sort((a, b) => b.revenue - a.revenue);

        // Lấy top 5 giờ cao điểm và 5 giờ thấp điểm
        const peakHours = sortedHours.slice(0, 5);
        const lowHours = sortedHours.slice(-5).reverse();

        res.status(200).json({
            success: true,
            data: {
                peakHours: peakHours,
                lowHours: lowHours,
                allHours: sortedHours
            },
            period: {
                startDate: start,
                endDate: end
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy giờ cao điểm',
            error: error.message
        });
    }
};

// Thống kê doanh thu theo khoảng thời gian tùy chỉnh
exports.getRevenueByDateRange = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu tham số startDate hoặc endDate'
            });
        }

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const orders = await orderModel.find({
            createdAt: { $gte: start, $lte: end },
            orderStatus: 'paid'
        });

        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + order.finalAmount, 0);
        const totalDiscountGiven = orders.reduce((sum, order) => sum + order.discount, 0);
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Nhóm theo ngày
        const dailyStats = {};
        orders.forEach(order => {
            const dateKey = new Date(order.createdAt).toISOString().split('T')[0];
            if (!dailyStats[dateKey]) {
                dailyStats[dateKey] = {
                    date: dateKey,
                    revenue: 0,
                    orders: 0,
                    discount: 0
                };
            }
            dailyStats[dateKey].revenue += order.finalAmount;
            dailyStats[dateKey].orders += 1;
            dailyStats[dateKey].discount += order.discount || 0;
        });

        res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalRevenue,
                    totalOrders,
                    totalDiscountGiven,
                    averageOrderValue
                },
                dailyBreakdown: Object.values(dailyStats)
            },
            period: {
                startDate: start,
                endDate: end
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi thống kê theo khoảng thời gian',
            error: error.message
        });
    }
};