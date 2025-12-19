/**
 * PATCH /orders/:orderId/request-check-items
 * Thu ngân gửi yêu cầu kiểm tra bàn
 */
exports.requestCheckItems = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { userId } = req.body;
    const order = await orderModel.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order không tồn tại' });

    order.checkItemsStatus = 'pending';
    order.checkItemsRequestedBy = userId;
    order.checkItemsRequestedAt = new Date();
    // reset các trường completed/acknowledged
    order.checkItemsCompletedBy = null;
    order.checkItemsCompletedAt = null;
    order.checkItemsNote = '';

    await order.save();
    emitOrderEvent(req, 'order_check_items_requested', {
      orderId: order._id,
      tableNumber: order.tableNumber,
      checkItemsStatus: order.checkItemsStatus,
      checkItemsRequestedBy: order.checkItemsRequestedBy,
      checkItemsRequestedAt: order.checkItemsRequestedAt
    });
    return res.status(200).json({ success: true, message: 'Đã gửi yêu cầu kiểm tra bàn', data: order });
  } catch (error) {
    console.error('requestCheckItems error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi gửi yêu cầu kiểm tra bàn', error: error.message });
  }
};

/**
 * PATCH /orders/:orderId/complete-check-items
 * Phục vụ xác nhận đã kiểm tra bàn
 */
exports.completeCheckItems = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { userId, checkItemsNote } = req.body;
    const order = await orderModel.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order không tồn tại' });

    order.checkItemsStatus = 'completed';
    order.checkItemsCompletedBy = userId;
    order.checkItemsCompletedAt = new Date();
    order.checkItemsNote = checkItemsNote || '';
    // giữ nguyên checkItemsRequestedBy/At

    await order.save();
    emitOrderEvent(req, 'order_check_items_completed', {
      orderId: order._id,
      tableNumber: order.tableNumber,
      checkItemsStatus: order.checkItemsStatus,
      checkItemsCompletedBy: order.checkItemsCompletedBy,
      checkItemsCompletedAt: order.checkItemsCompletedAt,
      checkItemsNote: order.checkItemsNote
    });
    return res.status(200).json({ success: true, message: 'Đã xác nhận kiểm tra bàn', data: order });
  } catch (error) {
    console.error('completeCheckItems error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi xác nhận kiểm tra bàn', error: error.message });
  }
};

/**
 * PATCH /orders/:orderId/acknowledge-check-items
 * Thu ngân xác nhận đã nhận kết quả kiểm tra
 */
exports.acknowledgeCheckItems = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await orderModel.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order không tồn tại' });

    order.checkItemsStatus = 'acknowledged';
    // giữ lại checkItemsRequestedBy/At để lưu vết

    await order.save();
    emitOrderEvent(req, 'order_check_items_acknowledged', {
      orderId: order._id,
      tableNumber: order.tableNumber,
      checkItemsStatus: order.checkItemsStatus
    });
    return res.status(200).json({ success: true, message: 'Đã xác nhận đã nhận kết quả kiểm tra', data: order });
  } catch (error) {
    console.error('acknowledgeCheckItems error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi xác nhận đã nhận kết quả kiểm tra', error: error.message });
  }
};
/**
 * PATCH /orders/:orderId/check-items
 * Phục vụ xác nhận kiểm tra bàn: cập nhật trạng thái kiểm tra, thời gian và ghi chú ở cấp order
 */
exports.checkOrderItems = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { checkItemsNote } = req.body;
    const order = await orderModel.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order không tồn tại' });

    order.checkItemsStatus = 'completed';
    order.checkItemsCompletedAt = new Date();
    order.checkItemsNote = checkItemsNote || '';

    await order.save();

    // Phát socket event cho thu ngân
    emitOrderEvent(req, 'order_items_checked', {
      orderId: order._id,
      tableNumber: order.tableNumber,
      checkItemsStatus: order.checkItemsStatus,
      checkItemsCompletedAt: order.checkItemsCompletedAt,
      checkItemsNote: order.checkItemsNote
    });

    return res.status(200).json({
      success: true,
      message: 'Đã xác nhận kiểm tra bàn',
      data: {
        orderId: order._id,
        checkItemsStatus: order.checkItemsStatus,
        checkItemsCompletedAt: order.checkItemsCompletedAt,
        checkItemsNote: order.checkItemsNote
      }
    });
  } catch (error) {
    console.error('checkOrderItems error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi xác nhận kiểm tra bàn', error: error.message });
  }
};
// controllers/order.controller.js
const { orderModel } = require('../model/order.model');
const { menuModel } = require('../model/menu.model'); 
const { tableModel } = require('../model/table.model');
const { Revenue } = require('../model/revenue.model');
const { History } = require('../model/history.model');
const { reportModel } = require('../model/report.model');
const { v4: uuidv4 } = require('uuid');

/**
 * Helper:  enrich incoming items array by looking up menuModel when menuItem id provided. 
 */
async function enrichItemsWithMenuData(rawItems = []) {
  const out = [];

  for (const it of rawItems) {
    try {
      if (! it) continue;

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
      if (typeof it.price === 'number' && ! isNaN(it.price)) {
        price = it.price;
      } else if (menuDoc && typeof menuDoc.price === 'number') {
        price = menuDoc. price;
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
      if (! imageUrl && it.image && String(it.image).trim()) imageUrl = String(it.image).trim();
      if (!imageUrl && menuDoc) {
        imageUrl = menuDoc. image || menuDoc.imageUrl || menuDoc.thumbnail || '';
      }

      const status = it.status ?  String(it.status) : 'pending';
      const note = it.note ?  String(it.note) : '';

      out.push({
        menuItem: menuId || null,
        menuItemName:  menuItemName || '',
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
 * Convenience helper to populate server/cashier and items. menuItem with image fields
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
 * Helper to emit socket events
 */
function emitOrderEvent(req, eventName, payload) {
  const io = req?. app?.get('io');
  if (! io) return;

  io.emit(eventName, payload);

  if (payload?.tableNumber !== undefined) {
    io.to(`table_${payload.tableNumber}`).emit(eventName, payload);
  }
}

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
 * Reset trạng thái bàn sau khi thanh toán
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

// ========================================
// CRUD ENDPOINTS
// ========================================

/**
 * GET /orders? tableNumber=... &orderStatus=...
 */
exports.getAllOrders = async (req, res) => {
  try {
    const filter = {};
    if (req.query && typeof req.query.tableNumber !== 'undefined' && req.query.tableNumber !== '') {
      const tn = Number(req.query.tableNumber);
      if (! isNaN(tn)) filter.tableNumber = tn;
      else filter.tableNumber = req.query.tableNumber;
    }
    
    if (req.query && req.query.orderStatus) {
      filter.orderStatus = req. query.orderStatus;
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
      error:  error.message
    });
  }
};

/**
 * GET /orders/: id
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
      error:  error.message
    });
  }
};

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
    const total = (typeof totalAmount === 'number' && ! isNaN(totalAmount)) ? totalAmount : computedTotal;
    const final = (typeof finalAmount === 'number' && !isNaN(finalAmount)) ? finalAmount : total;

    const newOrder = new orderModel({
      tableNumber,
      server,
      cashier,
      items:  enrichedItems,
      totalAmount: total,
      discount:  discount || 0,
      finalAmount: final,
      paymentMethod,
      orderStatus:  orderStatus || 'pending'
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('createOrder:  enrichedItems preview:', enrichedItems.slice(0, 10));
    }

    const saved = await newOrder.save();

    let query = orderModel.findById(saved._id);
    query = populateOrderQuery(query);
    const populated = await query.lean().exec();

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
      message:  'Lỗi khi tạo order',
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
    } = req. body;

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
exports. deleteOrder = async (req, res) => {
  try {
    const deleted = await orderModel. softDelete(req.params.id).exec();
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy order' });
    }
    return res.status(200).json({ success: true, message:  'Xóa order thành công', data: deleted });
  } catch (error) {
    console.error('deleteOrder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa order',
      error: error.message
    });
  }
};

// ========================================
// PAYMENT ENDPOINTS
// ========================================

/**
 * POST /orders/pay
 * Thanh toán và reset TẤT CẢ bàn trong tableNumbers
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
      return res. status(400).json({ success: false, message: 'Thanh toán thất bại:  số tiền không hợp lệ' });
    }

    // Lấy danh sách TẤT CẢ bàn chia sẻ order này
    const tableNumbersToReset = order.tableNumbers || [order.tableNumber];
    console.log(`[PAY] Order ${order._id} is shared by tables: ${tableNumbersToReset.join(', ')}`);

    // Lưu vào Revenue
    const revenue = new Revenue({
      orderId: order._id,
      tableNumber: order.tableNumber,
      amount: order.finalAmount,
      paymentMethod: paymentMethod || 'Tiền mặt',
      paidAt: new Date()
    });
    await revenue.save();

    // Tạo History
    const history = new History({
      orderId: order._id,
      tableNumber: order. tableNumber,
      action: 'pay',
      performedBy: cashier || 'unknown',
      details: {
        items: order.items,
        totalAmount: order.totalAmount,
        finalAmount: order.finalAmount,
        paymentMethod: paymentMethod || 'Tiền mặt',
        paidAt: revenue.paidAt,
        sharedTables: tableNumbersToReset
      }
    });
    await history.save();

    // Xóa order
    await orderModel.findByIdAndDelete(orderId);

    // Reset TẤT CẢ bàn trong tableNumbers
    const resetTables = [];
    for (const tableNum of tableNumbersToReset) {
      const updated = await tableModel.findOneAndUpdate(
        { tableNumber:  tableNum },
        {
          status: 'available',
          currentOrder: null,
          updatedAt: Date.now()
        },
        { new: true }
      );
      if (updated) {
        resetTables.push(updated);
        console.log(`[PAY] Reset table ${tableNum} to available`);
      }
    }

    // Cập nhật báo cáo ngày
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dailyReport = await reportModel.findOne({ reportType: 'daily_sales', date: today });
    if (dailyReport) {
      dailyReport.totalRevenue += order.finalAmount;
      dailyReport.totalOrders += 1;
      dailyReport.totalDiscountGiven += order.discount || 0;
      dailyReport.averageOrderValue = dailyReport.totalRevenue / dailyReport.totalOrders;
      dailyReport.details.orders.push(order._id);
    } else {
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

    // Emit realtime cho TẤT CẢ bàn
    const io = req. app?. get('io');
    if (io) {
      io.emit('order_paid', { 
        orderId:  order._id,
        tableNumbers: tableNumbersToReset
      });

      for (const table of resetTables) {
        io.to(`table_${table.tableNumber}`).emit('order_paid', { tableNumber: table.tableNumber });
        io.emit('table_updated', table);
        io.to(`table_${table.tableNumber}`).emit('table_updated', table);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Thanh toán thành công. Đã reset ${resetTables.length} bàn:  ${tableNumbersToReset. join(', ')}`,
      data: { 
        resetTables, 
        revenue, 
        history, 
        dailyReport 
      }
    });

  } catch (err) {
    console.error('payOrder error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /orders/historyod - Danh sách đơn đã thanh toán
 */
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

// ========================================
// REVENUE ENDPOINTS
// ========================================

/**
 * GET /orders/byDate? fromDate=...&toDate=... 
 */
exports.getRevenueByDate = async (req, res) => {
  try {
    let { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res. status(400).json({
        success: false,
        message: 'Cần truyền fromDate và toDate (format YYYY-MM-DD)'
      });
    }

    fromDate = new Date(fromDate + 'T00:00:00Z');
    toDate = new Date(toDate + 'T23:59:59Z');

    const paidOrders = await orderModel
      .find({
        orderStatus: 'paid',
        paidAt: { $gte: fromDate, $lte:  toDate }
      })
      .lean()
      .exec();

    const revenueMap = {};

    paidOrders.forEach(order => {
      const day = order.paidAt.toISOString().slice(0, 10);
      if (!revenueMap[day]) {
        revenueMap[day] = { totalAmount: 0, totalOrders: 0 };
      }
      revenueMap[day].totalAmount += order.finalAmount || 0;
      revenueMap[day].totalOrders += 1;
    });

    const revenueItems = Object.keys(revenueMap).map(day => ({
      id: uuidv4(),
      date: day,
      totalAmount:  revenueMap[day].totalAmount,
      totalOrders:  revenueMap[day].totalOrders
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
 */
exports.getRevenueFromOrders = async (req, res) => {
  try {
    const paidOrders = await orderModel. find({ orderStatus: 'paid' }).lean().exec();

    const revenueMap = {};

    paidOrders.forEach(order => {
      const day = order.paidAt.toISOString().slice(0, 10);
      if (!revenueMap[day]) {
        revenueMap[day] = { totalAmount: 0, totalOrders: 0 };
      }
      revenueMap[day].totalAmount += order.finalAmount || 0;
      revenueMap[day]. totalOrders += 1;
    });

    const revenueItems = Object.keys(revenueMap).map(day => ({
      id: uuidv4(),
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

// ========================================
// SPECIAL FEATURES
// ========================================

/**
 * POST /orders/: id/request-temp-calculation
 */
exports.requestTempCalculation = async (req, res) => {
  try {
    const { requestedBy } = req.body;
    const orderId = req.params.id;

    const order = await orderModel.findById(orderId);
    if (!order) {
      return res. status(404).json({ success: false, message: 'Không tìm thấy order' });
    }

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

    order.orderStatus = 'temp_calculation';
    order.tempCalculationRequestedBy = requestedBy || null;
    order.tempCalculationRequestedAt = new Date();
    await order.save();

    let query = orderModel.findById(order._id);
    query = populateOrderQuery(query);
    query = query.populate('tempCalculationRequestedBy', 'name username');
    const populated = await query.lean().exec();

    emitOrderEvent(req, 'temp_calculation_requested', {
      orderId: order._id,
      tableNumber: order.tableNumber,
      order: {
        ...populated,
        orderId: order._id
      },
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

/**
 * POST /orders/move-to-table ✨ MỚI
 * Di chuyển TẤT CẢ orders từ bàn nguồn sang bàn đích
 * Body: { fromTableNumber, toTableNumber, movedBy }
 */
exports.moveOrdersToTable = async (req, res) => {
  try {
    const { fromTableNumber, toTableNumber, movedBy } = req.body;

    // Validate
    if (!fromTableNumber || ! toTableNumber) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu fromTableNumber hoặc toTableNumber'
      });
    }

    if (fromTableNumber === toTableNumber) {
      return res.status(400).json({
        success: false,
        message: 'Bàn nguồn và bàn đích không được trùng nhau'
      });
    }

    // Tìm tất cả orders của bàn nguồn (chưa thanh toán)
    const ordersToMove = await orderModel. find({
      tableNumber: fromTableNumber,
      orderStatus:  { $ne: 'paid' }
    });

    if (! ordersToMove || ordersToMove.length === 0) {
      return res. status(404).json({
        success: false,
        message:  `Không tìm thấy hóa đơn nào ở bàn ${fromTableNumber}`
      });
    }

    const movedOrderIds = [];
    
    // Cập nhật tableNumber và tableNumbers cho từng order
    for (const order of ordersToMove) {
      // Cập nhật tableNumber chính
      order.tableNumber = toTableNumber;
      
      // Thêm cả 2 bàn vào tableNumbers (để track khi thanh toán)
      if (! order.tableNumbers) {
        order.tableNumbers = [fromTableNumber];
      }
      
      if (! order.tableNumbers.includes(toTableNumber)) {
        order.tableNumbers.push(toTableNumber);
      }
      
      if (!order.tableNumbers.includes(fromTableNumber)) {
        order.tableNumbers.push(fromTableNumber);
      }
      
      await order.save();
      movedOrderIds.push(order._id);
    }

    // Cập nhật trạng thái cả 2 bàn -> occupied
    await tableModel.findOneAndUpdate(
      { tableNumber: fromTableNumber },
      { 
        status: 'occupied', 
        currentOrder: movedOrderIds[0],
        updatedAt: Date.now() 
      },
      { new: true }
    );

    const targetTable = await tableModel.findOneAndUpdate(
      { tableNumber:  toTableNumber },
      { 
        status: 'occupied', 
        currentOrder: movedOrderIds[0],
        updatedAt: Date.now() 
      },
      { new: true }
    );

    // Emit socket events
    const io = req.app?.get('io');
    if (io) {
      io.emit('orders_moved', {
        fromTableNumber,
        toTableNumber,
        orderIds: movedOrderIds,
        movedBy
      });
      
      io.emit('table_updated', { tableNumber: fromTableNumber, status: 'occupied' });
      io.emit('table_updated', { tableNumber: toTableNumber, status: 'occupied' });
    }

    res.json({
      success: true,
      message: `Đã chuyển ${ordersToMove.length} hóa đơn.  Bàn ${fromTableNumber} và ${toTableNumber} cùng chia sẻ hóa đơn. `,
      data: {
        movedOrders: ordersToMove. length,
        orderIds: movedOrderIds,
        sharedTables: [fromTableNumber, toTableNumber],
        targetTable
      }
    });

  } catch (error) {
    console.error('moveOrdersToTable error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi di chuyển hóa đơn:  ' + error.message
    });
  }
};

/**
 * POST /orders/split-table (CŨ - GIỮ LẠI cho tương thích)
 * Body: { orderId, toTableNumber }
 */
exports.splitTable = async (req, res) => {
  try {
    const { orderId, toTableNumber } = req.body;
    if (!orderId || !toTableNumber) {
      return res.status(400).json({ success: false, message: 'Thiếu orderId hoặc toTableNumber' });
    }

    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message:  'Không tìm thấy order' });
    }

    if (order.tableNumber === toTableNumber) {
      return res.status(400).json({ success: false, message: 'Bàn đích không được trùng bàn hiện tại' });
    }

    order.tableNumber = toTableNumber;
    if (!order.tableNumbers) order.tableNumbers = [order.tableNumber];
    if (!order.tableNumbers.includes(toTableNumber)) order.tableNumbers.push(toTableNumber);

    await order.save();

    await tableModel.findOneAndUpdate(
      { tableNumber: toTableNumber },
      { status: 'occupied', currentOrder: order._id, updatedAt: Date.now() },
      { new: true }
    );

    const io = req.app?.get('io');
    if (io) {
      for (const tNum of order.tableNumbers) {
        io.emit('table_updated', { tableNumber: tNum, status: 'occupied' });
        io.to(`table_${tNum}`).emit('order_updated', { orderId:  order._id, tableNumber: tNum });
      }
    }

    return res.json({
      success: true,
      message: `Đã tách bàn thành công. Order hiện chia sẻ cho các bàn:  ${order.tableNumbers.join(', ')}`,
      data: order
    });
  } catch (error) {
    console.error('splitTable error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi tách bàn:  ' + error.message });
  }
};