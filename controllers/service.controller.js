const { tableModel } = require('../model/table.model');
const { orderModel } = require('../model/order.model');

/**
 * Waiter: Lấy danh sách bàn đang phục vụ
 */
exports.getServingTables = async (req, res) => {
    try {
        const servingTables = await tableModel.find({
            status: 'occupied'
        }).populate('currentOrder').lean();

        return res.status(200).json({
            success: true,
            data: servingTables,
            count: servingTables.length
        });
    } catch (error) {
        console.error('getServingTables error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách bàn đang phục vụ',
            error: error.message
        });
    }
};

/**
 * Waiter: Lấy danh sách bàn chờ thanh toán
 */
exports.getWaitingPaymentTables = async (req, res) => {
    try {
        const waitingOrders = await orderModel.find({
            orderStatus: { $in: ['temp_calculation', 'temp_bill_printed'] }
        }).lean();

        return res.status(200).json({
            success: true,
            data: waitingOrders,
            count: waitingOrders.length
        });
    } catch (error) {
        console.error('getWaitingPaymentTables error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách bàn chờ thanh toán',
            error: error.message
        });
    }
};

/**
 * Cashier: Lấy danh sách hóa đơn đang phục vụ
 */
exports.getServingInvoices = async (req, res) => {
    try {
        const servingInvoices = await orderModel.find({
            orderStatus: { $in: ['pending', 'confirmed'] }
        })
            .populate('server cashier')
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            data: servingInvoices,
            count: servingInvoices.length
        });
    } catch (error) {
        console.error('getServingInvoices error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách hóa đơn đang phục vụ',
            error: error.message
        });
    }
};

/**
 * Cashier: Lấy danh sách hóa đơn đã thanh toán
 * ĐÃ SỬA: Lấy từ History model (action='pay') thay vì Order model
 */
exports.getPaidInvoices = async (req, res) => {
    try {
        const { History } = require('../model/history.model');
        const { startDate, endDate } = req.query;

        let dateFilter = {};

        if (startDate && endDate) {
            dateFilter = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        } else {
            // Mặc định lấy hóa đơn hôm nay
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            dateFilter = {
                $gte: today,
                $lt: tomorrow
            };
        }

        // Lấy từ History model với action='pay'
        const paymentHistories = await History.find({
            action: 'pay',
            createdAt: dateFilter
        })
            .sort({ createdAt: -1 })
            .lean();

        // Format lại dữ liệu để tương thích với response cũ
        const paidInvoices = paymentHistories.map(h => ({
            _id: h.orderId,
            historyId: h._id,
            tableNumber: h.tableNumber,
            finalAmount: h.details?.finalAmount || 0,
            totalAmount: h.details?.totalAmount || 0,
            discount: (h.details?.totalAmount || 0) - (h.details?.finalAmount || 0),
            paymentMethod: h.details?.paymentMethod || 'cash',
            paidAt: h.details?.paidAt || h.createdAt,
            createdAt: h.createdAt,
            items: h.details?.items || [],
            server: h.performedBy,
            cashier: h.details?.cashier || null
        }));

        // Tính tổng
        const summary = {
            total: paidInvoices.length,
            totalAmount: paidInvoices.reduce((sum, inv) => sum + (inv.finalAmount || 0), 0)
        };

        return res.status(200).json({
            success: true,
            data: paidInvoices,
            summary,
            count: paidInvoices.length
        });
    } catch (error) {
        console.error('getPaidInvoices error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách hóa đơn đã thanh toán',
            error: error.message
        });
    }
};

/**
 * Lấy danh sách món đang nấu
 */
exports.getCookingDishes = async (req, res) => {
    try {
        const cookingOrders = await orderModel.find({
            orderStatus: { $in: ['confirmed', 'pending'] }
        })
            .populate('server tableNumber')
            .populate('items.menuItem')
            .lean();

        // Flatten items
        const dishes = [];
        for (const order of cookingOrders) {
            for (const item of order.items || []) {
                if (item.status === 'preparing' || item.status === 'pending') {
                    dishes.push({
                        orderId: order._id,
                        tableNumber: order.tableNumber,
                        menuItem: item.menuItem,
                        quantity: item.quantity,
                        status: item.status,
                        createdAt: order.createdAt,
                        server: order.server
                    });
                }
            }
        }

        return res.status(200).json({
            success: true,
            data: dishes,
            count: dishes.length
        });
    } catch (error) {
        console.error('getCookingDishes error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách món đang nấu',
            error: error.message
        });
    }
};

/**
 * Lấy danh sách món quá thời gian
 */
exports.getOverdueDishes = async (req, res) => {
    try {
        const threshold = new Date(Date.now() - 30 * 60 * 1000); // 30 phút

        const overdueOrders = await orderModel.find({
            orderStatus: { $in: ['confirmed', 'pending'] },
            createdAt: { $lte: threshold }
        })
            .populate('server tableNumber')
            .populate('items.menuItem')
            .lean();

        // Flatten items
        const dishes = [];
        for (const order of overdueOrders) {
            for (const item of order.items || []) {
                if (item.status === 'preparing' || item.status === 'pending') {
                    const minutesOverdue = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
                    dishes.push({
                        orderId: order._id,
                        tableNumber: order.tableNumber,
                        menuItem: item.menuItem,
                        quantity: item.quantity,
                        status: item.status,
                        createdAt: order.createdAt,
                        minutesOverdue,
                        server: order.server
                    });
                }
            }
        }

        return res.status(200).json({
            success: true,
            data: dishes,
            count: dishes.length
        });
    } catch (error) {
        console.error('getOverdueDishes error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách món quá thời gian',
            error: error.message
        });
    }
};

/**
 * Dashboard tổng hợp cho Waiter/Cashier
 */
exports.getServiceDashboard = async (req, res) => {
    try {
        // Bàn đang phục vụ
        const servingTablesCount = await tableModel.countDocuments({ status: 'occupied' });

        // Bàn chờ thanh toán
        const waitingPaymentCount = await orderModel.countDocuments({
            orderStatus: { $in: ['temp_calculation', 'temp_bill_printed'] }
        });

        // Hóa đơn đang phục vụ
        const servingInvoicesCount = await orderModel.countDocuments({
            orderStatus: { $in: ['pending', 'confirmed'] }
        });

        // Hóa đơn đã thanh toán hôm nay
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const paidTodayCount = await orderModel.countDocuments({
            orderStatus: 'paid',
            paidAt: { $gte: today, $lt: tomorrow }
        });

        // Số món đang nấu
        const cookingDishes = await orderModel.aggregate([
            { $match: { orderStatus: { $in: ['confirmed', 'pending'] } } },
            { $unwind: '$items' },
            { $match: { 'items.status': { $in: ['pending', 'preparing'] } } },
            { $count: 'total' }
        ]);

        // Món quá thời gian (> 30 phút)
        const threshold = new Date(Date.now() - 30 * 60 * 1000);
        const overdueDishes = await orderModel.aggregate([
            {
                $match: {
                    orderStatus: { $in: ['confirmed', 'pending'] },
                    createdAt: { $lte: threshold }
                }
            },
            { $unwind: '$items' },
            { $match: { 'items.status': { $in: ['pending', 'preparing'] } } },
            { $count: 'total' }
        ]);

        return res.status(200).json({
            success: true,
            data: {
                servingTables: servingTablesCount,
                waitingPayment: waitingPaymentCount,
                servingInvoices: servingInvoicesCount,
                paidToday: paidTodayCount,
                cookingDishes: cookingDishes[0]?.total || 0,
                overdueDishes: overdueDishes[0]?.total || 0
            }
        });
    } catch (error) {
        console.error('getServiceDashboard error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin dashboard',
            error: error.message
        });
    }
};
