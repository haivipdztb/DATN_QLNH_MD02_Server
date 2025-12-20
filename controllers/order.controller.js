// controllers/order.controller.js
const { orderModel } = require('../model/order.model');
const { menuModel } = require('../model/menu.model'); 
const { tableModel } = require('../model/table.model');
const { Revenue } = require('../model/revenue.model'); 
const { History } = require('../model/history.model');
const { reportModel } = require('../model/report.model');





/**
 * Helper: enrich incoming items array by looking up menuModel when menuItem id provided.
 */
async function enrichItemsWithMenuData(rawItems = []) {
  const out = [];

  for (const it of rawItems) {
    try {
      if (!it) continue;

      // accept several possible keys for menu id
      const menuId = it.menuItem || it.menuItemId || it.menuId || null;
      let menuDoc = null;

      if (menuId) {
        try {
          menuDoc = await menuModel.findById(menuId).select('name price image imageUrl thumbnail').lean().exec();
        } catch (e) {
          console.warn('enrichItemsWithMenuData: menu lookup failed for id=', menuId, e && e.message);
        }
      }

      const quantity = (typeof it.quantity === 'number' && it.quantity > 0) ? it.quantity : 1;

      let price = 0;
      if (typeof it.price === 'number' && !isNaN(it.price)) {
        price = it.price;
      } else if (menuDoc && typeof menuDoc.price === 'number') {
        price = menuDoc.price;
      }

      let menuItemName = '';
      if (it.menuItemName && String(it.menuItemName).trim()) {
        menuItemName = String(it.menuItemName).trim();
      } else if (it.name && String(it.name).trim()) {
        menuItemName = String(it.name).trim();
      } else if (menuDoc && menuDoc.name) {
        menuItemName = menuDoc.name;
      }

      let imageUrl = '';
      if (it.imageUrl && String(it.imageUrl).trim()) imageUrl = String(it.imageUrl).trim();
      if (!imageUrl && it.image && String(it.image).trim()) imageUrl = String(it.image).trim();
      if (!imageUrl && menuDoc) {
        imageUrl = menuDoc.image || menuDoc.imageUrl || menuDoc.thumbnail || '';
      }

      const status = it.status ? String(it.status) : 'pending';
      const note = it.note ? String(it.note) : '';

      out.push({
        menuItem: menuId || null,
        menuItemName: menuItemName || '',
        imageUrl: imageUrl || '',
        quantity,
        price,
        status,
        note
      });
    } catch (e) {
      console.warn('enrichItemsWithMenuData: failed to process item', e && e.message);
    }
  }

  return out;
}

/**
 * Convenience helper to populate server/cashier and items.menuItem with image fields
 */
function populateOrderQuery(query) {
  return query
    .populate('server', 'name username')
    .populate('cashier', 'name username')
    .populate({
      path: 'items.menuItem',
      select: 'name price image imageUrl thumbnail'
    });
}

/**
 * GET /orders?tableNumber=...
 */
exports.getAllOrders = async (req, res) => {
  try {
   const filter = {};
    if (req.query && typeof req.query.tableNumber !== 'undefined' && req.query.tableNumber !== '') {
      const tn = Number(req.query.tableNumber);
      if (!isNaN(tn)) filter.tableNumber = tn;
      else filter.tableNumber = req.query.tableNumber;
    }
    
    // Filter theo orderStatus nếu có
    if (req.query && req.query.orderStatus) {
      filter.orderStatus = req.query.orderStatus;
    }

    let query = orderModel.find(filter).sort({ createdAt: -1 });
    query = populateOrderQuery(query);
    const orders = await query.lean().exec();

    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error('getAllOrders error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách orders',
      error: error.message
    });
  }
};

/**
 * GET /orders/:id
 */
exports.getOrderById = async (req, res) => {
  try {
    let query = orderModel.findById(req.params.id);
    query = populateOrderQuery(query);
    query = query.populate('mergedFrom').populate('splitTo');
    const order = await query.lean().exec();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy order' });
    }

    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error('getOrderById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết order',
      error: error.message
    });
  }
};

/**
 * Helper to emit socket events (uses req.app.get('io') if available).
 * Emits both a global broadcast and a room-specific event (room name "table_<tableNumber>").
 */
function emitOrderEvent(req, eventName, payload) {
  const io = req?.app?.get('io');
  if (!io) return;

  io.emit(eventName, payload);

  if (payload?.tableNumber !== undefined) {
    io.to(`table_${payload.tableNumber}`).emit(eventName, payload);
  }
}


/**
 * POST /orders
 */
exports.createOrder = async (req, res) => {
  try {
    const {
      tableNumber, server, cashier, items,
      totalAmount, discount, finalAmount,
      paymentMethod, orderStatus
    } = req.body;

    const safeItems = Array.isArray(items) ? items : [];
    const enrichedItems = await enrichItemsWithMenuData(safeItems);

    const computedTotal = enrichedItems.reduce((acc, it) => acc + (Number(it.price || 0) * Number(it.quantity || 0)), 0);
    const total = (typeof totalAmount === 'number' && !isNaN(totalAmount)) ? totalAmount : computedTotal;
    const final = (typeof finalAmount === 'number' && !isNaN(finalAmount)) ? finalAmount : total;

    const newOrder = new orderModel({
      tableNumber,
      server,
      cashier,
      items: enrichedItems,
      totalAmount: total,
      discount: discount || 0,
      finalAmount: final,
      paymentMethod,
      orderStatus: orderStatus || 'pending'
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('createOrder: enrichedItems preview:', enrichedItems.slice(0, 10));
    }

    const saved = await newOrder.save();

    // populate before returning and before emitting
    let query = orderModel.findById(saved._id);
    query = populateOrderQuery(query);
    const populated = await query.lean().exec();

    // Emit socket event so clients can update realtime
    // event names: 'order_created' and 'order_updated' are used by Android client
    emitOrderEvent(req, 'order_created', populated || saved);

    return res.status(201).json({
      success: true,
      message: 'Tạo order thành công',
      data: populated || saved
    });
  } catch (error) {
    console.error('createOrder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo order',
      error: error.message
    });
  }
};

/**
 * PUT /orders/:id
 */
exports.updateOrder = async (req, res) => {
  try {
    const {
      tableNumber, items, totalAmount, discount,
      finalAmount, paidAmount, change,
      paymentMethod, orderStatus, paidAt
    } = req.body;

    let enrichedItems = undefined;
    if (Array.isArray(items)) {
      enrichedItems = await enrichItemsWithMenuData(items);
    }

    const updateData = {
      tableNumber,
      items: (typeof enrichedItems !== 'undefined') ? enrichedItems : items,
      totalAmount,
      discount,
      finalAmount,
      paidAmount,
      change,
      paymentMethod,
      orderStatus
    };

    if (orderStatus === 'paid' && paidAt) {
      updateData.paidAt = paidAt;
    }

    const updated = await orderModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).exec();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy order' });
    }

    let query = orderModel.findById(updated._id);
    query = populateOrderQuery(query);
    const populated = await query.lean().exec();

    // Emit socket event for updated order
    emitOrderEvent(req, 'order_updated', populated || updated);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật order thành công',
      data: populated || updated
    });
  } catch (error) {
    console.error('updateOrder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật order',
      error: error.message
    });
  }
};

/**
 * DELETE /orders/:id
 */
exports.deleteOrder = async (req, res) => {
  try {
    const deleted = await orderModel.softDelete(req.params.id).exec();
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy order' });
    }
    return res.status(200).json({ success: true, message: 'Xóa order thành công', data: deleted });
  } catch (error) {
    console.error('deleteOrder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa order',
      error: error.message
    });
  }
};

// async function resetTableAfterPayment(tableNumber) {
//   if (tableNumber === undefined || tableNumber === null) return null;

//   try {
//     const updatedTable = await tableModel.findOneAndUpdate(
//       { tableNumber: tableNumber }, // Kiểu dữ liệu phải khớp DB
//       { status: 'available', currentOrder: null, updatedAt: Date.now() },
//       { new: true }
//     );

//     console.log('Updated table after payment:', updatedTable);
//     return updatedTable;
//   } catch (err) {
//     console.error('resetTableAfterPayment error:', err);
//     return null;
//   }
// }

/**
 * Normalize phương thức thanh toán
 */
function normalizePaymentMethod(pm) {
  if (!pm || typeof pm !== 'string') return 'Tiền mặt';
  const s = pm.trim().toLowerCase();
  if (s.includes('qr')) return 'QR';
  if (s.includes('thẻ') || s.includes('card')) return 'Thẻ ngân hàng';
  return 'Tiền mặt';
}

/**
 * POST /orders/pay
 */
/**
 * Reset trạng thái bàn sau khi thanh toán
 * @param {number} tableNumber
 * @returns {Promise<Object|null>}
 */
async function resetTableAfterPayment(tableNumber) {
  if (tableNumber === undefined || tableNumber === null) return null;

  const updatedTable = await tableModel.findOneAndUpdate(
    { tableNumber },
    { status: 'available', currentOrder: null, updatedAt: Date.now() },
    { new: true }
  );

  return updatedTable;
}


/**
 * POST /orders/pay
 */

exports.payOrder = async (req, res) => {
  console.log('--- payOrder called ---', req.body);

  try {
    const { orderId, paidAmount, paymentMethod, cashier } = req.body;
    if (!orderId) return res.status(400).json({ success: false, message: 'Order id is required' });

    const order = await orderModel.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const paid = Number(paidAmount) || 0;
    if (isNaN(paid) || paid < order.finalAmount) {
      return res.status(400).json({ success: false, message: 'Thanh toán thất bại: số tiền không hợp lệ' });
    }

    // --- Lưu vào Revenue ---
    const revenue = new Revenue({
      orderId: order._id,
      tableNumber: order.tableNumber,
      amount: order.finalAmount,
      paymentMethod: paymentMethod || 'Tiền mặt',
      paidAt: new Date()
    });
    await revenue.save();

    // --- Tạo History ---
    const history = new History({
      orderId: order._id,
      tableNumber: order.tableNumber,
      action: 'pay',
      performedBy: cashier || 'unknown',
      details: {
        items: order.items,
        totalAmount: order.totalAmount,
        finalAmount: order.finalAmount,
        paymentMethod: paymentMethod || 'Tiền mặt',
        paidAt: revenue.paidAt
      }
    });
    await history.save();

    // --- Xóa order khỏi active orders ---
    await orderModel.findByIdAndDelete(orderId);

    // --- Reset bàn ---
   let tableReset = null;

if (order.tableNumber !== undefined && order.tableNumber !== null) {
  // Đếm xem bàn này còn bao nhiêu hóa đơn khác chưa thanh toán
  const countOrders = await orderModel.countDocuments({
    tableNumber: order.tableNumber,
    _id: { $ne: order._id },        // loại trừ hóa đơn hiện tại
    status: { $ne: "paid" }         // chỉ đếm hóa đơn chưa thanh toán
  });

  if (countOrders === 0) {
    // Không còn hóa đơn nào khác → reset bàn
    tableReset = await tableModel.findOneAndUpdate(
      { tableNumber: order.tableNumber },
      {
        status: "available",
        currentOrder: null,
        updatedAt: Date.now(),
      },
      { new: true }
    );
  } else {
    // Vẫn còn hóa đơn khác → giữ nguyên trạng thái
    console.log(`Bàn ${order.tableNumber} vẫn còn ${countOrders} hóa đơn khác → không reset.`);
  }
}


    // --- Cập nhật báo cáo ngày ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dailyReport = await reportModel.findOne({ reportType: 'daily_sales', date: today });
    if (dailyReport) {
      // Cập nhật các giá trị
      dailyReport.totalRevenue += order.finalAmount;
      dailyReport.totalOrders += 1;
      dailyReport.totalDiscountGiven += order.discount || 0;
      dailyReport.averageOrderValue = dailyReport.totalRevenue / dailyReport.totalOrders;
      dailyReport.details.orders.push(order._id);
    } else {
      // Tạo báo cáo mới nếu chưa có
      dailyReport = new reportModel({
        reportType: 'daily_sales',
        date: today,
        timeFrame: 'Day',
        totalRevenue: order.finalAmount,
        totalOrders: 1,
        totalDiscountGiven: order.discount || 0,
        averageOrderValue: order.finalAmount,
        details: { orders: [order._id] }
      });
    }
    await dailyReport.save();

    // --- Emit realtime ---
    const io = req.app?.get('io');
    if (io) {
      io.emit('order_paid', { tableNumber: order.tableNumber });
      io.to(`table_${order.tableNumber}`).emit('order_paid', { tableNumber: order.tableNumber });

      if (tableReset) {
        io.emit('table_updated', tableReset);
        io.to(`table_${tableReset.tableNumber}`).emit('table_updated', tableReset);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Thanh toán thành công',
      data: { table: tableReset, revenue, history, dailyReport }
    });

  } catch (err) {
    console.error('payOrder error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


exports.getPaidOrders = async (req, res) => {
  try {
    const paidOrders = await orderModel
      .find({ orderStatus: 'paid' })
      .sort({ paidAt: -1 })
      .lean()
      .exec();

    res.status(200).json({
      success: true,
      data: paidOrders
    });
  } catch (error) {
    console.error('getPaidOrders error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách đơn đã thanh toán',
      error: error.message
    });
  }
};

/**
 * Thống kê doanh thu theo ngày
 * GET /orders/byDate?fromDate=2025-11-01&toDate=2025-11-24
 */
exports.getRevenueByDate = async (req, res) => {
  try {
    let { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: 'Cần truyền fromDate và toDate (format YYYY-MM-DD)'
      });
    }

    fromDate = new Date(fromDate + 'T00:00:00Z');
    toDate = new Date(toDate + 'T23:59:59Z');

    const paidOrders = await orderModel
      .find({
        orderStatus: 'paid',
        paidAt: { $gte: fromDate, $lte: toDate }
      })
      .lean()
      .exec();

    const revenueMap = {};

    paidOrders.forEach(order => {
      const day = order.paidAt.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!revenueMap[day]) {
        revenueMap[day] = { totalAmount: 0, totalOrders: 0 };
      }
      revenueMap[day].totalAmount += order.finalAmount || 0;
      revenueMap[day].totalOrders += 1;
    });

    const revenueItems = Object.keys(revenueMap).map(day => ({
      id: uuidv4(),  // tạo id tự sinh
      date: day,
      totalAmount: revenueMap[day].totalAmount,
      totalOrders: revenueMap[day].totalOrders
    }));

    res.status(200).json({
      success: true,
      data: revenueItems
    });
  } catch (error) {
    console.error('getRevenueByDate error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi thống kê doanh thu theo ngày',
      error: error.message
    });
  }
};

/**
 * GET /orders/revenue
 * Trả về mảng RevenueItem { id, date, totalAmount, totalOrders } 
 * từ tất cả các ngày đã thanh toán
 */
const { v4: uuidv4 } = require('uuid'); // cài package uuid: npm install uuid

exports.getRevenueFromOrders = async (req, res) => {
  try {
    const paidOrders = await orderModel.find({ orderStatus: 'paid' }).lean().exec();

    const revenueMap = {};

    // Gom nhóm theo ngày
    paidOrders.forEach(order => {
      const day = order.paidAt.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!revenueMap[day]) {
        revenueMap[day] = { totalAmount: 0, totalOrders: 0 };
      }
      revenueMap[day].totalAmount += order.finalAmount || 0;
      revenueMap[day].totalOrders += 1;
    });

    // Chuyển sang mảng RevenueItem với id tự sinh
    const revenueItems = Object.keys(revenueMap).map(day => ({
      id: uuidv4(),  // tự sinh id
      date: day,
      totalAmount: revenueMap[day].totalAmount,
      totalOrders: revenueMap[day].totalOrders
    }));

    res.status(200).json({
      success: true,
      data: revenueItems
    });
  } catch (error) {
    console.error('getRevenueFromOrders error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy tổng doanh thu',
      error: error.message
    });
  }
};

/**
 * POST /orders/:id/request-temp-calculation
 * Chuyển order sang trạng thái "hóa đơn tạm tính" và gửi thông báo cho thu ngân
 */
exports.requestTempCalculation = async (req, res) => {
  try {
    const { requestedBy } = req.body; // ID nhân viên yêu cầu tạm tính
    const orderId = req.params.id;

    // Tìm và cập nhật order
    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy order' });
    }

    // Kiểm tra trạng thái order
    if (order.orderStatus === 'paid') {
      return res.status(400).json({ 
        success: false, 
        message: 'Order đã thanh toán, không thể yêu cầu tạm tính' 
      });
    }

    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({ 
        success: false, 
        message: 'Order đã bị hủy, không thể yêu cầu tạm tính' 
      });
    }

    // Cập nhật trạng thái sang temp_calculation
    order.orderStatus = 'temp_calculation';
    order.tempCalculationRequestedBy = requestedBy || null;
    order.tempCalculationRequestedAt = new Date(); // Đã đúng thời gian thực
    await order.save();

    // Populate để lấy đầy đủ thông tin
    let query = orderModel.findById(order._id);
    query = populateOrderQuery(query);
    query = query.populate('tempCalculationRequestedBy', 'name username');
    const populated = await query.lean().exec();

    // Emit Socket.IO event cho thu ngân
    emitOrderEvent(req, 'temp_calculation_requested', {
      orderId: order._id,
      tableNumber: order.tableNumber,
      order: populated,
      requestedBy: requestedBy,
      requestedAt: order.tempCalculationRequestedAt
    });

    return res.status(200).json({
      success: true,
      message: 'Đã chuyển sang trạng thái hóa đơn tạm tính và gửi thông báo cho thu ngân',
      data: populated
    });
  } catch (error) {
    console.error('requestTempCalculation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi yêu cầu tạm tính',
      error: error.message
    });
  }
};