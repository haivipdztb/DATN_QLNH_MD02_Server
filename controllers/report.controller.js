const {reportModel} = require('../model/report.model');
const {orderModel} = require('../model/order.model');

// Xem danh sách tất cả báo cáo
exports.getAllReports = async (req, res) => {
    try {
        const reports = await reportModel.find().sort({date: -1});
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
        const {date} = req.body;
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        // Lấy tất cả orders trong ngày
        const orders = await orderModel.find({
            createdAt: {$gte: startDate, $lte: endDate},
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
        const {startDate, endDate} = req.body;
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const orders = await orderModel.find({
            createdAt: {$gte: start, $lte: end},
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
            {new: true, runValidators: true}
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
        const { fromDate, toDate } = req.query;

        if (!fromDate || !toDate) {
            return res.status(400).json({ 
                success: false, 
                message: "Cần cung cấp fromDate và toDate" 
            });
        }

        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0); // bắt đầu ngày
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999); // kết thúc ngày

        const reports = await reportModel.find({
            date: { $gte: start, $lte: end }
        }).sort({ date: 1 }); // sắp xếp tăng dần theo ngày

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
