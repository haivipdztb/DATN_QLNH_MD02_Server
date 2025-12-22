/**
 * PATCH /orders/:id/print-temp-bill
 * Thu ngân in hóa đơn tạm tính: cập nhật trạng thái và số lần in
 */
const sockets = require('../sockets');
/**
 * ✅ PATCH /orders/:id/print-temp-bill
 */
exports.printTempBill = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await orderModel. findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy order'
      });
    }

    order.orderStatus = 'temp_bill_printed';
    await order.save();

    // ✅✅✅ THÊM: Emit temp_bill_printed
    try {
      sockets.emitTempBillPrinted({
        orderId: order._id,
        tableNumber: order.tableNumber,
        printedAt: new Date()
      });
      console.log(`✅ Emitted temp_bill_printed for table ${order.tableNumber}`);
    } catch (emitError) {
      console.warn('⚠️ Failed to emit temp_bill_printed:', emitError);
    }

    return res.status(200).json({
      success: true,
      message: 'Đã in hóa đơn tạm tính',
      data: order
    });
  } catch (error) {
    console.error('printTempBill error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi in hóa đơn tạm tính',
      error: error.message
    });
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
          console.warn('enrichItemsWithMenuData:  menu lookup failed for id=', menuId, e && e.message);
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
      const note = it.note ? String(it.note) : '';

      out.push({
        menuItem: menuId || null,
        menuItemName:  menuItemName || '',
        imageUrl:  imageUrl || '',
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
    .populate('checkItemsRequestedBy', 'name username')
    .populate('checkItemsCompletedBy', 'name username')
    .populate({
      path: 'items.menuItem',
      select: 'name price image imageUrl thumbnail'
    });
}

/**
 * GET /orders? tableNumber=... 
 */
exports.getAllOrders = async (req, res) => {
  try {
    const filter = {};
    if (req.query && typeof req.query.tableNumber !== 'undefined' && req.query.tableNumber !== '') {
      const tn = Number(req.query.tableNumber);
      if (!isNaN(tn)) filter.tableNumber = tn;
      else filter.tableNumber = req.query.tableNumber;
    }

    // Chỉ filter orderStatus khi client truyền lên
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
exports. getOrderById = async (req, res) => {
  try {
    let query = orderModel.findById(req.params.id);
    query = populateOrderQuery(query);
    query = query.populate('mergedFrom').populate('splitTo');
    const order = await query.lean().exec();

    if (!order) {
      return res.status(404).json({ success: false, message:  'Không tìm thấy order' });
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
/**
 * ✅ POST /orders - Tạo order mới
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
      items: enrichedItems,
      totalAmount: total,
      discount:  discount || 0,
      finalAmount:  final,
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

    // ✅✅✅ THÊM:  Emit order_created event
    try {
      console.log('[SOCKET] Emitting orderCreated:', {
        tableNumber: saved.tableNumber,
        orderId: saved._id
      });
      sockets.emitOrderCreated({
        _id: saved._id,
        tableNumber:  saved.tableNumber,
        items: enrichedItems,
        totalAmount: total,
        finalAmount: final,
        orderStatus: saved.orderStatus,
        createdAt: saved.createdAt
      });
      console.log(`✅ Emitted order_created for table ${saved.tableNumber}`);
    } catch (emitError) {
      console.warn('⚠️ Failed to emit order_created:', emitError);
    }

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
 * ✅ PUT/PATCH /orders/:id hoặc /orders/:orderId
 * ✅ ĐÃ SỬA:  Hỗ trợ TẤT CẢ các field check items
 */
/**
 * ✅ PUT/PATCH /orders/:id hoặc /orders/:orderId
 * ✅ ĐÃ SỬA:  Hỗ trợ TẤT CẢ các field check items
 */
exports.updateOrder = async (req, res) => {
  try {
    const orderId = req.params.id || req.params.orderId;
    
    console.log('========================================');
    console.log('updateOrder called');
    console.log('orderId:', orderId);
    console.log('body:', req.body);
    console.log('========================================');
    
    const {
      tableNumber, items, totalAmount, discount,
      finalAmount, paidAmount, change,
      paymentMethod, orderStatus, paidAt,
      // ✅ Check items fields
      checkItemsRequestedAt, 
      checkItemsRequestedBy,
      checkItemsStatus,
      checkItemsCompletedBy,
      checkItemsCompletedAt,
      checkItemsNote,
      checkItemsAcknowledgedAt,
      checkItemsAcknowledgedBy,
      // Temp calculation fields
      tempCalculationRequestedAt,
      tempCalculationRequestedBy
    } = req.body;

    console.log('UPDATE ORDER DEBUG:', {
      orderId: req.params.id,
      totalAmount,
      discount,
      finalAmount: finalAmount || 'not provided'
    });

    let enrichedItems = undefined;
    if (Array.isArray(items)) {
      enrichedItems = await enrichItemsWithMenuData(items);
    }

    const updateData = {
      tableNumber,
      items: (typeof enrichedItems !== 'undefined') ? enrichedItems : items,
      totalAmount,
      discount,
      paidAmount,
      change,
      paymentMethod,
      orderStatus
    };

    // ✅ Tự tính finalAmount
    if (totalAmount !== undefined) {
      updateData.finalAmount = totalAmount - (discount || 0);
    } else if (discount !== undefined) {
      // Nếu chỉ gửi discount, lấy totalAmount hiện tại để tính finalAmount
      const currentOrder = await orderModel.findById(req.params.id);
      if (currentOrder) {
        updateData.finalAmount = currentOrder.totalAmount - (discount || 0);
      }
    } else if (finalAmount !== undefined) {
      updateData.finalAmount = finalAmount;
    }

    if (orderStatus === 'paid' && paidAt) {
      updateData.paidAt = paidAt;
    }
    const updates = {};

    // Basic fields
    if (tableNumber !== undefined) updates.tableNumber = tableNumber;
    if (items !== undefined) updates.items = items;
    if (totalAmount !== undefined) updates.totalAmount = totalAmount;
    if (discount !== undefined) updates.discount = discount;
    if (finalAmount !== undefined) updates.finalAmount = finalAmount;
    if (paidAmount !== undefined) updates.paidAmount = paidAmount;
    if (change !== undefined) updates.change = change;
    if (paymentMethod !== undefined) updates.paymentMethod = paymentMethod;
    if (orderStatus !== undefined) updates.orderStatus = orderStatus;
    if (paidAt !== undefined) updates.paidAt = paidAt;

    // ✅ Check items fields
    if (checkItemsRequestedAt !== undefined) updates.checkItemsRequestedAt = checkItemsRequestedAt;
    if (checkItemsRequestedBy !== undefined) updates.checkItemsRequestedBy = checkItemsRequestedBy;
    if (checkItemsStatus !== undefined) updates.checkItemsStatus = checkItemsStatus;
    if (checkItemsCompletedBy !== undefined) updates.checkItemsCompletedBy = checkItemsCompletedBy;
    if (checkItemsCompletedAt !== undefined) updates.checkItemsCompletedAt = checkItemsCompletedAt;
    if (checkItemsNote !== undefined) updates.checkItemsNote = checkItemsNote;
    if (checkItemsAcknowledgedAt !== undefined) updates.checkItemsAcknowledgedAt = checkItemsAcknowledgedAt;
    if (checkItemsAcknowledgedBy !== undefined) updates.checkItemsAcknowledgedBy = checkItemsAcknowledgedBy;

    // Temp calculation fields
    if (tempCalculationRequestedAt !== undefined) updates.tempCalculationRequestedAt = tempCalculationRequestedAt;
    if (tempCalculationRequestedBy !== undefined) updates.tempCalculationRequestedBy = tempCalculationRequestedBy;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không có field nào để cập nhật'
      });
    }

    console.log('Updates to apply:', updates);

    const updated = await orderModel.findByIdAndUpdate(
      orderId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res. status(404).json({
        success: false,
        message:  'Không tìm thấy order'
      });
    }

    let query = orderModel.findById(updated._id);
    query = populateOrderQuery(query);
    const populated = await query.lean().exec();

    // ✅✅✅ THÊM: Emit order_updated event
    try {
      console.log('[SOCKET] Emitting orderUpdated:', {
        orderId: updated._id,
        tableNumber: updated.tableNumber
      });
      sockets.emitOrderUpdated({
        _id: updated._id,
        tableNumber: updated.tableNumber,
        orderStatus: updated.orderStatus,
        ... updates
      });
      console.log(`✅ Emitted order_updated for order ${updated._id}`);
    } catch (emitError) {
      console.warn('⚠️ Failed to emit order_updated:', emitError);
    }

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
    const deleted = await orderModel.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy order'
      });
    }

    // ✅✅✅ THÊM: Emit order_deleted
    try {
      sockets. emitOrderDeleted({
        _id: deleted._id,
        tableNumber: deleted.tableNumber
      });
      console.log(`✅ Emitted order_deleted for order ${deleted._id}`);
    } catch (emitError) {
      console.warn('⚠️ Failed to emit order_deleted:', emitError);
    }

    return res.status(200).json({
      success: true,
      message: 'Xóa order thành công',
      data:  deleted
    });
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
};


/**
 * POST /orders/pay
 */

exports.payOrder = async (req) => {
  console.log('--- payOrder called ---', req.body);

  try {
    const { orderId, paidAmount, paymentMethod, cashier, voucherId } = req.body;
    if (!orderId) return { success: false, message: 'Order id is required' };

    const order = await orderModel.findById(orderId);
    if (!order) return { success: false, message: 'Order not found' };

    // Nếu có voucherId, áp dụng voucher
    if (voucherId) {
      const { validateVoucherHelper, applyVoucherHelper } = require('./voucher.controller');
      const voucherRes = await validateVoucherHelper(voucherId, order.totalAmount);
      if (voucherRes.success) {
        order.discount = voucherRes.data.discountAmount;
        order.finalAmount = voucherRes.data.finalAmount;
        await order.save();
        await applyVoucherHelper(voucherId);
      } else {
        return { success: false, message: 'Voucher không hợp lệ: ' + voucherRes.message };
      }
    }

    console.log('PAY ORDER DEBUG:', {
      orderId,
      totalAmount: order.totalAmount,
      discount: order.discount,
      finalAmount: order.finalAmount,
      paidAmount
    });

    const paid = Number(paidAmount) || 0;
    
    // Nếu thanh toán thẻ với paidAmount = 0, cho phép (đang chờ VNPay callback)
    if (paymentMethod === 'Thẻ' && paid === 0) {
      return { success: true, message: 'Đang xử lý thanh toán thẻ' };
    }
    
    // Nếu có voucher, yêu cầu thanh toán hết
    if (voucherId && paid < order.finalAmount) {
      return { success: false, message: 'Khi sử dụng voucher, phải thanh toán toàn bộ số tiền' };
    }
    
    if (isNaN(paid) || paid < order.finalAmount) {
      return { success: false, message: 'Thanh toán thất bại: số tiền không hợp lệ' };
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
      tableNumber: order.tableNumber,
      action: 'pay',
      performedBy: cashier || 'unknown',
      details: {
        items: order.items,
        totalAmount: order.totalAmount,
        finalAmount: order.finalAmount,
        orderStatus: 'paid',
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
        { tableNumber: tableNum },
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
    await dailyReport. save();

    // Emit realtime cho TẤT CẢ bàn - CHUẨN HÓA QUA sockets.js
    console.log('[SOCKET] Emitting orderPaid:', {
      orderId: order._id,
      tableNumber: order.tableNumber
    });
    sockets.emitOrderPaid({ 
      orderId:  order._id,
      tableNumbers: tableNumbersToReset
    });
    for (const table of resetTables) {
      console.log('[SOCKET] Emitting tableUpdated:', {
        tableNumber: table.tableNumber,
        status: table.status
      });
      sockets.emitTableUpdated(table);
    }

    return {
      success: true,
      message: `Thanh toán thành công.  Đã reset ${resetTables.length} bàn:  ${tableNumbersToReset. join(', ')}`,
      data: { 
        resetTables, 
        revenue, 
        history, 
        dailyReport 
      }
    };
      data: { table: tableReset, revenue, history, dailyReport }
    

  } catch (err) {
    console.error('payOrder error:', err);
    return { success: false, message: err.message };
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
 * GET /orders/byDate? fromDate=... &toDate=...
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
        paidAt: { $gte:  fromDate, $lte: toDate }
      })
      .lean()
      .exec();

    const revenueMap = {};

    paidOrders.forEach(order => {
      const day = order.paidAt.toISOString().slice(0, 10);
      if (!revenueMap[day]) {
        revenueMap[day] = { totalAmount: 0, totalOrders:  0 };
      }
      revenueMap[day]. totalAmount += order.finalAmount || 0;
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
/**
 * ✅ POST /orders/:id/request-temp-calculation
 */
exports.requestTempCalculation = async (req, res) => {
  try {
    const { id } = req.params;
    const { requestedBy } = req.body;

    const order = await orderModel.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy order'
      });
    }

    order.tempCalculationRequestedAt = new Date();
    order.tempCalculationRequestedBy = requestedBy || null;
    await order.save();

    // ✅✅✅ THÊM: Emit temp_calculation_request
    try {
      sockets.emitTempCalculationRequest({
        orderId: order._id,
        tableNumber: order.tableNumber,
        requestedAt: order.tempCalculationRequestedAt,
        requestedBy:  requestedBy
      });
      console.log(`✅ Emitted temp_calculation_request for table ${order.tableNumber}`);
    } catch (emitError) {
      console.warn('⚠️ Failed to emit temp_calculation_request:', emitError);
    }

    return res.status(200).json({
      success: true,
      message: 'Đã gửi yêu cầu tạm tính',
      data: order
    });
  } catch (error) {
    console.error('requestTempCalculation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo yêu cầu tạm tính',
      error:  error.message
    });
  }
};
/**
 * GET /orders/check-items-requests/count
 * Đếm số lượng yêu cầu kiểm tra bàn (orders có checkItemsRequestedAt không null)
 */
exports.getCheckItemsRequestsCount = async (req, res) => {
  try {
    const count = await orderModel.countDocuments({
      checkItemsRequestedAt: { $ne: null }
    });

    return res.status(200).json({
      success: true,
      data: {
        count: count
      }
    });
  } catch (error) {
    console.error('getCheckItemsRequestsCount error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi đếm số lượng yêu cầu kiểm tra bàn',
      error: error.message
    });
  }
};

/**
 * GET /orders/check-items-requests
 * Lấy danh sách các orders có yêu cầu kiểm tra bàn
 */
exports.getCheckItemsRequests = async (req, res) => {
  try {
    let query = orderModel.find({
      checkItemsRequestedAt:  { $ne: null }
    }).sort({ checkItemsRequestedAt: -1 });
    
    query = populateOrderQuery(query);
    const orders = await query.lean().exec();

    return res.status(200).json({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (error) {
    console.error('getCheckItemsRequests error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách yêu cầu kiểm tra bàn',
      error: error. message
    });
  }
};

/**
 * PATCH /orders/:orderId/request-check-items
 * Thu ngân gửi yêu cầu kiểm tra bàn
 */
/**
 * ✅ POST /orders/:orderId/request-check-items
 */
exports.requestCheckItems = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { requestedBy } = req.body;

    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy order'
      });
    }

    order.checkItemsRequestedAt = new Date();
    order.checkItemsRequestedBy = requestedBy || null;
    order.checkItemsStatus = 'pending';
    await order.save();

    // ✅✅✅ THÊM: Emit check_items_request
    try {
      sockets. emitCheckItemsRequest({
        orderId: order._id,
        tableNumber: order.tableNumber,
        requestedAt: order.checkItemsRequestedAt,
        requestedBy:  requestedBy
      });
      console.log(`✅ Emitted check_items_request for table ${order.tableNumber}`);
    } catch (emitError) {
      console.warn('⚠️ Failed to emit check_items_request:', emitError);
    }

    return res.status(200).json({
      success: true,
      message: 'Đã gửi yêu cầu kiểm tra bàn',
      data: order
    });
  } catch (error) {
    console.error('requestCheckItems error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo yêu cầu kiểm tra',
      error: error.message
    });
  }
};
/**
 * PATCH /orders/:orderId/complete-check-items
 * Phục vụ xác nhận đã kiểm tra bàn
 */
/**
 * ✅ PATCH /orders/:orderId/complete-check-items
 */
exports.completeCheckItems = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { completedBy, note } = req.body;

    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy order'
      });
    }

    order.checkItemsStatus = 'completed';
    order.checkItemsCompletedBy = completedBy || null;
    order.checkItemsCompletedAt = new Date();
    order.checkItemsNote = note || '';
    await order.save();

    // ✅✅✅ THÊM: Emit check_items_completed
    try {
      sockets.emitCheckItemsCompleted({
        orderId: order._id,
        tableNumber: order.tableNumber,
        completedBy: completedBy,
        completedAt: order.checkItemsCompletedAt,
        note: note
      });
      console.log(`✅ Emitted check_items_completed for table ${order.tableNumber}`);
    } catch (emitError) {
      console.warn('⚠️ Failed to emit check_items_completed:', emitError);
    }

    return res.status(200).json({
      success: true,
      message: 'Đã hoàn thành kiểm tra bàn',
      data: order
    });
  } catch (error) {
    console.error('completeCheckItems error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi hoàn thành kiểm tra',
      error: error.message
    });
  }
};
/**
 * PATCH /orders/:orderId/acknowledge-check-items
 * Thu ngân xác nhận đã nhận kết quả kiểm tra
 */
exports.acknowledgeCheckItems = async (req, res) => {
  try {
    const { orderId } = req. params;
    const order = await orderModel.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message:  'Order không tồn tại' });

    order.checkItemsStatus = 'acknowledged';
    // giữ lại checkItemsRequestedBy/At để lưu vết

    await order.save();
    sockets.emit('order_check_items_acknowledged', {
      orderId: order._id,
      tableNumber: order.tableNumber,
      checkItemsStatus: order.checkItemsStatus
    });
    return res.status(200).json({ success: true, message: 'Đã xác nhận đã nhận kết quả kiểm tra', data: order });
  } catch (error) {
    console.error('acknowledgeCheckItems error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi xác nhận đã nhận kết quả kiểm tra', error: error. message });
  }
};

/**
 * PATCH /orders/:orderId/check-items
 * Phục vụ xác nhận kiểm tra bàn:  cập nhật trạng thái kiểm tra, thời gian và ghi chú ở cấp order
 */
exports.checkOrderItems = async (req, res) => {
  try {
    const { orderId } = req. params;
    const { checkItemsNote } = req.body;
    const order = await orderModel.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order không tồn tại' });

    order.checkItemsStatus = 'completed';
    order.checkItemsCompletedAt = new Date();
    order.checkItemsNote = checkItemsNote || '';

    await order.save();

    // Phát socket event cho thu ngân (đồng nhất qua sockets.js)
    sockets.emit('order_items_checked', {
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

module.exports = exports;