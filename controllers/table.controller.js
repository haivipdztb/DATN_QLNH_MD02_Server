const { tableModel } = require("../model/table.model");

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
        exports.updateTable = async (req, res) => {
          try {
            const {tableNumber, capacity, location, status, currentOrder, reservationName, reservationPhone, reservationAt} = req.body;
            const updatedTable = await tableModel.findByIdAndUpdate(
              req.params.id,
              {tableNumber, capacity, location, status, currentOrder, reservationName, reservationPhone, reservationAt, updatedAt: new Date()},
              {new: true, runValidators: true}
            );
            if (!updatedTable) {
              return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bàn'
              });
            }

            // Emit status changed event
            emitIo(req, 'table_status_changed', {
              tableId: updatedTable._id,
              tableNumber: updatedTable.tableNumber,
              status: updatedTable.status,
              updatedAt: updatedTable.updatedAt
            });

            // If updated to reserved, schedule auto-release after 20s
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
                    // clear reservation fields if exist
                    if (latest.reservationName) latest.reservationName = '';
                    if (latest.reservationPhone) latest.reservationPhone = '';
                    if (latest.reservationAt) latest.reservationAt = '';
                    await latest.save();

                    // Emit both auto-released and status changed
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
              message: 'Cập nhật bàn thành công',
              data: updatedTable
            });
          } catch (error) {
            res.status(500).json({
              success: false,
              message: 'Lỗi khi cập nhật bàn',
              error: error.message
            });
          }
        };
            tableNumber: updatedTable.tableNumber,
            exports.updateTableStatus = async (req, res) => {
              try {
                const {status} = req.body;
                const updatedTable = await tableModel.findByIdAndUpdate(
                  req.params.id,
                  {status, updatedAt: new Date()},
                  {new: true, runValidators: true}
                );
                if (!updatedTable) {
                  return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy bàn'
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
                  message: 'Cập nhật trạng thái bàn thành công',
                  data: updatedTable
                });
              } catch (error) {
                res.status(500).json({
                  success: false,
                  message: 'Lỗi khi cập nhật trạng thái bàn',
                  error: error.message
                });
              }
            };

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
            message: 'Cập nhật trạng thái bàn thành công',
            data: updatedTable
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật trạng thái bàn',
            error: error.message
        });
=======
  try {
    const { status } = req.body;
    const updatedTable = await tableModel.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    if (!updatedTable) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bàn",
      });
>>>>>>> 4cf1959092632681952335885d6eb6f8bb886346
    }
    res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái bàn thành công",
      data: updatedTable,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật trạng thái bàn",
      error: error.message,
    });
  }
};

// Xóa bàn
exports.deleteTable = async (req, res) => {
  try {
    const deletedTable = await tableModel.findByIdAndDelete(req.params.id);
    if (!deletedTable) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bàn",
      });
    }
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