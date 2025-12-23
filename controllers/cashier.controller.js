const { orderModel } = require('../model/order.model');
const { tableModel } = require('../model/table.model');

// Lấy tất cả hóa đơn (orders)
exports.getAllInvoices = async (req, res) => {
    try {
        const orders = await orderModel.find()
            .populate('items.menuItem')
            .populate('server', 'name')
            .populate('cashier', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: orders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách hóa đơn',
            error: error.message
        });
    }
};

// Lấy hóa đơn theo trạng thái thanh toán
exports.getInvoicesByStatus = async (req, res) => {
    try {
        const { status } = req.params; // pending, paid, cancelled

        const orders = await orderModel.find({ orderStatus: status })
            .populate('items.menuItem')
            .populate('server', 'name')
            .populate('cashier', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: orders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách hóa đơn',
            error: error.message
        });
    }
};

// Lấy chi tiết một hóa đơn
exports.getInvoiceById = async (req, res) => {
    try {
        const invoice = await orderModel.findById(req.params.id)
            .populate('items.menuItem')
            .populate('server', 'name')
            .populate('cashier', 'name');

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy hóa đơn'
            });
        }

        res.status(200).json({
            success: true,
            data: invoice
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy chi tiết hóa đơn',
            error: error.message
        });
    }
};

// Lấy hóa đơn theo số bàn
exports.getInvoiceByTable = async (req, res) => {
    try {
        const { tableNumber } = req.params;

        const invoice = await orderModel.findOne({
            tableNumber: parseInt(tableNumber),
            orderStatus: { $in: ['pending', 'preparing', 'ready', 'served'] }
        })
            .populate('items.menuItem')
            .populate('server', 'name')
            .populate('cashier', 'name');

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy hóa đơn cho bàn này'
            });
        }

        res.status(200).json({
            success: true,
            data: invoice
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy hóa đơn',
            error: error.message
        });
    }
};

// Tính tổng tiền hóa đơn (có thể áp dụng giảm giá)
exports.calculateTotal = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { discount } = req.body; // Giảm giá (%)

        const order = await orderModel.findById(orderId)
            .populate('items.menuItem');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy hóa đơn'
            });
        }

        // Tính tổng tiền
        let totalAmount = 0;
        order.items.forEach(item => {
            totalAmount += item.price * item.quantity;
        });

        // Áp dụng giảm giá
        const discountAmount = discount ? (totalAmount * discount / 100) : 0;
        const finalAmount = totalAmount - discountAmount;

        // Cập nhật order
        order.totalAmount = totalAmount;
        order.discount = discount || 0;
        order.finalAmount = finalAmount;
        await order.save();

        res.status(200).json({
            success: true,
            message: 'Tính toán thành công',
            data: {
                totalAmount,
                discount: discount || 0,
                discountAmount,
                finalAmount
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tính tổng tiền',
            error: error.message
        });
    }
};

// Thanh toán hóa đơn
exports.processPayment = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { paymentMethod, paidAmount, cashierId } = req.body;

        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy hóa đơn'
            });
        }

        // Validate số tiền
        if (paidAmount < order.finalAmount) {
            return res.status(400).json({
                success: false,
                message: 'Số tiền thanh toán không đủ'
            });
        }

        // Tính tiền thừa
        const change = paidAmount - order.finalAmount;

        // Cập nhật thông tin thanh toán
        order.paymentMethod = paymentMethod;
        order.paidAmount = paidAmount;
        order.change = change;
        order.orderStatus = 'paid';
        order.paidAt = new Date();
        if (cashierId) {
            order.cashier = cashierId;
        }

        await order.save();

        // Cập nhật trạng thái bàn về available
        await tableModel.findOneAndUpdate(
            { tableNumber: order.tableNumber },
            { status: 'available', currentOrder: null }
        );

        const updatedOrder = await orderModel.findById(orderId)
            .populate('items.menuItem')
            .populate('server', 'name')
            .populate('cashier', 'name');

        res.status(200).json({
            success: true,
            message: 'Thanh toán thành công',
            data: updatedOrder
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi thanh toán',
            error: error.message
        });
    }
};

// In hóa đơn (trả về dữ liệu để in)
exports.printInvoice = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await orderModel.findById(orderId)
            .populate('items.menuItem')
            .populate('server', 'name')
            .populate('cashier', 'name');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy hóa đơn'
            });
        }

        // Format dữ liệu để in
        const invoiceData = {
            invoiceNumber: order._id.toString().slice(-8).toUpperCase(),
            date: order.createdAt,
            paidAt: order.paidAt,
            tableNumber: order.tableNumber,
            server: order.server ? order.server.name : 'N/A',
            cashier: order.cashier ? order.cashier.name : 'N/A',
            items: order.items.map(item => ({
                name: item.menuItem ? item.menuItem.name : 'N/A',
                quantity: item.quantity,
                price: item.price,
                total: item.quantity * item.price
            })),
            totalAmount: order.totalAmount,
            discount: order.discount,
            discountAmount: order.totalAmount * order.discount / 100,
            finalAmount: order.finalAmount,
            paymentMethod: order.paymentMethod,
            paidAmount: order.paidAmount,
            change: order.change
        };

        res.status(200).json({
            success: true,
            data: invoiceData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin in hóa đơn',
            error: error.message
        });
    }
};

// Hủy hóa đơn
exports.cancelInvoice = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;

        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy hóa đơn'
            });
        }

        if (order.orderStatus === 'paid') {
            return res.status(400).json({
                success: false,
                message: 'Không thể hủy hóa đơn đã thanh toán'
            });
        }

        order.orderStatus = 'cancelled';
        order.cancelReason = reason;
        order.cancelledAt = new Date();
        await order.save();

        // Cập nhật trạng thái bàn
        await tableModel.findOneAndUpdate(
            { tableNumber: order.tableNumber },
            { status: 'available', currentOrder: null }
        );

        res.status(200).json({
            success: true,
            message: 'Đã hủy hóa đơn',
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi hủy hóa đơn',
            error: error.message
        });
    }
};

// Thống kê doanh thu theo ngày
// ĐÃ SỬA: Lấy từ History model (action='pay') thay vì Order model
exports.getDailySales = async (req, res) => {
    try {
        const { History } = require('../model/history.model');
        const { date } = req.query; // Format: YYYY-MM-DD

        const startDate = date ? new Date(date) : new Date();
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);

        // Lấy từ History model với action='pay'
        const paymentHistories = await History.find({
            action: 'pay',
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        }).lean();

        const totalSales = paymentHistories.reduce((sum, h) => sum + (h.details?.finalAmount || 0), 0);
        const totalOrders = paymentHistories.length;

        // Format lại dữ liệu để tương thích với response cũ
        const orders = paymentHistories.map(h => ({
            _id: h.orderId,
            tableNumber: h.tableNumber,
            finalAmount: h.details?.finalAmount || 0,
            totalAmount: h.details?.totalAmount || 0,
            paymentMethod: h.details?.paymentMethod || 'cash',
            paidAt: h.details?.paidAt || h.createdAt,
            items: h.details?.items || [],
            historyId: h._id
        }));

        res.status(200).json({
            success: true,
            data: {
                date: startDate,
                totalOrders,
                totalSales,
                orders
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê',
            error: error.message
        });
    }
};

// Tách hóa đơn (Split Bill)
exports.splitInvoice = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { splits } = req.body;
        // splits = [
        //   { items: [{ menuItem: "id1", quantity: 2 }], paymentMethod: "cash" },
        //   { items: [{ menuItem: "id2", quantity: 1 }], paymentMethod: "card" }
        // ]

        if (!splits || !Array.isArray(splits) || splits.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Cần ít nhất 2 hóa đơn con để tách'
            });
        }

        // Lấy order gốc
        const originalOrder = await orderModel.findById(orderId).populate('items.menuItem');

        if (!originalOrder) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy hóa đơn'
            });
        }

        if (originalOrder.orderStatus === 'paid' || originalOrder.orderStatus === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Không thể tách hóa đơn đã thanh toán hoặc đã hủy'
            });
        }

        // Tạo các order mới từ splits
        const newOrders = [];

        for (let i = 0; i < splits.length; i++) {
            const split = splits[i];

            // Tính toán cho order con
            let totalAmount = 0;
            const enrichedItems = [];

            for (const item of split.items) {
                // Tìm item trong order gốc
                const originalItem = originalOrder.items.find(
                    oi => oi.menuItem._id.toString() === item.menuItem.toString()
                );

                if (!originalItem) {
                    return res.status(400).json({
                        success: false,
                        message: `Món ${item.menuItem} không có trong hóa đơn gốc`
                    });
                }

                const itemTotal = originalItem.price * item.quantity;
                totalAmount += itemTotal;

                enrichedItems.push({
                    menuItem: originalItem.menuItem._id,
                    menuItemName: originalItem.menuItemName || originalItem.menuItem.name,
                    imageUrl: originalItem.imageUrl || originalItem.menuItem.image,
                    quantity: item.quantity,
                    price: originalItem.price,
                    status: originalItem.status,
                    note: item.note || originalItem.note
                });
            }

            const discount = split.discount || 0;
            const finalAmount = totalAmount - discount;

            // Tạo order mới
            const newOrder = new orderModel({
                tableNumber: originalOrder.tableNumber,
                server: originalOrder.server,
                cashier: originalOrder.cashier,
                items: enrichedItems,
                totalAmount,
                discount,
                finalAmount,
                paidAmount: 0,
                change: 0,
                paymentMethod: split.paymentMethod || 'cash',
                orderStatus: 'pending',
                splitTo: [] // Sẽ cập nhật sau
            });

            const saved = await newOrder.save();
            newOrders.push(saved);
        }

        // Cập nhật order gốc
        originalOrder.orderStatus = 'cancelled';
        originalOrder.cancelReason = 'Đã tách thành nhiều hóa đơn';
        originalOrder.cancelledAt = new Date();
        originalOrder.splitTo = newOrders.map(o => o._id);
        await originalOrder.save();

        // Populate thông tin cho response
        const populatedOrders = await orderModel.find({
            _id: { $in: newOrders.map(o => o._id) }
        })
            .populate('server', 'name username')
            .populate('cashier', 'name username')
            .populate('items.menuItem', 'name price image')
            .lean()
            .exec();

        res.status(200).json({
            success: true,
            message: `Đã tách hóa đơn thành ${newOrders.length} hóa đơn`,
            data: {
                originalOrderId: originalOrder._id,
                newOrders: populatedOrders
            }
        });
    } catch (error) {
        console.error('splitInvoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tách hóa đơn',
            error: error.message
        });
    }
};
