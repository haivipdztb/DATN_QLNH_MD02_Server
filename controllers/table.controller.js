const { tableModel } = require("../model/table.model");
const sockets = require('../sockets');

// Helper to emit socket events safely
function emitIo(req, eventName, payload) {
    try {
        const io = req.app && req.app.get ? req.app.get('io') : null;
        if (io) io.emit(eventName, payload);
    } catch (e) {
        // ignore socket errors
    }
}

// Lấy danh sách tất cả các bàn
exports.getAllTables = async (req, res) => {
    try {
        const tables = await tableModel.find();
        res.status(200).json({
            success: true,
            data: tables
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách bàn',
            error: error.message
        });
    }
};

// Cập nhật thông tin bàn
exports.updateTable = async (req, res) => {
    try {
        const { tableNumber, capacity, location, status, currentOrder, reservationName, reservationPhone, reservationAt } = req.body;
        const updatedTable = await tableModel.findByIdAndUpdate(
            req.params.id,
            { tableNumber, capacity, location, status, currentOrder, reservationName, reservationPhone, reservationAt, updatedAt: new Date() },
            { new: true, runValidators: true }
        );
        
        if (!updatedTable) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bàn'
            });
        }

        // ✅✅✅ THÊM:  Emit table_updated (CHUẨN HÓA TÊN EVENT)
        try {
            sockets.emitTableUpdated({
                _id: updatedTable._id,
                tableNumber: updatedTable.tableNumber,
                status: updatedTable.status,
                updatedAt: updatedTable.updatedAt
            });
            console.log(`✅ Emitted table_updated for table ${updatedTable. tableNumber}`);
        } catch (emitError) {
            console.warn('⚠️ Failed to emit table_updated:', emitError);
        }

        // If updated to reserved, schedule auto-release after 20s
        if (updatedTable. status === 'reserved') {
            // ✅ Emit table_reserved
            try {
                sockets. emitTableReserved({
                    _id: updatedTable._id,
                    tableNumber: updatedTable.tableNumber,
                    status: 'reserved',
                    updatedAt: updatedTable.updatedAt
                });
                console.log(`✅ Emitted table_reserved for table ${updatedTable.tableNumber}`);
            } catch (emitError) {
                console.warn('⚠️ Failed to emit table_reserved:', emitError);
            }

            const id = req.params.id;
            setTimeout(async () => {
                try {
                    const latest = await tableModel.findById(id);
                    if (latest && latest.status === 'reserved') {
                        latest.status = 'available';
                        latest.updatedAt = new Date();
                        if (latest.reservationName) latest.reservationName = '';
                        if (latest.reservationPhone) latest.reservationPhone = '';
                        if (latest.reservationAt) latest.reservationAt = '';
                        await latest.save();

                        // ✅ Emit table_auto_released
                        try {
                            sockets.emitTableAutoReleased({
                                _id: latest._id,
                                tableNumber: latest.tableNumber,
                                status: 'available',
                                updatedAt:  latest.updatedAt,
                                eventName: 'table_auto_released'
                            });
                            console.log(`✅ Emitted table_auto_released for table ${latest.tableNumber}`);
                        } catch (emitError) {
                            console.warn('⚠️ Failed to emit table_auto_released:', emitError);
                        }

                        // ✅ Also emit table_updated
                        try {
                            sockets.emitTableUpdated({
                                _id: latest._id,
                                tableNumber:  latest.tableNumber,
                                status: 'available',
                                updatedAt: latest.updatedAt
                            });
                        } catch (emitError) {
                            console.warn('⚠️ Failed to emit table_updated after auto-release:', emitError);
                        }
                    }
                } catch (e) {
                    console.error('Auto-release error:', e);
                }
            }, 20000);
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật bàn thành công',
            data: updatedTable
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật bàn',
            error: error. message
        });
    }
};
// Cập nhật trạng thái bàn
exports.updateTableStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const updatedTable = await Table.findByIdAndUpdate(
            req.params.id,
            { status, currentOrder: null, updatedAt: Date.now() },
            { new: true },
            { status, updatedAt: new Date() },
            { new: true, runValidators: true }
        );
        if (!updatedTable) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy bàn"
            });
        }

        // Emit status changed
        emitIo(req, 'table_status_changed', {
            tableId: updatedTable._id,
            tableNumber: updatedTable.tableNumber,
            status: updatedTable.status,
            updatedAt: updatedTable.updatedAt
        });

        // If set to reserved via this endpoint, schedule auto-release
        if (updatedTable.status === 'reserved') {
            emitIo(req, 'table_reserved', {
                tableId: updatedTable._id,
                tableNumber: updatedTable.tableNumber,
                status: 'reserved',
                updatedAt: updatedTable.updatedAt
            });

            const id = req.params.id;
            setTimeout(async () => {
                try {
                    const latest = await tableModel.findById(id);
                    if (latest && latest.status === 'reserved') {
                        latest.status = 'available';
                        latest.updatedAt = new Date();
                        if (latest.reservationName) latest.reservationName = '';
                        if (latest.reservationPhone) latest.reservationPhone = '';
                        if (latest.reservationAt) latest.reservationAt = '';
                        await latest.save();

                        emitIo(req, 'table_auto_released', {
                            tableId: latest._id,
                            tableNumber: latest.tableNumber,
                            status: 'available',
                            updatedAt: latest.updatedAt
                        });
                        emitIo(req, 'table_status_changed', {
                            tableId: latest._id,
                            tableNumber: latest.tableNumber,
                            status: 'available',
                            updatedAt: latest.updatedAt
                        });
                    }
                } catch (e) { /* ignore */ }
            }, 20000);
        }

        res.status(200).json({
            success: true,
            message: "Cập nhật trạng thái bàn thành công",
            data: updatedTable
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật trạng thái bàn",
            error: error.message
        });
    }
};


// Xóa bàn
exports.deleteTable = async (req, res) => {
    try {
        // Kiểm tra bàn có tồn tại không
        const table = await tableModel.findById(req.params.id);
        if (!table) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy bàn",
            });
        }

        // Kiểm tra trạng thái bàn
        if (table.status === 'occupied') {
            return res.status(400).json({
                success: false,
                message: "Không thể xóa bàn đang được sử dụng. Vui lòng thanh toán và giải phóng bàn trước.",
            });
        }

        if (table.status === 'reserved') {
            return res.status(400).json({
                success: false,
                message: "Không thể xóa bàn đã được đặt trước. Vui lòng hủy đặt bàn hoặc chờ hết thời gian đặt.",
            });
        }

        // Nếu bàn available, cho phép xóa (soft delete)
        const deletedTable = await tableModel.softDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "Xóa bàn thành công",
            data: deletedTable,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi khi xóa bàn",
            error: error.message,
        });
    }
};

// Đặt trước bàn và tự động hủy sau 20s nếu chưa có ai nhận
exports.reserveTable = async (req, res) => {
    try {
        const { id } = req.params;
        // Đặt trạng thái reserved
        const table = await tableModel.findByIdAndUpdate(
            id,
            { status: 'reserved', updatedAt: new Date(), reservationAt: req.body.reservationAt || '', reservationName: req.body.reservationName || '', reservationPhone: req.body.reservationPhone || '' },
            { new: true, runValidators: true }
        );
        if (!table) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bàn' });
        }

        // Emit reserved and status changed
        emitIo(req, 'table_reserved', {
            tableId: table._id,
            tableNumber: table.tableNumber,
            status: 'reserved',
            updatedAt: table.updatedAt
        });
        emitIo(req, 'table_status_changed', {
            tableId: table._id,
            tableNumber: table.tableNumber,
            status: 'reserved',
            updatedAt: table.updatedAt
        });

        res.status(200).json({ success: true, message: 'Đã đặt trước bàn', data: table });

        // Sau 20s kiểm tra lại trạng thái, nếu vẫn reserved thì chuyển về available
        setTimeout(async () => {
            try {
                const latest = await tableModel.findById(id);
                if (latest && latest.status === 'reserved') {
                    latest.status = 'available';
                    latest.updatedAt = new Date();
                    if (latest.reservationName) latest.reservationName = '';
                    if (latest.reservationPhone) latest.reservationPhone = '';
                    if (latest.reservationAt) latest.reservationAt = '';
                    await latest.save();

                    // Emit socket event thông báo bàn đã tự động hủy đặt trước
                    emitIo(req, 'table_auto_released', {
                        tableId: latest._id,
                        tableNumber: latest.tableNumber,
                        status: 'available',
                        updatedAt: latest.updatedAt
                    });
                    emitIo(req, 'table_status_changed', {
                        tableId: latest._id,
                        tableNumber: latest.tableNumber,
                        status: 'available',
                        updatedAt: latest.updatedAt
                    });
                }
            } catch (e) { /* ignore */ }
        }, 20000);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi đặt trước bàn', error: error.message });
    }
};

// Lấy danh sách bàn theo trạng thái
exports.getTablesByStatus = async (req, res) => {
    try {
        const { status } = req.params;
        const tables = await tableModel.find({ status });
        res.status(200).json({
            success: true,
            data: tables
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách bàn theo trạng thái',
            error: error.message
        });
    }
};

// Lấy chi tiết một bàn theo ID
exports.getTableById = async (req, res) => {
    try {
        const table = await tableModel.findById(req.params.id);
        if (!table) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bàn'
            });
        }
        res.status(200).json({
            success: true,
            data: table
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy chi tiết bàn',
            error: error.message
        });
    }
};

// Thêm bàn mới
exports.createTable = async (req, res) => {
    try {
        const { tableNumber, capacity, location, status } = req.body;
        const newTable = new tableModel({
            tableNumber,
            capacity,
            location,
            status: status || 'available'
        });
        await newTable.save();
        res.status(201).json({
            success: true,
            message: 'Thêm bàn thành công',
            data: newTable
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi thêm bàn',
            error: error.message
        });
    }
};