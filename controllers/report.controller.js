const { reportModel } = require('../model/report.model');
const { orderModel } = require('../model/order.model');
const { History } = require('../model/history.model');

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
// ĐÃ SỬA: Lấy từ History model (action='pay') thay vì Order model
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

        // Lấy tất cả history với action='pay' trong ngày
        const paymentHistories = await History.find({
            action: 'pay',
            createdAt: { $gte: startDate, $lte: endDate }
        }).lean();

        const totalOrders = paymentHistories.length;
        const totalRevenue = paymentHistories.reduce((sum, h) => sum + (h.details?.finalAmount || 0), 0);
        const totalDiscountGiven = paymentHistories.reduce((sum, h) => {
            const total = h.details?.totalAmount || 0;
            const final = h.details?.finalAmount || 0;
            return sum + (total - final);
        }, 0);
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
                historyIds: paymentHistories.map(h => h._id)
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
// ĐÃ SỬA: Lấy từ History model (action='pay') thay vì Order model
exports.createWeeklyReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.body;
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Lấy tất cả history với action='pay' trong khoảng thời gian
        const paymentHistories = await History.find({
            action: 'pay',
            createdAt: { $gte: start, $lte: end }
        }).lean();

        const totalOrders = paymentHistories.length;
        const totalRevenue = paymentHistories.reduce((sum, h) => sum + (h.details?.finalAmount || 0), 0);
        const totalDiscountGiven = paymentHistories.reduce((sum, h) => {
            const total = h.details?.totalAmount || 0;
            const final = h.details?.finalAmount || 0;
            return sum + (total - final);
        }, 0);
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
                historyIds: paymentHistories.map(h => h._id)
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
        const deletedReport = await reportModel.softDelete(req.params.id);
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
// ĐÃ SỬA: Lấy từ History model (action='pay') thay vì Order model
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

        // Lấy tất cả history với action='pay' trong tháng
        const paymentHistories = await History.find({
            action: 'pay',
            createdAt: { $gte: startDate, $lte: endDate }
        }).lean();

        const totalOrders = paymentHistories.length;
        const totalRevenue = paymentHistories.reduce((sum, h) => sum + (h.details?.finalAmount || 0), 0);
        const totalDiscountGiven = paymentHistories.reduce((sum, h) => {
            const total = h.details?.totalAmount || 0;
            const final = h.details?.finalAmount || 0;
            return sum + (total - final);
        }, 0);
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
                historyIds: paymentHistories.map(h => h._id)
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
// ĐÃ SỬA: Lấy từ History model (action='pay') thay vì Order model
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

        const paymentHistories = await History.find({
            action: 'pay',
            createdAt: { $gte: startDate, $lte: endDate }
        }).lean();

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

        paymentHistories.forEach(history => {
            const details = history.details || {};
            const paidAt = details.paidAt ? new Date(details.paidAt) : new Date(history.createdAt);
            const hour = paidAt.getHours();
            const finalAmount = details.finalAmount || 0;
            const totalAmount = details.totalAmount || 0;
            const discount = totalAmount - finalAmount;

            hourlyStats[hour].revenue += finalAmount;
            hourlyStats[hour].orders += 1;
            hourlyStats[hour].discount += discount;
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
// ĐÃ SỬA: Lấy từ History model (action='pay') thay vì Order model
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

        // Lấy tất cả history với action='pay' trong khoảng thời gian
        const paymentHistories = await History.find({
            action: 'pay',
            createdAt: { $gte: start, $lte: end }
        }).lean();

        // Nhóm theo giờ
        const hourlyStats = {};
        for (let hour = 0; hour < 24; hour++) {
            hourlyStats[hour] = {
                hour: hour,
                revenue: 0,
                orders: 0
            };
        }

        paymentHistories.forEach(history => {
            const details = history.details || {};
            const paidAt = details.paidAt ? new Date(details.paidAt) : new Date(history.createdAt);
            const hour = paidAt.getHours();
            const finalAmount = details.finalAmount || 0;

            hourlyStats[hour].revenue += finalAmount;
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
// ĐÃ SỬA: Lấy từ History model (action='pay') thay vì Order model
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

        // Lấy tất cả history với action='pay' trong khoảng thời gian
        const paymentHistories = await History.find({
            action: 'pay',
            createdAt: { $gte: start, $lte: end }
        }).lean();

        const totalOrders = paymentHistories.length;
        const totalRevenue = paymentHistories.reduce((sum, h) => sum + (h.details?.finalAmount || 0), 0);
        const totalDiscountGiven = paymentHistories.reduce((sum, h) => {
            const total = h.details?.totalAmount || 0;
            const final = h.details?.finalAmount || 0;
            return sum + (total - final);
        }, 0);
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Nhóm theo ngày
        const dailyStats = {};
        paymentHistories.forEach(history => {
            const details = history.details || {};
            const paidAt = details.paidAt ? new Date(details.paidAt) : new Date(history.createdAt);
            const dateKey = paidAt.toISOString().split('T')[0];
            const finalAmount = details.finalAmount || 0;
            const totalAmount = details.totalAmount || 0;
            const discount = totalAmount - finalAmount;

            if (!dailyStats[dateKey]) {
                dailyStats[dateKey] = {
                    date: dateKey,
                    revenue: 0,
                    orders: 0,
                    discount: 0
                };
            }
            dailyStats[dateKey].revenue += finalAmount;
            dailyStats[dateKey].orders += 1;
            dailyStats[dateKey].discount += discount;
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
                dailyBreakdown: Object.values(dailyStats).sort((a, b) =>
                    new Date(a.date) - new Date(b.date)
                )
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

// Lấy báo cáo chi tiết với biểu đồ và thống kê đầy đủ
// ĐÃ SỬA: Lấy từ History model (action='pay') thay vì Order model
exports.getDetailedReport = async (req, res) => {
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

        // Lấy tất cả history với action='pay' trong khoảng thời gian
        const paymentHistories = await History.find({
            action: 'pay',
            createdAt: { $gte: start, $lte: end }
        }).lean();

        // Tính toán các metrics cơ bản
        const totalOrders = paymentHistories.length;
        const totalRevenue = paymentHistories.reduce((sum, h) => sum + (h.details?.finalAmount || 0), 0);
        const totalDiscountGiven = paymentHistories.reduce((sum, h) => {
            const total = h.details?.totalAmount || 0;
            const final = h.details?.finalAmount || 0;
            return sum + (total - final);
        }, 0);
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Nhóm theo ngày để vẽ biểu đồ
        const dailyStats = {};
        const hourlyStats = {};
        const dishStats = {};
        const paymentMethodStats = {};

        // Khởi tạo hourly stats
        for (let hour = 0; hour < 24; hour++) {
            hourlyStats[hour] = {
                hour: hour,
                revenue: 0,
                orders: 0
            };
        }

        paymentHistories.forEach(history => {
            const details = history.details || {};
            const paidAt = details.paidAt ? new Date(details.paidAt) : new Date(history.createdAt);
            const finalAmount = details.finalAmount || 0;
            const totalAmount = details.totalAmount || 0;
            const discount = totalAmount - finalAmount;

            // Daily stats
            const dateKey = paidAt.toISOString().split('T')[0];
            if (!dailyStats[dateKey]) {
                dailyStats[dateKey] = {
                    date: dateKey,
                    revenue: 0,
                    orders: 0,
                    discount: 0
                };
            }
            dailyStats[dateKey].revenue += finalAmount;
            dailyStats[dateKey].orders += 1;
            dailyStats[dateKey].discount += discount;

            // Hourly stats
            const hour = paidAt.getHours();
            hourlyStats[hour].revenue += finalAmount;
            hourlyStats[hour].orders += 1;

            // Payment method stats
            const paymentMethod = details.paymentMethod || 'Tiền mặt';
            if (!paymentMethodStats[paymentMethod]) {
                paymentMethodStats[paymentMethod] = {
                    method: paymentMethod,
                    count: 0,
                    revenue: 0
                };
            }
            paymentMethodStats[paymentMethod].count += 1;
            paymentMethodStats[paymentMethod].revenue += finalAmount;

            // Dish stats
            if (details.items && Array.isArray(details.items)) {
                details.items.forEach(item => {
                    const dishName = item.menuItemName || item.name || 'Unknown';
                    const dishId = item.menuItem || dishName;

                    if (!dishStats[dishId]) {
                        dishStats[dishId] = {
                            name: dishName,
                            quantity: 0,
                            revenue: 0
                        };
                    }
                    dishStats[dishId].quantity += item.quantity || 1;
                    dishStats[dishId].revenue += (item.price || 0) * (item.quantity || 1);
                });
            }
        });

        // Sắp xếp top dishes
        const topDishes = Object.values(dishStats)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

        // Tính số ngày trong khoảng thời gian
        const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

        res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalRevenue,
                    totalOrders,
                    totalDiscountGiven,
                    averageOrderValue,
                    period: daysDiff,
                    averageRevenuePerDay: daysDiff > 0 ? totalRevenue / daysDiff : 0,
                    averageOrdersPerDay: daysDiff > 0 ? totalOrders / daysDiff : 0
                },
                charts: {
                    dailyRevenue: Object.values(dailyStats).sort((a, b) =>
                        new Date(a.date) - new Date(b.date)
                    ),
                    hourlyRevenue: Object.values(hourlyStats),
                    topDishes: topDishes,
                    paymentMethods: Object.values(paymentMethodStats)
                }
            },
            period: {
                startDate: start,
                endDate: end
            }
        });
    } catch (error) {
        console.error('Error in getDetailedReport:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy báo cáo chi tiết',
            error: error.message
        });
    }
};